"""Read-only audit of Dataset Studio schema v1 for the LSP pilot."""

import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime
from itertools import combinations, pairwise

import numpy as np


LSP = {f"LSP-{index:03}": name for index, name in enumerate(
    ("Uno", "Dos", "Tres", "Cuatro", "Cinco", "Sí", "Nada", "Mucho", "Solo", "Con"), 1)}
NEGATIVE = "NEG-001"
LABELS = {**LSP, NEGATIVE: "Ejemplos negativos"}
EXPECTED = dict(zip(LSP, (1, 1, 1, 1, 1, 1, 1, 2, 1, 2), strict=True))
INCIDENTS = {"hand-count-mismatch", "result-gap", "invalid-result", "duplicate-timestamp", "out-of-order-timestamp"}
MODEL_KEYS = {"package", "packageVersion", "task", "model", "modelVersion", "quantization", "sha256"}
CONFIDENCE_KEYS = ("minHandDetectionConfidence", "minHandPresenceConfidence", "minTrackingConfidence")


def number(value):
    return type(value) in (int, float) and abs(value) <= 1.7976931348623157e308 and math.isfinite(value)


def date(value):
    if not isinstance(value, str) or not re.match(r"^\d{4}-\d{2}-\d{2}T", value):
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else None


def read_document(path):
    raw = path.read_bytes()
    document = json.loads(raw)
    if (not isinstance(document, dict) or type(document.get("schemaVersion")) is not int
            or document["schemaVersion"] != 1 or document.get("exportType") not in ("dataset", "backup")
            or not all(isinstance(document.get(key), list) for key in ("participants", "signs", "samples"))):
        raise ValueError("Se requiere un dataset o respaldo JSON de Dataset Studio, schemaVersion 1.")
    defaults, detector = document.get("captureConfiguration"), document.get("mediaPipeModel")
    if (not isinstance(defaults, dict) or defaults.get("inputMirrored") is not False
            or defaults.get("timestamps") != "milliseconds-relative-to-recording-start"
            or not isinstance(detector, dict) or detector.keys() != MODEL_KEYS
            or not all(isinstance(value, str) and 0 < len(value) <= 120 for value in detector.values())
            or detector["task"] != "HandLandmarker" or not re.fullmatch(r"[a-f0-9]{64}", detector["sha256"])):
        raise ValueError("Configuración o procedencia MediaPipe incompatible con este módulo.")
    return document, hashlib.sha256(raw).hexdigest()


def index_by_id(records, kind):
    indexed = {}
    for record in records:
        identifier = record.get("id") if isinstance(record, dict) else None
        if not isinstance(identifier, str) or not identifier or identifier in indexed:
            raise ValueError(f"Identificador ausente o repetido en {kind}.")
        indexed[identifier] = record
    return indexed


def known_label(label, identifier):
    if not isinstance(label, dict) or label.get("id") != identifier:
        return False
    hands = label.get("expectedHands")
    if type(hands) is not int:
        return False
    if identifier == NEGATIVE:
        return label.get("category") == "negative" and label.get("validationStatus") == "not-applicable" and hands in (0, 1, 2)
    return (identifier in LSP and label.get("category") == "lsp" and label.get("name") == LSP[identifier]
            and label.get("validationStatus") in ("pending", "validated") and hands == EXPECTED[identifier]
            and label.get("type") == ("static" if identifier <= "LSP-005" else "dynamic"))


def points_valid(points):
    return isinstance(points, list) and len(points) == 21 and all(
        isinstance(point, dict) and all(number(point.get(axis)) for axis in "xyz") for point in points)


def handedness_valid(categories):
    return isinstance(categories, list) and len(categories) <= 4 and all(
        isinstance(category, dict) and number(category.get("score")) and 0 <= category["score"] <= 1
        and type(category.get("index")) is int and -1 <= category["index"] <= 100
        and all(isinstance(category.get(key), str) for key in ("categoryName", "displayName"))
        for category in categories)


