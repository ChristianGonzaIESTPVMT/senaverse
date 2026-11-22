"""Audit Nada, prepare V2, and compare frozen recognizers on independent captures."""

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from sklearn.metrics import f1_score
from threadpoolctl import threadpool_limits

from audit import LABELS, LSP, NEGATIVE, audit, read_document
from pipeline import DEFAULT_DATASET, ML, atomic, digest, load_partitions, node, read_json, web_input, write_json
from training import closed_scores, json_bytes, make_bundle, rank, temperature_for, training_candidates


WORK = ML / "artifacts" / "hito-4-3-v2"
PRIVATE = ML / "reports" / "local" / "hito-4-3-v2"
V1 = ML / "artifacts" / "hito-3"
NADA = "LSP-007"
GROUPS = ("train", "validation", "test")


def geometry(command, samples):
    inputs = [{"sampleId": sample["sampleId"], "labelId": sample["labelId"], **web_input(sample)}
              for sample in samples]
    return json.loads(node(ML / "scripts" / "v2_geometry.mjs", command, data=inputs))


def audit_nada(dataset):
    document, source = read_document(dataset)
    _, report = audit(document)
    technical = {row["sampleId"]: row for row in report["samples"]}
    samples = [sample for sample in document["samples"] if sample["labelId"] == NADA]
    inspected = geometry("inspect", samples)
    for sample, row in zip(samples, inspected, strict=True):
        result = technical[sample["sampleId"]]
        row.update(participantId=sample["participantId"], repetition=sample["repetition"],
                   technicalIssues=result["issues"], incidents=result["incidents"], reviewStatus=sample["reviewStatus"],
                   excludedFromV2=sample.get("excludedFromV2") is True)
    summary = {"total": len(samples), "directions": dict(Counter(row["direction"] for row in inspected)),
               "hasPassingWindow1350": sum(any(window["passes"] for window in row["windows"]) for row in inspected)}
    write_json(PRIVATE / "nada-audit.json", {"sourceSha256": source, "summary": summary, "samples": inspected})
    return summary


def historical(baseline):
    prepared = read_json(V1 / "prepared.json")
    document, source = read_document(baseline)
    if source != prepared["sourceSha256"]:
        raise ValueError("La exportación histórica debe coincidir con la que produjo la división de V1.")
    return document, prepared


def diagnose(baseline):
    document, prepared = historical(baseline)
    by_id = {sample["sampleId"]: sample for sample in document["samples"]}
    selected = load_partitions(V1 / "development.npz", prepared, ("validation",))["validation"]["rows"]
    samples = [by_id[row["sampleId"]] for row in selected if row["labelId"] in LSP]
    inspected = geometry("inspect", samples)
    summary = {}
    for sample, row in zip(samples, inspected, strict=True):
        label = sample["labelId"]
        if label < "LSP-006":
            continue
        counts = summary.setdefault(label, {"takes": 0, "hasWindow1350": 0, "hasPassingWindow1350": 0,
                                            "passesOnFullSequence": 0})
        counts["takes"] += 1
        counts["hasWindow1350"] += bool(row["windows"])
        counts["hasPassingWindow1350"] += any(window["passes"] for window in row["windows"])
        counts["passesOnFullSequence"] += row["completePasses"]
    laterality = json.loads(node(ML / "scripts" / "v2_geometry.mjs", "laterality", data={
        "rows": [{"labelId": sample["labelId"], **web_input(sample)} for sample in samples if sample["labelId"] < "LSP-006"],
        "model": read_json(V1 / "model.json"),
    }))
    result = {"byLabel": summary, "simulatedStaticLaterality": laterality}
    write_json(PRIVATE / "historical-development-motion.json", {**result, "samples": inspected})
    return result


