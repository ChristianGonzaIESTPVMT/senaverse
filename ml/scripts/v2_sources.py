"""Read bounded Dataset Studio blocks and merge recording identities before V2 auditing."""

import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

from audit import date, index_by_id, validate_document


def read_sources(paths):
    if isinstance(paths, (str, Path)):
        paths = [Path(paths)]
    if not paths:
        raise ValueError("Indica uno o más archivos con --dataset.")
    documents, fingerprints = [], set()
    batches = defaultdict(dict)
    for path in paths:
        raw = path.read_bytes()
        fingerprint = hashlib.sha256(raw).hexdigest()
        if fingerprint in fingerprints:
            continue
        fingerprints.add(fingerprint)
        data = json.loads(raw)
        if not isinstance(data, dict) or "format" not in data:
            documents.append(validate_document(data))
            continue
        batch = data.get("batchId")
        index, count, total = (data.get(key) for key in ("index", "count", "sampleCount"))
        payload = data.get("payload")
        if (data["format"] != "senaverse-block-v1" or len(raw) > 100 * 1024 * 1024
                or not isinstance(batch, str) or not re.fullmatch(r"[a-f0-9-]{36}", batch)
                or not all(type(n) is int for n in (index, count, total))
                or not 1 <= index <= count <= total <= 20000 or not isinstance(payload, str)
                or hashlib.sha256(payload.encode("utf-8")).hexdigest() != data.get("sha256")):
            raise ValueError(f"Fallo de integridad en el bloque {path.name}.")
        document = validate_document(json.loads(payload))
        if not date(document.get("exportedAt")):
            raise ValueError(f"Fecha inválida en el bloque {path.name}.")
        part = (count, total, data["sha256"], document)
        previous = batches[batch].get(index)
        if previous and previous[:3] != part[:3]:
            raise ValueError(f"Conflicto en el bloque {index} del lote {batch}.")
        batches[batch][index] = part
    for identifier, parts in batches.items():
        entries = list(parts.values())
        count, total = entries[0][:2]
        records = [row for _, _, _, document in entries for row in document["samples"]]
        if (len(entries) != count or any(part[:2] != (count, total) for part in entries) or len(records) != total
                or len({row.get("sampleId") for row in records if isinstance(row, dict)}) != total):
            raise ValueError(f"Lote incompleto, incompatible o duplicado: {identifier}.")
        documents.extend(part[3] for part in entries)
    source = (next(iter(fingerprints)) if len(fingerprints) == 1
              else hashlib.sha256("\n".join(sorted(fingerprints)).encode("ascii")).hexdigest())
    return merge_documents(documents), source


def merge_documents(documents):
    if not documents or any("exportedAt" in doc and not date(doc["exportedAt"]) for doc in documents):
        raise ValueError("Fecha de exportación inválida.")
    documents.sort(key=lambda doc: date(doc["exportedAt"]).timestamp() if "exportedAt" in doc else float("-inf"))
    first, latest = documents[0], documents[-1]
    participants, signs, samples, repetitions = {}, {}, {}, {}
    for document in documents:
        if any(document.get(key) != first.get(key) for key in
               ("datasetId", "createdAt", "schemaVersion", "captureConfiguration", "mediaPipeModel")):
            raise ValueError("Los archivos pertenecen a datasets distintos o usan otra configuración.")
        for identifier, person in index_by_id(document["participants"], "participantes").items():
            previous = participants.get(identifier)
            if previous:
                if (person.get("createdAt") != previous.get("createdAt")
                        or (person.get("partition") and previous.get("partition") and person["partition"] != previous["partition"])):
                    raise ValueError(f"Conflicto de identidad o partición para {identifier}.")
                old_consent, new_consent = date(previous.get("consentedAt")), date(person.get("consentedAt"))
                newest = person if new_consent and (not old_consent or new_consent > old_consent) else previous
                partition = previous.get("partition") or person.get("partition")
                person = {**newest, **({"partition": partition} if partition else {})}
            participants[identifier] = person
        for identifier, sign in index_by_id(document["signs"], "etiquetas").items():
            previous = signs.get(identifier)
            if previous and previous[0] == date(document.get("exportedAt")) and previous[1] != sign:
                raise ValueError(f"Catálogo incompatible para {identifier}.")
            signs[identifier] = (date(document.get("exportedAt")), sign)
        for sample in document["samples"]:
            identifier = sample.get("sampleId") if isinstance(sample, dict) else None
            if not isinstance(identifier, str) or not identifier:
                raise ValueError("Toma sin sampleId válido.")
            key = tuple(sample.get(field) for field in ("participantId", "labelId", "repetition"))
            if not (isinstance(key[0], str) and isinstance(key[1], str) and type(key[2]) is int):
                raise ValueError(f"Referencias inválidas para {identifier}.")
            if identifier in samples:
                previous = samples[identifier]
                if json.dumps(previous, sort_keys=True) != json.dumps(sample, sort_keys=True):
                    raise ValueError(f"Conflicto de contenido para sampleId {identifier}.")
            if repetitions.setdefault(key, identifier) != identifier:
                raise ValueError(f"Conflicto de repetición {key}.")
            samples[identifier] = sample
    ordered = sorted(samples.values(), key=lambda row: (date(row.get("recordedAt")).timestamp()
                     if date(row.get("recordedAt")) else float("inf"), row["sampleId"]))
    return {**latest, "participants": list(participants.values()), "signs": [sign for _, sign in signs.values()],
            "samples": ordered, "collectedAt": ordered[0].get("recordedAt") if ordered else None}