def frame_keys(hands):
    # Sort complete hands so the detector's output order does not affect duplicates.
    coords = np.array(sorted(tuple(float(point[axis]) for point in hand["landmarks"] for axis in "xyz")
                             for hand in hands), dtype="<f8")
    coords[coords == 0] = 0  # Treat negative zero as zero.
    rounded = np.round(coords, 5)
    rounded[rounded == 0] = 0
    return tuple(hashlib.blake2b(value.tobytes(), digest_size=16).digest() for value in (coords, rounded))


def lateralities(hands, previous):
    current = []
    flags = set()
    for hand in hands:
        categories = hand["handedness"]
        best = max(categories, key=lambda value: value["score"], default={})
        name = best.get("categoryName")
        if name not in ("Left", "Right"):
            flags.add("lateralidad-ausente" if not categories else "lateralidad-desconocida")
            name = None
        elif best["score"] < .8:
            flags.add("lateralidad-baja-confianza")
            name = None
        wrist = hand["landmarks"][0]
        current.append((name, (wrist["x"], wrist["y"])))
    if len(current) == 2 and current[0][0] is not None and current[0][0] == current[1][0]:
        flags.add("misma-lateralidad-en-dos-manos")
    if previous and current:
        for name, wrist in current:
            old_name, old_wrist = min(previous, key=lambda old: math.dist(wrist, old[1]))
            if name and old_name and name != old_name and math.dist(wrist, old_wrist) <= .08:
                flags.add("cambio-lateralidad-muneca-proxima")
    return current, flags


def inspect_frames(frames, duration, metadata, expected, freshness, issues, warnings):
    keys = []
    times = []
    hand_counts = []
    previous_inference = -1
    previous = []
    policy = metadata.get("qualityPolicyVersion")
    start = metadata.get("recordingStartedAtMs")
    if ("qualityPolicyVersion" in metadata and policy != 2) or (policy == 2 and (
        not number(start) or start < 0 or metadata.get("coordinates") != "mediapipe-original"
        or metadata.get("visualMirrored") is not True
    )) or (policy is None and any(key in metadata for key in ("recordingStartedAtMs", "coordinates", "visualMirrored"))):
        issues.add("politica-calidad-o-coordenadas-invalidas")

    for frame in frames:
        if not isinstance(frame, dict):
            issues.add("fotograma-invalido")
            continue
        timestamp, hands = frame.get("timestampMs"), frame.get("hands")
        if number(timestamp) and 0 <= timestamp < duration:
            times.append(timestamp)
        else:
            issues.add("timestamp-fuera-de-captura")
        source = frame.get("sourceTimestamps")
        if policy is None and "sourceTimestamps" in frame:
            issues.add("timestamps-del-worker-sin-politica-v2")
        elif policy == 2:
            captured, inferred, received = (source.get(key) for key in (
                "capturedAtMs", "inferenceTimestampMs", "receivedAtMs")) if isinstance(source, dict) else (None,) * 3
            if not (all(number(t) for t in (captured, inferred, received)) and 0 <= captured <= inferred <= received
                    and inferred > previous_inference and number(start) and number(timestamp)
                    and abs(captured - start - timestamp) < 1e-7):
                issues.add("timestamps-del-worker-inconsistentes")
            else:
                previous_inference = inferred
                if received - captured > freshness:
                    issues.add("resultado-del-worker-obsoleto")

        count = frame.get("handCount")
        if not isinstance(hands, list) or type(count) is not int or not 0 <= count <= 2 or count != len(hands):
            issues.add("recuento-de-manos-invalido")
            continue
        hand_counts.append(count)
        if not all(isinstance(hand, dict) and points_valid(hand.get("landmarks"))
                   and ("worldLandmarks" not in hand or points_valid(hand["worldLandmarks"])) for hand in hands):
            issues.add("landmarks-invalidos")
            continue
        if not all(handedness_valid(hand.get("handedness")) for hand in hands):
            issues.add("campos-de-lateralidad-invalidos")
            continue
        previous, flags = lateralities(hands, previous)
        warnings.update(flags)
        keys.append(frame_keys(hands) if hands else (None, None))

    gaps = [later - earlier for earlier, later in pairwise(times)]
    if len(set(times)) != len(times):
        issues.add("timestamp-repetido")
    if any(gap < 0 for gap in gaps):
        issues.add("timestamps-desordenados")
    if any(gap > 250 for gap in gaps):
        warnings.add("intervalo-sin-resultados-mayor-a-250ms")
    if len(times) > 1 and (times[0] > 250 or duration - times[-1] > 250):
        warnings.add("cobertura-incompleta-en-extremos")
    counts = Counter(hand_counts)
    if expected and counts.get(expected, 0) != len(frames):
        warnings.add("fotogramas-con-cantidad-de-manos-distinta")
    if expected and any(count < expected for count in hand_counts):
        warnings.add("falta-al-menos-una-mano-esperada")
    coverage = times[-1] - times[0] if len(times) > 1 else 0
    fps = 1000 * (len(times) - 1) / coverage if coverage > 0 else 0
    ratio = (counts.get(expected, 0) / len(frames) if frames else 0) if expected else 1
    exact = [key for key, _ in keys if key is not None]
    duplicate_count = len(exact) - len(set(exact))
    if duplicate_count:
        issues.add("landmarks-de-fotogramas-duplicados")
    return keys, {
        "frames": len(frames), "observedMs": coverage, "fps": fps, "expectedHandsRatio": ratio,
        "handCounts": dict(counts), "duplicateFrames": duplicate_count,
    }