def prepare(args):
    if not args.dataset:
        raise ValueError("Indica la exportación nueva con --dataset.")
    document, source = read_document(args.dataset)
    baseline, v1_manifest = historical(args.baseline)
    old_ids = {sample["sampleId"] for sample in baseline["samples"]}
    old_people = {person["id"] for person in baseline["participants"]}
    v1_test = load_partitions(V1 / "test.npz", v1_manifest, ("test",))["test"]["rows"]
    blocked = {row["sampleId"] for row in v1_test}
    people = {person["id"] for person in document["participants"]}
    validation, test = set(args.validation_participant), set(args.test_participant)
    if (not validation or not test or validation & test or test & old_people
            or not (validation | test).issubset(people)):
        raise ValueError("Indica participantes distintos para validación y prueba. Los de prueba deben ser nuevos.")
    if document["datasetId"] != baseline["datasetId"] or document["mediaPipeModel"] != baseline["mediaPipeModel"]:
        raise ValueError("Exporta el Dataset Studio existente con las capturas nuevas y el mismo detector.")

    _, technical = audit(document)
    split = {name: [] for name in GROUPS}
    excluded = []
    for sample, row in zip(document["samples"], technical["samples"], strict=True):
        identifier, label, issues = row["sampleId"], row["labelId"], list(row["issues"])
        if issues:
            excluded.append({"sampleId": identifier, "labelId": label, "reasons": issues})
            continue
        person = sample["participantId"]
        partition = "test" if person in test else "validation" if person in validation else "train"
        if sample.get("excludedFromV2") is True:
            issues.append("exclusion-de-v2")
        if identifier in blocked:
            issues.append("prueba-original-v1")
        if (label in (NADA, NEGATIVE) or partition == "test") and (
                identifier in old_ids or sample.get("captureMetadata", {}).get("collectionProtocol") != "hito-4.3"
                or sample.get("operatorReviewed") is not True):
            issues.append("requiere-captura-nueva-y-revision-explicita")
        if issues:
            excluded.append({"sampleId": identifier, "labelId": label, "reasons": issues})
            continue
        split[partition].append(sample)
    counts = {name: dict(Counter(sample["labelId"] for sample in part)) for name, part in split.items()}
    negatives = {name: dict(Counter(max(frame["handCount"] for frame in sample["frames"])
                                       for sample in part if sample["labelId"] == NEGATIVE))
                 for name, part in split.items()}
    gaps = {name: sorted(set(LABELS) - count.keys()) for name, count in counts.items() if set(LABELS) - count.keys()}
    write_json(PRIVATE / "dataset-audit.json", {"sourceSha256": source, "counts": counts, "negativeByMaxHands": negatives, "missing": gaps,
                                             "excluded": excluded, "technical": technical})
    if gaps:
        raise ValueError(f"Faltan capturas elegibles en la división V2: {gaps}. Consulta dataset-audit.json.")
    if not (negatives["test"].get(1) or negatives["test"].get(2)):
        raise ValueError("La prueba independiente requiere negativos con manos para medir falsas aceptaciones.")

    output = {}
    for name in ("train", "validation"):
        labels, ids, features = [], [], []
        for start in range(0, len(split[name]), 24):
            batch = split[name][start:start + 24]
            result = geometry("features", batch)
            config = result["config"]
            for sample, vectors in zip(batch, result["rows"], strict=True):
                label = sample["labelId"]
                features.extend(vectors)
                labels.extend([label] * len(vectors))
                ids.extend([sample["sampleId"]] * len(vectors))
        missing = set(LABELS) - set(labels)
        if missing:
            raise ValueError(f"Faltan ventanas causales con manos en {name}: {sorted(missing)}.")
        matrix = np.asarray(features, dtype=np.float64)
        if matrix.shape != (len(labels), result["dimensions"]) or not np.isfinite(matrix).all():
            raise ValueError(f"Los vectores preparados para {name} no son válidos.")
        output[f"{name}_x"] = matrix
        output[f"{name}_y"] = np.asarray(labels)
        per_take = Counter(ids)
        output[f"{name}_weight"] = np.asarray([1 / per_take[identifier] for identifier in ids])
    development = WORK / "development.npz"

    def save(path):
        with path.open("wb") as stream:
            np.savez_compressed(stream, **output)

    atomic(development, save)
    write_json(WORK / "prepared.json", {
        "sourceSha256": source, "developmentSha256": digest(development), "seed": args.seed,
        "config": config, "detector": document["mediaPipeModel"], "counts": counts,
    })
    write_json(PRIVATE / "split.json", {"preparedSha256": digest(WORK / "prepared.json"), "samples": {
        name: [sample["sampleId"] for sample in part] for name, part in split.items()
    }})
    return counts


def thresholds_by_label(scores, labels, classes, weights):
    win, confidence, margin = rank(scores)
    closed = classes[win]
    by_label = {}
    for label in LSP:
        positive = (closed == label) & (labels == label)
        impostor = (closed == label) & (labels != label)
        base = (confidence >= .75) & (margin >= .40)
        by_label[label] = {"confidence": .75, "margin": .40}
        # Keep the baseline unless development shows both correct and incorrect accepted windows.
        if not np.any(positive & base) or not np.any(impostor & base):
            continue
        options = []
        minimum_kept = .95 * weights[positive & base].sum()
        for score in (.75, .80, .85, .90, .95):
            for difference in (.40, .55, .65, .75, .85, .90):
                keep = (confidence >= score) & (margin >= difference)
                kept = weights[keep & positive].sum()
                if kept >= minimum_kept:
                    options.append((weights[keep & impostor].sum(), -kept, score, difference))
        _, _, score, difference = min(options)
        by_label[label] = {"confidence": score, "margin": difference}
    return by_label


