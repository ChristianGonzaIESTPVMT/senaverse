import copy
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from audit import EXPECTED, LABELS, LSP, NEGATIVE, audit
from split import SPLITS, split_recordings
from training import check_parity, fit_candidates, make_bundle, predict_rows, select_thresholds
import v2
from pipeline import digest, write_json


START = datetime(2025, 3, 1, tzinfo=timezone.utc)
DETECTOR = {"package": "@mediapipe/tasks-vision", "packageVersion": "1.2.3", "task": "HandLandmarker",
            "model": "Hand Landmarker Full", "modelVersion": "1", "quantization": "float16", "sha256": "0" * 64}


def sign(label):
    return {
        "id": label, "name": LABELS[label], "expectedHands": EXPECTED.get(label, 0),
        "category": "negative" if label == NEGATIVE else "lsp",
        "type": "static" if label in list(LSP)[:5] else "dynamic",
        "validationStatus": "not-applicable" if label == NEGATIVE else "pending", "durationMs": 1500,
    }


def recording(label="LSP-001", repetition=1, seconds=0, participant="P001"):
    return {"sampleId": f"sample-{participant}-{label}-{repetition}", "labelId": label, "participantId": participant,
            "repetition": repetition, "recordedAt": (START + timedelta(seconds=100 + seconds)).isoformat(),
            "durationMs": 1500}


def audited_recording(repetition=1, reviewed=True, label="LSP-001"):
    sample = recording(label=label, repetition=repetition, seconds=20 * repetition)
    frames = [{
        "timestampMs": i * 60,
        "handCount": 1,
        "hands": [{"landmarks": [{"x": .2 + j / 1000 + i / 10000, "y": .36, "z": .0} for j in range(21)],
                   "handedness": [{"index": 0, "score": .9, "categoryName": "Right", "displayName": "Right"}]}],
        "sourceTimestamps": {"capturedAtMs": 8000 + i * 60, "inferenceTimestampMs": 8002 + i * 60, "receivedAtMs": 8010 + i * 60},
    } for i in range(25)]
    sample.update({
        "reviewStatus": "accepted", "frames": frames, "incidents": [],
        "captureMetadata": {
            "completed": True, "requestedDurationMs": 1500, "qualityPolicyVersion": 2, "recordingStartedAtMs": 8000,
            "coordinates": "mediapipe-original", "visualMirrored": True, "consentedAt": START.isoformat(), "consentVersion": 1,
            "labelSnapshot": sign(label), "model": DETECTOR,
            "configuration": {"inputMirrored": False, "runningMode": "VIDEO", "numHands": 2, "delegate": "GPU",
                              "profile": "baseline", "cameraFrameRate": 30, "minHandDetectionConfidence": .5,
                              "minHandPresenceConfidence": .5, "minTrackingConfidence": .5,
                              "processingWidth": 640, "processingHeight": 480, "cameraWidth": 1280, "cameraHeight": 960},
        },
        "qualityMetrics": {"frameCount": len(frames), "sufficient": True, "averageFps": 1000 / 60,
                           "observedDurationMs": 1440, "expectedHandsRatio": 1, "warnings": []},
    })
    if reviewed is not None:
        sample["operatorReviewed"] = reviewed
    return sample


def document(*samples):
    return {
        "schemaVersion": 1, "exportType": "dataset", "samples": samples,
        "captureConfiguration": {"minimumFrames": 8, "minimumFps": 10, "minimumExpectedHandsRatio": .8,
                                 "minimumCoverageRatio": .7, "inputMirrored": False, "maxFreshAgeMs": 120,
                                 "timestamps": "milliseconds-relative-to-recording-start"},
        "mediaPipeModel": DETECTOR, "signs": [sign(label) for label in LABELS],
        "participants": [{"id": "P001", "createdAt": START.isoformat(),
                          "consentedAt": (START + timedelta(days=1)).isoformat(), "consentVersion": 1}],
    }


