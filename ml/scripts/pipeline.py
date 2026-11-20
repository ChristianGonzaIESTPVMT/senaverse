"""Offline LSP training commands. Run from the repository root with the ml virtualenv."""

import argparse
import hashlib
import json
import platform
import re
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

import joblib
import numpy as np
import scipy
import sklearn
from threadpoolctl import threadpool_limits

from audit import LABELS, audit, read_document
from reports import render_report
from split import SPLITS, split_recordings
from training import (
    LIMITATIONS, PRACTICAL_TIE_F1, check_parity, fit_candidates, json_bytes, make_bundle, measure, native_latency,
    predict_rows, size,
)


ML = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = ML / "datasets" / "senaverse-dataset-dataset-json.json"
BRIDGE = ML / "scripts" / "web_bridge.mjs"
DEVELOPMENT = ("train", "validation")


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def atomic(path, writer):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, suffix=".tmp", delete=False) as handle:
        temporary = Path(handle.name)
    try:
        result = writer(temporary)
        temporary.replace(path)
        return result
    finally:
        temporary.unlink(missing_ok=True)


def write_json(path, value):
    atomic(path, lambda temporary: temporary.write_bytes(json_bytes(value)))


def read_json(path):
    return json.loads(path.read_bytes())


def node(*arguments, data=None):
    result = subprocess.run(
        ["node", *map(str, arguments)], input=json_bytes(data) if data is not None else None,
        capture_output=True, check=False,
    )
    if result.returncode:
        detail = result.stderr.decode("utf-8", errors="replace").strip()
        raise ValueError(f"Falló la ejecución local de Node ({result.returncode}). {detail}")
    return result.stdout


def bridge(command, data):
    return json.loads(node(BRIDGE, command, data=data))


def audited_dataset(path, policy, private):
    document, source = read_document(path)
    eligible, result = audit(document, policy)
    write_json(private / "audit.json", {
        "sourceSha256": source, "requireOperatorReview": policy, **result,
    })
    return document, source, eligible, result["summary"]


def web_input(sample):
    config = sample["captureMetadata"]["configuration"]
    return {
        "aspect": config["processingWidth"] / config["processingHeight"],
        "frames": [{"timestampMs": frame["timestampMs"], "hands": [
            {"landmarks": hand["landmarks"], "handedness": hand["handedness"]} for hand in frame["hands"]
        ]} for frame in sample["frames"]],
    }


def feature_rows(samples):
    rows, configs, dimensions = {}, {}, {}
    for offset in range(0, len(samples), 48):
        data = [web_input(sample) for sample in samples[offset:offset + 48]]
        for report in bridge("features", data):
            config = report["config"]
            key = str(config["steps"])
            configs[key], dimensions[key] = config, report["dimensions"]
            rows.setdefault(key, []).extend(report["rows"])
    if any(len(items) != len(samples) for items in rows.values()) or set(rows) != {"24", "32"}:
        raise ValueError("El puente web no devolvió ambas secuencias de características.")
    return configs, dimensions, rows


def write_features(path, partitions, matrices, reasons, splits):
    arrays = {}
    for split in splits:
        part = partitions[split]
        arrays[f"{split}_ids"] = np.array([sample["sampleId"] for sample in part], dtype=str)
        arrays[f"{split}_labels"] = np.array([sample["labelId"] for sample in part], dtype=str)
        for key in matrices[split]:
            arrays[f"{split}_{key}_x"] = matrices[split][key]
            arrays[f"{split}_{key}_reasons"] = np.array(reasons[split][key], dtype=str)

    def save(temporary):
        with temporary.open("wb") as output:
            np.savez_compressed(output, **arrays)

    atomic(path, save)


def preprocess(args, work, private):
    document, source, eligible, audit_summary = audited_dataset(args.dataset, args.require_operator_review, private)
    partitions, split_report = split_recordings([document["samples"][row] for row in eligible], args.seed, args.grouping)
    samples = [sample for split in SPLITS for sample in partitions[split]]
    configs, dimensions, rows = feature_rows(samples)
    matrices, reasons = {}, {}
    offset = 0
    for split, part in partitions.items():
        matrices[split], reasons[split] = {}, {}
        for key in configs:
            section = rows[key][offset:offset + len(part)]
            matrices[split][key] = np.array([
                item["features"] if item["features"] is not None else [0] * dimensions[key] for item in section
            ], dtype="float64")
            if matrices[split][key].shape != (len(part), dimensions[key]) or not np.isfinite(matrices[split][key]).all():
                raise ValueError("La transformación temporal produjo una dimensión o coordenada inválida.")
            reasons[split][key] = [item["reason"] or "" for item in section]
        offset += len(part)
    development_path, test_path = work / "development.npz", work / "test.npz"
    write_features(development_path, partitions, matrices, reasons, DEVELOPMENT)
    write_features(test_path, partitions, matrices, reasons, ("test",))
    manifest = {
        "sourceSha256": source, "seed": args.seed, "requireOperatorReview": args.require_operator_review,
        "detector": document["mediaPipeModel"], "audit": audit_summary, "split": split_report, "configurations": configs,
        "dimensions": dimensions,
        "featureStatus": {split: {key: dict(Counter(reasons[split][key])) for key in configs} for split in SPLITS},
        "files": {"development.npz": digest(development_path), "test.npz": digest(test_path)},
    }
    write_json(work / "prepared.json", manifest)
    return split_report


