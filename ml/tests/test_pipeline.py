import copy
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from audit import EXPECTED, LABELS, LSP, NEGATIVE, audit
from split import SPLITS, split_recordings
from training import check_parity, fit_candidates, make_bundle, predict_rows, select_thresholds


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