def audit_sample(sample, signs, participants, defaults, detector, require_operator_review):
    issues, warnings = set(), set()
    sample_id = sample.get("sampleId")
    label = sample.get("labelId")
    participant = sample.get("participantId")
    if not isinstance(label, str) or not known_label(signs.get(label), label):
        issues.add("etiqueta-fuera-del-catalogo-o-invalida")
    if not isinstance(sample_id, str) or not re.fullmatch(r"[A-Za-z0-9-]{1,80}", sample_id):
        issues.add("id-de-muestra-invalido")
    person = participants.get(participant) if isinstance(participant, str) else None
    recorded = date(sample.get("recordedAt"))
    if not recorded:
        issues.add("fecha-de-captura-invalida")
    repetition = sample.get("repetition")
    if type(repetition) is not int or repetition < 1:
        issues.add("repeticion-invalida")
    status = sample.get("reviewStatus")
    if status != "accepted":
        issues.add(f"estado-{status}" if status in ("pending", "rejected") else "estado-de-aceptacion-invalido")
    review = sample.get("operatorReviewed")
    if "operatorReviewed" not in sample:
        warnings.add("revision-por-operador-ausente")
        if require_operator_review:
            issues.add("revision-explicita-requerida")
    elif review is False:
        issues.add("revision-por-operador-desmarcada")
    elif review is not True:
        issues.add("estado-de-operador-invalido")
    if isinstance(label, str) and label in LSP and signs.get(label, {}).get("validationStatus") == "pending":
        warnings.add("validacion-linguistica-pendiente")

    metadata = sample.get("captureMetadata")
    metadata = metadata if isinstance(metadata, dict) else {}
    consent = date(metadata.get("consentedAt"))
    created = date(person.get("createdAt")) if person else None
    if not (person and re.fullmatch(r"P\d{3,6}", participant) and int(participant[1:]) > 0
            and type(person.get("consentVersion")) is int and person["consentVersion"] == 1
            and created and date(person.get("consentedAt")) and consent and recorded
            and type(metadata.get("consentVersion")) is int and metadata["consentVersion"] == 1
            and created <= consent <= recorded and created <= date(person["consentedAt"])):
        issues.add("consentimiento-no-verificable")
    snapshot = metadata.get("labelSnapshot")
    if not isinstance(label, str) or not known_label(snapshot, label):
        issues.add("etiqueta-original-incompatible")
    snapshot = snapshot if isinstance(snapshot, dict) else {}
    expected = snapshot.get("expectedHands")
    expected = expected if type(expected) is int and 0 <= expected <= 2 else 0
    duration = sample.get("durationMs")
    valid_duration = number(duration) and 500 <= duration <= 10000
    if not (valid_duration and duration == metadata.get("requestedDurationMs") == snapshot.get("durationMs")
            and metadata.get("completed") is True):
        issues.add("grabacion-incompleta")
    duration = duration if valid_duration else 0
    config = metadata.get("configuration")
    config = config if isinstance(config, dict) else {}
    camera_fps = config.get("cameraFrameRate")
    if (config.get("inputMirrored") is not False or config.get("runningMode") != "VIDEO"
            or config.get("numHands") != 2 or config.get("delegate") not in ("CPU", "GPU")
            or not isinstance(config.get("profile"), str) or not config["profile"]
            or not all(number(config.get(key)) and 0 <= config[key] <= 1 for key in CONFIDENCE_KEYS)
            or "cameraFrameRate" not in config or (camera_fps is not None and not (number(camera_fps) and 0 <= camera_fps <= 1000))
            or not all(type(config.get(key)) is int and 1 <= config[key] <= 16384
                       for key in ("processingWidth", "processingHeight", "cameraWidth", "cameraHeight"))
            or metadata.get("model") != detector):
        issues.add("configuracion-de-media-pipe-incompatible")

    frames = sample.get("frames")
    if not isinstance(frames, list) or len(frames) > 1000:
        issues.add("lista-de-fotogramas-invalida")
        frames = []
    keys, measured = inspect_frames(frames, duration, metadata, expected, defaults["maxFreshAgeMs"], issues, warnings)
    contrary_to_quality = (
        measured["frames"] < defaults["minimumFrames"] or measured["fps"] < defaults["minimumFps"]
        or measured["expectedHandsRatio"] < defaults["minimumExpectedHandsRatio"]
        or measured["observedMs"] < duration * defaults["minimumCoverageRatio"]
        or (not measured["handCounts"].get(1, 0) and not measured["handCounts"].get(2, 0) and (label != NEGATIVE or expected))
    )
    quality = sample.get("qualityMetrics")
    if not isinstance(quality, dict):
        issues.add("metricas-de-calidad-ausentes")
        quality = {}
    stored_warnings = quality.get("warnings")
    if not isinstance(stored_warnings, list) or not all(isinstance(warning, str) for warning in stored_warnings):
        issues.add("advertencias-de-calidad-invalidas")
        stored_warnings = []
    if contrary_to_quality or quality.get("sufficient") is not True or stored_warnings:
        issues.add("calidad-tecnica-insuficiente")
    for source_key, measured_key in (("frameCount", "frames"), ("averageFps", "fps"),
                                     ("observedDurationMs", "observedMs"), ("expectedHandsRatio", "expectedHandsRatio")):
        value = quality.get(source_key)
        if not number(value) or abs(value - measured[measured_key]) > 1e-7:
            issues.add("metricas-de-calidad-inconsistentes")
    incidents = Counter()
    incident_list = sample.get("incidents")
    if not isinstance(incident_list, list):
        issues.add("incidencias-invalidas")
        incident_list = []
    for incident in incident_list:
        if (isinstance(incident, dict) and incident.get("type") in tuple(INCIDENTS)
                and number(incident.get("timestampMs")) and 0 <= incident["timestampMs"] <= duration):
            incidents[incident["type"]] += 1
        else:
            issues.add("incidencias-invalidas")
    if INCIDENTS.intersection(incidents) - {"hand-count-mismatch"}:
        warnings.add("incidente-de-integridad-requiere-revision")
        if metadata.get("qualityPolicyVersion") == 2:
            issues.add("incidente-v2-de-integridad")
    if metadata.get("qualityPolicyVersion") == 2 and warnings.intersection({
        "intervalo-sin-resultados-mayor-a-250ms", "cobertura-incompleta-en-extremos", "falta-al-menos-una-mano-esperada"
    }):
        issues.add("cobertura-o-manos-incompatibles-con-politica-v2")
    if "lateralidad-ausente" in warnings:
        issues.add("lateralidad-ausente-en-politica-de-calidad")
    return {
        "sampleId": sample_id if isinstance(sample_id, str) else None,
        "labelId": label if isinstance(label, str) else None,
        "reviewStatus": status if isinstance(status, str) else None,
        "operatorReviewed": ("true" if review is True else "false" if review is False else
                             "absent" if "operatorReviewed" not in sample else "invalid"),
        "issues": issues, "flags": sorted(warnings), "captureWarnings": stored_warnings,
        "incidents": dict(incidents), **measured,
    }, keys