class AuditTest(unittest.TestCase):
    def test_absent_operator_field_respects_legacy_policy_and_strict_option(self):
        original = document(audited_recording(reviewed=None))
        backup = copy.deepcopy(original)
        eligible, report = audit(original)
        self.assertEqual(eligible, [0])
        self.assertEqual(report["samples"][0]["disposition"], "eligible-with-flags")
        self.assertIn("revision-por-operador-ausente", report["samples"][0]["flags"])
        self.assertEqual(audit(original, require_operator_review=True)[0], [])
        self.assertEqual(audit(document(audited_recording(reviewed=False)))[0], [])
        self.assertEqual(original, backup)

    def test_invalid_consent_landmarks_and_timestamps_are_excluded(self):
        sample = audited_recording()
        sample["captureMetadata"]["consentVersion"] = None
        sample["frames"][0]["hands"][0]["landmarks"][0]["z"] = float("nan")
        sample["frames"][1]["timestampMs"] = sample["frames"][0]["timestampMs"]
        eligible, report = audit(document(sample))
        self.assertFalse(eligible)
        self.assertTrue({"consentimiento-no-verificable", "landmarks-invalidos", "timestamp-repetido",
                         "timestamps-del-worker-inconsistentes"}.issubset(report["samples"][0]["issues"]))

    def test_detects_copied_recordings_with_new_ids_and_near_exact_overlaps(self):
        first, exact, near = audited_recording(), audited_recording(2), audited_recording(3)
        for frame in near["frames"]:
            for point in frame["hands"][0]["landmarks"]:
                point["x"] += .00000001
        _, report = audit(document(first, exact, near))
        rows = report["samples"]
        self.assertIn("secuencia-duplicada-exacta", rows[0]["issues"])
        self.assertIn("posible-secuencia-duplicada-o-solapada", rows[2]["issues"])
        self.assertEqual(rows[2]["relatedRows"], [1, 2])
        self.assertEqual(report["summary"]["eligible"], 0)

    def test_identical_hand_geometry_at_new_time_is_not_a_fresh_frame(self):
        sample = audited_recording()
        sample["frames"][2]["hands"] = sample["frames"][1]["hands"]
        self.assertIn("landmarks-de-fotogramas-duplicados", audit(document(sample))[1]["samples"][0]["issues"])

    def test_legacy_quality_policy_and_stale_worker_timestamps(self):
        sample = audited_recording()
        late = sample["frames"][0]["sourceTimestamps"]
        late["receivedAtMs"] = late["capturedAtMs"] + 121
        self.assertIn("resultado-del-worker-obsoleto", audit(document(sample))[1]["samples"][0]["issues"])
        for key in ("qualityPolicyVersion", "recordingStartedAtMs", "coordinates", "visualMirrored"):
            del sample["captureMetadata"][key]
        for frame in sample["frames"]:
            del frame["sourceTimestamps"]
        self.assertEqual(audit(document(sample))[0], [0])

    def test_zero_hands_are_valid_only_when_allowed_by_the_label_policy(self):
        sample = audited_recording(label=NEGATIVE)
        for frame in sample["frames"]:
            frame.update(handCount=0, hands=[])
        self.assertEqual(audit(document(sample))[0], [0])


class SplitTest(unittest.TestCase):
    def test_negatives_remain_an_intact_held_out_burst(self):
        regular = [recording(label, index + 1, 20 * index) for label in LSP for index in range(10)]
        negatives = [recording(NEGATIVE, index + 1, 12 * index) for index in range(7)]
        parts, summary = split_recordings(regular + negatives, 1729)
        self.assertEqual(summary["strategy"], "class-chronological-blocks")
        self.assertEqual(summary["counts"]["test"][NEGATIVE], 7)
        self.assertNotIn(NEGATIVE, summary["counts"]["train"])
        self.assertNotIn(NEGATIVE, summary["counts"]["validation"])
        ids = [{sample["sampleId"] for sample in parts[part]} for part in SPLITS]
        self.assertFalse(ids[0] & ids[1] or ids[0] & ids[2] or ids[1] & ids[2])
        self.assertEqual(len(set.union(*ids)), 107)

    def test_three_participants_cover_the_catalog_without_sharing_people(self):
        data = [recording(label, 1, 200 * index, f"P{index:03}") for index in range(1, 4) for label in LABELS]
        parts, summary = split_recordings(data, 1729, "participant")
        self.assertEqual(summary["strategy"], "participant")
        self.assertEqual(len({part[0]["participantId"] for part in parts.values()}), 3)
        self.assertTrue(all(len({sample["participantId"] for sample in part}) == 1 for part in parts.values()))
        self.assertTrue(all({sample["labelId"] for sample in part} == set(LABELS) for part in parts.values()))

    def test_additional_negative_bursts_make_negatives_available_for_training(self):
        regular = [recording(label, n + 1, 20 * n) for label in LSP for n in range(10)]
        negatives = [recording(NEGATIVE, n + 1, 150 * n) for n in range(3)]
        _, summary = split_recordings(regular + negatives, 1729)
        self.assertTrue(all(summary["counts"][part][NEGATIVE] == 1 for part in SPLITS))


