"""Replay existing, private Hito 3 holdout recordings against the Hito 4 policy."""

import argparse
import sys
from pathlib import Path

from pipeline import DEFAULT_DATASET, ML, load_partitions, node, read_document, read_json, web_input


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--partition", choices=("validation", "test", "both"), default="validation")
    args = parser.parse_args()
    work = ML / "artifacts" / "hito-3"
    manifest = read_json(work / "prepared.json")
    document, source = read_document(args.dataset)
    if source != manifest["sourceSha256"]:
        raise ValueError("El dataset no coincide con la división original de Hito 3.")

    by_id = {sample["sampleId"]: sample for sample in document["samples"]}
    partitions = {}
    for split, filename in (("validation", "development.npz"), ("test", "test.npz")):
        if args.partition not in (split, "both"):
            continue
        selected = load_partitions(work / filename, manifest, (split,))[split]
        rows = []
        for row in selected["rows"]:
            sample = by_id[row["sampleId"]]
            config = sample["captureMetadata"]["configuration"]
            geometry = web_input(sample)
            for frame, original in zip(geometry["frames"], sample["frames"], strict=True):
                frame["sourceTimestamps"] = original["sourceTimestamps"]
            rows.append({
                **geometry, "labelId": row["labelId"], "configuration": config,
                "recordingStart": sample["captureMetadata"]["recordingStartedAtMs"],
            })
        partitions[split] = rows
    result = node("--experimental-strip-types", ML / "scripts" / "replay_lab.mjs", data={
        "model": read_json(work / "model.json"), "partitions": partitions,
    })
    sys.stdout.buffer.write(result)


if __name__ == "__main__":
    main()