def mark_duplicates(rows, fingerprints):
    exact_sessions = defaultdict(list)
    chunks = defaultdict(set)
    candidate_pairs = defaultdict(set)
    for index, keys in enumerate(fingerprints):
        exact, coarse = zip(*keys) if keys else ((), ())
        if any(exact):
            exact_sessions[exact].append(index)
        for triple in set(zip(coarse, coarse[1:], coarse[2:])):
            if all(triple):
                for other in chunks[triple]:
                    candidate_pairs[other, index].add(triple)
                chunks[triple].add(index)
    exact_pairs = {pair for indexes in exact_sessions.values() for pair in combinations(indexes, 2)}
    # Two shared triples are conservative evidence of an overlapping or re-exported recording.
    for first, second in set(candidate_pairs).union(exact_pairs):
        exact = (first, second) in exact_pairs
        if not exact and len(candidate_pairs[first, second]) < 2:
            continue
        reason = "secuencia-duplicada-exacta" if exact else "posible-secuencia-duplicada-o-solapada"
        for row, other in ((first, second), (second, first)):
            rows[row]["issues"].add(reason)
            rows[row].setdefault("relatedRows", []).append(other + 1)


def audit(document, require_operator_review=False):
    participants = index_by_id(document["participants"], "participantes")
    signs = index_by_id(document["signs"], "etiquetas")
    defaults = document["captureConfiguration"]
    if any(not number(defaults.get(key)) or defaults[key] != expected for key, expected in {
        "minimumFrames": 8, "minimumFps": 10, "minimumExpectedHandsRatio": .8, "minimumCoverageRatio": .7,
        "maxFreshAgeMs": 120,
    }.items()):
        raise ValueError("Umbrales de calidad del esquema v1 incompatibles con Dataset Studio.")
    rows, fingerprints, repetitions = [], [], []
    for value in document["samples"]:
        sample = value if isinstance(value, dict) else {}
        row, keys = audit_sample(sample, signs, participants, defaults, document["mediaPipeModel"], require_operator_review)
        rows.append(row)
        fingerprints.append(keys)
        repetitions.append(tuple(str(sample.get(key)) for key in ("participantId", "labelId", "repetition")))
    ids = Counter(str(row["sampleId"]) for row in rows)
    repeated = Counter(repetitions)
    mark_duplicates(rows, fingerprints)
    for index, (row, repetition) in enumerate(zip(rows, repetitions), 1):
        if ids[str(row["sampleId"])] > 1:
            row["issues"].add("id-de-muestra-repetido")
        if repeated[repetition] > 1:
            row["issues"].add("repeticion-duplicada")
        row["row"] = index
        row["issues"] = sorted(row["issues"])
        row["disposition"] = ("excluded" if row["issues"] else "eligible-with-flags" if row["flags"] else "eligible")
        if "relatedRows" in row:
            row["relatedRows"] = sorted(row["relatedRows"])
    eligible = [i for i, row in enumerate(rows) if not row["issues"]]
    summary = {
        "samples": len(rows), "frames": sum(row["frames"] for row in rows),
        "participants": len({repetitions[i][0] for i in eligible}),
        "eligible": len(eligible), "excluded": len(rows) - len(eligible),
        "byLabel": dict(Counter(str(row["labelId"]) for row in rows)),
        "eligibleByLabel": dict(Counter(str(rows[i]["labelId"]) for i in eligible)),
        "review": dict(Counter(str(row["reviewStatus"]) for row in rows)),
        "operatorReview": dict(Counter(row["operatorReviewed"] for row in rows)),
        "reportedSufficient": sum(isinstance(sample, dict) and isinstance(sample.get("qualityMetrics"), dict)
                                  and sample["qualityMetrics"].get("sufficient") is True for sample in document["samples"]),
        "meanFps": sum(row["fps"] for row in rows) / max(1, len(rows)),
        "issues": dict(Counter(issue for row in rows for issue in row["issues"])),
        "flags": dict(Counter(flag for row in rows for flag in row["flags"])),
        "captureWarningSamples": sum(bool(row["captureWarnings"]) for row in rows),
        "incidentSamples": sum(bool(row["incidents"]) for row in rows),
        "incidents": dict(sum((Counter(row["incidents"]) for row in rows), Counter())),
    }
    return eligible, {"summary": summary, "samples": rows}
