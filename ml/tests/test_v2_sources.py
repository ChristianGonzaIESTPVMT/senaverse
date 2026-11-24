"""Regression tests for multi-file V2 input and independent participant allocation."""

import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from audit import NEGATIVE
from v2_campaign import campaign_issues, coverage, participant_partitions
from v2_sources import read_sources
from test_pipeline import audited_recording, document


STAMP = "2026-11-24T09:00:00+00:00"
BATCH = "9b4442e5-1693-4e6c-b289-7c4a3e892848"


def export(*takes):
    return {**document(*takes), "exportedAt": STAMP, "createdAt": STAMP, "datasetId": "test-dataset"}


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return path


def block(index, *takes):
    payload = json.dumps(export(*takes), ensure_ascii=False, separators=(",", ":"))
    return {"format": "senaverse-block-v1", "batchId": BATCH, "index": index, "count": 2, "sampleCount": 2,
            "sha256": hashlib.sha256(payload.encode("utf-8")).hexdigest(), "payload": payload}


class V2InputTest(unittest.TestCase):
    def test_multiple_blocks_merge_an_identical_take_and_hash_is_order_independent(self):
        first = audited_recording()
        second = dict(copy.deepcopy(first), sampleId="sample-other", repetition=2)
        with TemporaryDirectory() as folder:
            root = Path(folder)
            a = write(root / "a.json", block(1, first))
            b = write(root / "b.json", block(2, second))
            c = write(root / "copy.json", export(first))
            data, signature = read_sources([b, c, a, a])
            self.assertEqual({row["sampleId"] for row in data["samples"]}, {first["sampleId"], second["sampleId"]})
            self.assertEqual(signature, read_sources([a, b, c])[1])
            with self.assertRaisesRegex(ValueError, "Lote incompleto"):
                read_sources([a])
            corrupt = block(2, second)
            corrupt["payload"] += " "
            write(b, corrupt)
            with self.assertRaisesRegex(ValueError, "integridad"):
                read_sources([a, b])

    def test_different_content_and_identity_never_overwrite(self):
        first = audited_recording()
        with TemporaryDirectory() as folder:
            root = Path(folder)
            a = write(root / "a.json", export(first))
            b = write(root / "b.json", export({**first, "operatorReviewed": False}))
            with self.assertRaisesRegex(ValueError, "Conflicto de contenido.*sampleId"):
                read_sources([a, b])
            write(b, {**export(first), "datasetId": "another-dataset"})
            with self.assertRaisesRegex(ValueError, "datasets distintos"):
                read_sources([a, b])

    def test_roles_apply_to_the_person_across_sessions_and_history_is_train_only(self):
        people = [{"id": "P001"}, {"id": "P002", "partition": "validation"}, {"id": "P003", "partition": "test"}]
        roles = participant_partitions(people, {"P001"}, {})
        self.assertEqual(roles, {"P001": "train", "P002": "validation", "P003": "test"})
        with self.assertRaisesRegex(ValueError, "más de una partición"):
            participant_partitions(people, {"P001"}, {"test": ["P002"]})
        with self.assertRaisesRegex(ValueError, "histórico"):
            participant_partitions(people, {"P001"}, {"validation": ["P001"]})
        with self.assertRaisesRegex(ValueError, "desconocido"):
            participant_partitions(people, {"P001"}, {"test": ["P777"]})
        guided = {"labelId": NEGATIVE, "participantId": "P002", "frames": [{"handCount": 2}],
                  "captureMetadata": {"campaign": {"negativeSubtype": "mucho-like"}}}
        split = {"train": [], "validation": [guided, guided], "test": []}
        ready = coverage(split, roles, True)
        self.assertEqual(ready["eligibleByParticipant"]["validation"], {"P002": 2})
        self.assertEqual(ready["negativeBySubtype"]["validation"], {"mucho-like": 2})
        self.assertEqual(ready["missingNegativeHandCounts"]["validation"], [0, 1])
        self.assertEqual(ready["missingParticipants"], {"validation": 1, "test": 2})

    def test_guide_checks_static_side_dynamic_duration_and_negative_subtypes(self):
        static = {"labelId": "LSP-001", "durationMs": 2000, "captureMetadata": {
            "labelSnapshot": {"expectedHands": 1}, "qualityPolicyVersion": 2, "collectionProtocol": "hito-4.3",
            "campaign": {"session": 1, "slotId": "1-lsp-1", "hand": "right"}}}
        self.assertEqual(campaign_issues(static, {"handCounts": {1: 10}}), [])
        static["captureMetadata"]["campaign"]["hand"] = "left"
        self.assertIn("mano-declarada-distinta-de-la-casilla-estatica", campaign_issues(static, {"handCounts": {1: 10}}))
        dynamic = copy.deepcopy(static)
        dynamic.update(labelId="LSP-009", durationMs=2000)
        dynamic["captureMetadata"]["campaign"]["slotId"] = "1-lsp-9"
        self.assertIn("duracion-o-casilla-positiva-incompatible", campaign_issues(dynamic, {"handCounts": {1: 10}}))
        negative = dict(static, labelId=NEGATIVE, durationMs=2500)
        negative["captureMetadata"].update(labelSnapshot={"expectedHands": 0},
                                           campaign={"session": 2, "slotId": "2-neg-6", "hand": "none", "negativeSubtype": "no-hands"})
        self.assertEqual(campaign_issues(negative, {"handCounts": {0: 10}}), [])
        self.assertIn("manos-adicionales-en-guia-v2", campaign_issues(negative, {"handCounts": {0: 9, 1: 1}}))


if __name__ == "__main__":
    unittest.main()