def load_partitions(path, manifest, splits):
    if digest(path) != manifest["files"][path.name]:
        raise ValueError(f"{path.name} no corresponde a prepared.json. Repite el preprocesamiento.")
    result = {}
    with np.load(path, allow_pickle=False) as archive:
        for split in splits:
            rows = [{"sampleId": sample_id, "labelId": label} for sample_id, label in zip(
                archive[f"{split}_ids"].tolist(), archive[f"{split}_labels"].tolist(), strict=True)]
            result[split] = {
                "rows": rows,
                "features": {key: archive[f"{split}_{key}_x"] for key in manifest["configurations"]},
                "rowsBySteps": {key: [{"reason": reason or None} for reason in archive[f"{split}_{key}_reasons"].tolist()]
                                for key in manifest["configurations"]},
            }
    return result


def train(work):
    prepared = work / "prepared.json"
    manifest = read_json(prepared)
    development = load_partitions(work / "development.npz", manifest, DEVELOPMENT)
    finalists, trials, selected = fit_candidates(development, manifest["configurations"], manifest["seed"], manifest["detector"])
    checkpoint = {"preparedSha256": digest(prepared), "finalists": finalists, "trials": trials, "selected": selected}
    atomic(work / "trained.joblib", lambda path: joblib.dump(checkpoint, path, compress=3))
    return selected


def checkpoint_for(work, prepared):
    # Only the checkpoint created by the local train command is supported.
    checkpoint = joblib.load(work / "trained.joblib")
    if checkpoint["preparedSha256"] != digest(prepared):
        raise ValueError("El modelo entrenado no corresponde al preprocesamiento actual. Repite train.")
    return checkpoint


def model_rows(data, key):
    return [{"features": vector.tolist() if row["reason"] is None else None, "reason": row["reason"]}
            for vector, row in zip(data["features"][key], data["rowsBySteps"][key], strict=True)]


def verify_web(candidate, bundle, data, reference, windows=None):
    payload = {"model": bundle, "rows": model_rows(data, str(candidate["steps"]))}
    if windows:
        payload["windows"] = windows
    javascript = bridge("score", payload)
    return {
        "parity": check_parity(reference, javascript["predictions"]),
        "nodeClassifierLatency": javascript["latency"],
        **({"nodeTrailingWindowLatency": javascript["trailingWindowLatency"]} if windows else {}),
    }


def evaluate(work, private):
    prepared = work / "prepared.json"
    manifest = read_json(prepared)
    checkpoint = checkpoint_for(work, prepared)
    development = load_partitions(work / "development.npz", manifest, DEVELOPMENT)
    candidates = {}
    for kind, candidate in checkpoint["finalists"].items():
        evaluation = {key: value for key, value in candidate.items() if key not in ("estimator", "config")}
        for split, data in development.items():
            predictions = predict_rows(candidate, data)
            evaluation[split] = measure(candidate, data, predictions)
        bundle = make_bundle(candidate, manifest["detector"])
        validation = development["validation"]
        evaluation["nativeLatency"] = native_latency(candidate, validation)
        evaluation["web"] = verify_web(candidate, bundle, validation, predict_rows(candidate, validation))
        candidates[kind] = evaluation

    # Selection is fixed in the checkpoint, created without loading test.npz.
    test_data = load_partitions(work / "test.npz", manifest, ("test",))["test"]
    winner = checkpoint["finalists"][checkpoint["selected"]]
    test_predictions = predict_rows(winner, test_data)
    final = measure(winner, test_data, test_predictions)
    environment = {
        "python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__,
        "scikitLearn": sklearn.__version__, "node": node("--version").decode().strip(),
        "system": f"{platform.system()} {platform.machine()}", "cpu": platform.processor(),
    }
    evaluation = {
        "preparedSha256": digest(prepared), "trainedSha256": digest(work / "trained.joblib"),
        "audit": manifest["audit"], "split": manifest["split"], "featureStatus": manifest["featureStatus"],
        "requireOperatorReview": manifest["requireOperatorReview"],
        "candidates": candidates, "trials": checkpoint["trials"], "selected": checkpoint["selected"],
        "practicalTieF1": PRACTICAL_TIE_F1, "test": final, "environment": environment,
    }
    write_json(private / "test-decisions.json", [
        {**row, "prediction": item["labelId"], "rejection": item["reason"], "confidence": item.get("confidence"),
         "margin": item.get("margin")}
        for row, item in zip(test_data["rows"], test_predictions, strict=True)
    ])
    write_json(private / "evaluation.json", evaluation)
    return evaluation