def train():
    prepared_path = WORK / "prepared.json"
    manifest = read_json(prepared_path)
    development = WORK / "development.npz"
    if digest(development) != manifest["developmentSha256"]:
        raise ValueError("Repite prepare para generar insumos coherentes.")
    with np.load(development, allow_pickle=False) as data, threadpool_limits(limits=1):
        train_x, train_y, train_weight = (data[f"train_{key}"] for key in ("x", "y", "weight"))
        val_x, val_y, val_weight = (data[f"validation_{key}"] for key in ("x", "y", "weight"))
        candidates = []
        for kind, parameters, estimator in training_candidates(manifest["seed"]):
            if kind != "linear-svm":
                continue
            weight = train_weight * (len(train_weight) / train_weight.sum())
            estimator.fit(train_x, train_y, **{f"{step}__sample_weight": weight for step, _ in estimator.steps})
            temperature = temperature_for(estimator, val_x, val_y)
            scores = closed_scores(estimator, kind, val_x, temperature)
            closed = estimator.classes_[scores.argmax(axis=1)]
            f1 = f1_score(val_y, closed, labels=list(LABELS), average="macro", sample_weight=val_weight, zero_division=0)
            candidates.append((f1, parameters, estimator, temperature, scores))
        f1, parameters, estimator, temperature, scores = max(candidates, key=lambda item: item[0])
        by_label = thresholds_by_label(scores, val_y, estimator.classes_, val_weight)
        candidate = {"estimator": estimator, "kind": "linear-svm", "temperature": temperature,
                     "config": manifest["config"], "thresholds": {"confidence": .75, "margin": .40}}
        bundle = make_bundle(candidate, manifest["detector"])
        del bundle["modelVersion"]
        bundle["policy"] = {"version": "lsp-lab-2", "byLabel": by_label}
        signature = hashlib.sha256(json_bytes(bundle)).hexdigest()[:12]
        bundle["modelVersion"] = f"4.3.0-experimental.1+{signature}"
        write_json(WORK / "model.json", bundle)
        write_json(PRIVATE / "trained.json", {"modelSha256": digest(WORK / "model.json"),
                                            "preparedSha256": digest(prepared_path),
                                            "validationWindowF1Macro": f1, "hyperparameters": parameters})
    return {"model": str(WORK / "model.json"), "validationWindowF1Macro": f1}


def replay_row(sample):
    row = web_input(sample)
    metadata = sample["captureMetadata"]
    for frame, saved in zip(row["frames"], sample["frames"], strict=True):
        frame["sourceTimestamps"] = saved.get("sourceTimestamps")
    return {**row, "sampleId": sample["sampleId"], "labelId": sample["labelId"],
            "configuration": metadata["configuration"], "recordingStart": metadata.get("recordingStartedAtMs")}


def compare(args):
    if not args.dataset:
        raise ValueError("Indica la misma exportación de prepare con --dataset.")
    prepared_path = WORK / "prepared.json"
    model_path = WORK / "model.json"
    prepared, split, trained = (read_json(path) for path in (
        prepared_path, PRIVATE / "split.json", PRIVATE / "trained.json"))
    prepared_hash = digest(prepared_path)
    if (trained["preparedSha256"] != prepared_hash or trained["modelSha256"] != digest(model_path)
            or split["preparedSha256"] != prepared_hash):
        raise ValueError("La división, el preprocesamiento y el modelo no corresponden a la misma corrida.")
    document, source = read_document(args.dataset)
    if source != prepared["sourceSha256"]:
        raise ValueError("La exportación cambió desde prepare.")
    by_id = {sample["sampleId"]: sample for sample in document["samples"]}
    rows = [replay_row(by_id[identifier]) for identifier in split["samples"][args.partition]]
    report = json.loads(node("--experimental-strip-types", ML / "scripts" / "v2_compare.mjs", data={
        "models": {"v1": read_json(V1 / "model.json"), "v2": read_json(model_path)}, "rows": rows,
    }))
    write_json(PRIVATE / f"comparison-{args.partition}.json", {
        "sourceSha256": source, "modelSha256": trained["modelSha256"], **report,
    })
    return report["summary"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("audit-nada", "diagnose", "prepare", "train", "compare"))
    parser.add_argument("--dataset", type=Path)
    parser.add_argument("--baseline", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--seed", type=int, default=1729)
    parser.add_argument("--validation-participant", action="append", default=[])
    parser.add_argument("--test-participant", action="append", default=[])
    parser.add_argument("--partition", choices=("validation", "test"), default="validation")
    args = parser.parse_args()
    commands = {"audit-nada": lambda: audit_nada(args.dataset or args.baseline),
                "diagnose": lambda: diagnose(args.baseline), "prepare": lambda: prepare(args),
                "train": train, "compare": lambda: compare(args)}
    try:
        print(json.dumps(commands[args.command](), ensure_ascii=False, indent=2))
    except (ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