class V2PipelineTest(unittest.TestCase):
    def test_prepares_disjoint_captures_and_compares_a_synthetic_svm_through_the_browser_policy(self):
        def take(label, person, label_index):
            sample = audited_recording(label=label)
            sample["sampleId"] = f"sample-{person}-{label}"
            sample["participantId"] = person
            sample["captureMetadata"]["collectionProtocol"] = "hito-4.3"
            for frame in sample["frames"]:
                base = frame["hands"][0]
                for index, point in enumerate(base["landmarks"]):
                    point["x"] += .05 * int(person[-1]) + .01 * label_index
                    point["y"] += index * (.001 + .0001 * label_index)
                if EXPECTED.get(label) == 2:
                    other = copy.deepcopy(base)
                    other["handedness"][0]["categoryName"] = "Left"
                    for point in other["landmarks"]:
                        point["x"] += .15
                    frame["hands"].append(other)
                    frame["handCount"] = 2
            return sample

        with TemporaryDirectory() as directory:
            root = Path(directory)
            work, private, original = (root / name for name in ("v2", "reports", "v1"))
            original.mkdir()
            baseline, dataset = root / "baseline.json", root / "dataset.json"
            old = take(v2.NADA, "P001", 12)
            held = take("LSP-001", "P001", 13)
            held["sampleId"] += "-v1-test"
            held["repetition"] = 2
            old["sampleId"] += "-old"
            old["repetition"] = 2
            del old["captureMetadata"]["collectionProtocol"]
            base = {**document(old, held), "datasetId": "test-dataset"}
            base["mediaPipeModel"]["sha256"] = "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1"
            write_json(baseline, base)
            archive = original / "test.npz"
            np.savez_compressed(archive, test_ids=[held["sampleId"]], test_labels=[held["labelId"]])
            write_json(original / "prepared.json", {"sourceSha256": digest(baseline), "files": {"test.npz": digest(archive)}, "configurations": {}})
            samples = [take(label, person, index) for person in ("P001", "P002", "P003")
                       for index, label in enumerate(LABELS)]
            excluded = take(NEGATIVE, "P002", 14)
            excluded.update(sampleId="sample-excluded", repetition=2, excludedFromV2=True)
            people = [dict(base["participants"][0], id=identifier) for identifier in ("P001", "P002", "P003")]
            write_json(dataset, {**base, "participants": people, "samples": [*samples, old, held, excluded]})
            args = SimpleNamespace(dataset=dataset, baseline=baseline, seed=1729, test_participant=["P003"],
                                   validation_participant=["P002"], partition="test")
            with patch.multiple(v2, WORK=work, PRIVATE=private, V1=original):
                self.assertEqual(v2.prepare(args), {name: dict.fromkeys(LABELS, 1) for name in v2.GROUPS})
                review = v2.read_json(private / "dataset-audit.json")
                self.assertEqual({row["sampleId"] for row in review["excluded"]},
                                 {old["sampleId"], held["sampleId"], excluded["sampleId"]})
                v2.train()
                bundle = v2.read_json(work / "model.json")
                self.assertEqual(bundle["outputDimensions"], 11)
                self.assertIn(NEGATIVE, [row["id"] for row in bundle["labels"]])
                reference = copy.deepcopy(bundle)
                reference.update(modelVersion="3.0.0-experimental.1+349faaea0427", outputDimensions=10)
                reference["labels"].pop()
                reference["parameters"]["weights"].pop()
                reference["parameters"]["bias"].pop()
                write_json(original / "model.json", reference)
                report = v2.compare(args)
                for name in ("v1", "v2"):
                    self.assertEqual(report[name]["positiveTakes"], 10)
                    self.assertEqual(report[name]["negativeTakes"], 1)
                self.assertFalse((root / "model.json").exists())


class ModelTest(unittest.TestCase):
    def test_scaler_fits_training_only_and_can_learn_the_negative_label(self):
        rng = np.random.default_rng(1729)
        centers = np.eye(len(LABELS))
        configs = {"24": {"steps": 24}}

        def split(repetitions, offset):
            x = np.repeat(centers, repetitions, axis=0) + rng.normal(0, .01, (repetitions * len(LABELS), len(LABELS))) + offset
            rows = [{"labelId": label} for label in LABELS for _ in range(repetitions)]
            return {"features": {"24": x}, "rows": rows, "rowsBySteps": {"24": [{"reason": None}] * len(rows)}}

        train, validation = split(4, 0), split(2, .7)
        finalists, _, _ = fit_candidates({"train": train, "validation": validation}, configs, 1729, DETECTOR)
        svm = finalists["linear-svm"]
        center = svm["estimator"].steps[0][1].mean_
        np.testing.assert_allclose(center, train["features"]["24"].mean(axis=0))
        self.assertIn(NEGATIVE, svm["estimator"].classes_)
        self.assertEqual(make_bundle(svm, DETECTOR)["outputDimensions"], 11)
        self.assertTrue(all(item["reason"] == "negative-class" for item in predict_rows(svm, train)[-4:]))

    def test_threshold_search_uses_validation_negatives_when_present(self):
        scores = np.array([[.95, .05], [.91, .09], [.52, .48]])
        labels = np.array(["LSP-001", "LSP-002"])
        thresholds = select_thresholds(scores, np.array(["LSP-001", "LSP-001", NEGATIVE]), labels)
        self.assertGreater(thresholds["confidence"], .52)

    def test_parity_requires_matching_rejection_and_scores(self):
        selected = [{"labelId": None, "reason": "low-margin", "scores": [.51, .49]}]
        self.assertEqual(check_parity(selected, selected)["matchingDecisions"], 1)
        different = [{"labelId": None, "reason": "low-confidence", "scores": [.51, .49]}]
        with self.assertRaises(ValueError):
            check_parity(selected, different)


if __name__ == "__main__":
    unittest.main()