def export(args, work, private):
    prepared = work / "prepared.json"
    manifest = read_json(prepared)
    checkpoint = checkpoint_for(work, prepared)
    evaluation = read_json(private / "evaluation.json")
    if (evaluation["preparedSha256"] != digest(prepared)
            or evaluation["trainedSha256"] != digest(work / "trained.joblib")):
        raise ValueError("La evaluación no coincide con el modelo actual. Repite evaluate.")
    if digest(args.dataset) != manifest["sourceSha256"]:
        raise ValueError("El JSON original cambió desde preprocess. Repite el flujo con una versión consistente.")
    winner = checkpoint["finalists"][checkpoint["selected"]]
    recent_windows = []
    document, source = read_document(args.dataset)
    if source != manifest["sourceSha256"]:
        raise ValueError("El JSON original cambió durante la exportación.")
    test_data = load_partitions(work / "test.npz", manifest, ("test",))["test"]
    by_id = {sample["sampleId"]: sample for sample in document["samples"] if isinstance(sample, dict) and isinstance(sample.get("sampleId"), str)}
    for row in test_data["rows"]:
        sample = by_id[row["sampleId"]]
        frames = sample["frames"]
        if frames[-1]["hands"] and frames[-1]["timestampMs"] - frames[0]["timestampMs"] >= winner["config"]["windowMs"]:
            recent_windows.append(web_input(sample))
    bundle = make_bundle(winner, manifest["detector"])
    bundle.update({
        "catalog": [{"id": label, "name": name} for label, name in LABELS.items()],
        "evaluation": {
            "splitStrategy": manifest["split"]["strategy"],
            "test": evaluation["test"]["withRejection"],
            "testClosed": {key: value for key, value in evaluation["test"]["closed"].items()
                           if key in ("count", "accuracy", "precisionMacro", "recallMacro", "f1Macro")} if evaluation["test"]["closed"] else None,
            "negative": evaluation["test"]["negative"],
        },
        "limitations": LIMITATIONS,
    })
    reference = predict_rows(winner, test_data)
    web = verify_web(winner, bundle, test_data, reference, recent_windows)
    target = work / "model.json"

    def verify_and_write(temporary):
        temporary.write_bytes(json_bytes(bundle))
        if args.browser:
            return json.loads(node(ML / "scripts" / "browser_smoke.mjs", temporary, args.browser))
        return None

    browser = atomic(target, verify_and_write)
    exported = {
        "artifact": target.relative_to(ML.parent).as_posix(), "modelVersion": bundle["modelVersion"],
        "preprocessing": bundle["preprocessing"], "inputDimensions": bundle["inputDimensions"],
        "outputDimensions": bundle["outputDimensions"], "hash": digest(target), "size": size(bundle),
        "web": web, "browser": browser,
    }
    write_json(private / "export.json", exported)
    report = ML / "reports" / f"{args.run_name}.md"
    atomic(report, lambda temporary: temporary.write_text(render_report(evaluation, exported), encoding="utf-8", newline="\n"))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("audit", "preprocess", "train", "evaluate", "export", "run"))
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--run-name", default="hito-3")
    parser.add_argument("--seed", type=int, default=1729)
    parser.add_argument("--grouping", choices=("auto", "participant", "session", "chronological"), default="auto")
    parser.add_argument("--require-operator-review", action="store_true")
    parser.add_argument("--browser", type=Path, help="Ejecutable Chromium local para comprobar el modelo al exportar.")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,47}", args.run_name) or not 0 <= args.seed < 2**32:
        parser.error("Nombre de corrida inválido o semilla fuera del rango uint32.")
    work = ML / "artifacts" / args.run_name
    private = ML / "reports" / "local" / args.run_name

    try:
        with threadpool_limits(limits=1):
            if args.command == "audit":
                _, _, _, summary = audited_dataset(args.dataset, args.require_operator_review, private)
                print(f"Auditoría: {summary['eligible']}/{summary['samples']} elegibles. {private / 'audit.json'}", flush=True)
            if args.command in ("preprocess", "run"):
                split = preprocess(args, work, private)
                totals = ", ".join(f"{name}={sum(counts.values())}" for name, counts in split["counts"].items())
                print(f"División {split['strategy']}: {totals}", flush=True)
            if args.command in ("train", "run"):
                print(f"Seleccionado con validación: {train(work)}", flush=True)
            if args.command in ("evaluate", "run"):
                evaluation = evaluate(work, private)
                result = evaluation["test"]["withRejection"]
                print(f"Prueba final de {result['count']} capturas: accuracy={result['accuracy']:.4f} F1 macro={result['f1Macro']:.4f}", flush=True)
            if args.command in ("export", "run"):
                print(f"Reporte: {export(args, work, private)}", flush=True)
    except (OSError, ValueError, TypeError) as error:
        sys.exit(f"Error: {error}")


if __name__ == "__main__":
    main()
