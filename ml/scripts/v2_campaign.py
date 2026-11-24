"""Validate guided recordings and keep participants together across sessions."""

from collections import Counter

from audit import EXPECTED, LABELS, NEGATIVE

PARTITIONS = ("train", "validation", "test")
ONE_HAND = {"index-still", "index-straight", "partial-turn", "pinch-still", "pinch-wrong-direction"}
TWO_HANDS = {"mucho-like", "con-like"}
WITH_HANDS = {"number-like", "transition", "unknown-gesture"}


def participant_partitions(people, historical, explicit):
    roles = {}
    for person in people:
        role = person.get("partition")
        if role is not None:
            if role not in PARTITIONS:
                raise ValueError(f"Partición inválida para {person['id']}.")
            roles[person["id"]] = role
    known = {person["id"] for person in people}
    for partition, identifiers in explicit.items():
        for identifier in identifiers:
            if identifier not in known:
                raise ValueError(f"Participante desconocido: {identifier}.")
            if identifier in roles and roles[identifier] != partition:
                raise ValueError(f"{identifier} aparece en más de una partición o contradice su ficha.")
            roles[identifier] = partition
    for person in historical & known:
        if roles.get(person, "train") != "train":
            raise ValueError(f"{person} es histórico y queda reservado para entrenamiento.")
        roles[person] = "train"
    return roles


def campaign_issues(sample, row):
    metadata, label = sample["captureMetadata"], sample["labelId"]
    campaign = metadata.get("campaign")
    if not isinstance(campaign, dict):
        return ["guia-de-captura-v2-ausente-o-invalida"]
    session, slot_id, hand, subtype = (campaign.get(key) for key in ("session", "slotId", "hand", "negativeSubtype"))
    if (set(campaign) - {"session", "slotId", "hand", "negativeSubtype", "notes"} or type(session) is not int
            or session not in (1, 2) or not isinstance(slot_id, str)
            or ("notes" in campaign and (not isinstance(campaign["notes"], str) or len(campaign["notes"]) > 500))
            or metadata.get("collectionProtocol") != "hito-4.3" or metadata.get("qualityPolicyVersion") != 2):
        return ["metadatos-de-guia-v2-incompatibles"]
    hands = metadata["labelSnapshot"]["expectedHands"]
    issues = []
    if any(count > hands for count in row["handCounts"]):
        issues.append("manos-adicionales-en-guia-v2")
    if label == NEGATIVE:
        negative_slots = {f"{session}-neg-{i}": 0 if i == 6 else 1 if i <= (3 if session == 1 else 2) else 2
                          for i in range(1, 7)}
        allowed = ({"no-hands"} if hands == 0 else (ONE_HAND if hands == 1 else TWO_HANDS) | WITH_HANDS)
        if (negative_slots.get(slot_id) != hands or not isinstance(subtype, str) or subtype not in allowed
                or sample["durationMs"] != 2500):
            issues.append("subtipo-duracion-o-casilla-negativa-incompatible")
    else:
        number = int(label.split("-")[-1])
        expected_duration = 2000 if number <= 5 else 3000 if number in (8, 10) else 2500
        if slot_id != f"{session}-lsp-{number}" or "negativeSubtype" in campaign or sample["durationMs"] != expected_duration:
            issues.append("duracion-o-casilla-positiva-incompatible")
        if number <= 5 and hand != ("right" if (number - 1 + session) % 2 else "left"):
            issues.append("mano-declarada-distinta-de-la-casilla-estatica")
        if hands != EXPECTED[label]:
            issues.append("cantidad-de-manos-incompatible")
    if hand not in (("none",) if hands == 0 else ("both",) if hands == 2 else ("left", "right")):
        issues.append("mano-declarada-incompatible")
    return issues


def coverage(split, roles, strict):
    by_label, negatives, subtypes, people = {}, {}, {}, {}
    missing, missing_hands, missing_people = {}, {}, {}
    slots_by_person = {}
    for partition, samples in split.items():
        by_label[partition] = dict(Counter(sample["labelId"] for sample in samples))
        negatives[partition] = dict(Counter(max(frame["handCount"] for frame in sample["frames"])
                                            for sample in samples if sample["labelId"] == NEGATIVE))
        subtypes[partition] = dict(Counter(sample["captureMetadata"].get("campaign", {}).get("negativeSubtype", "sin-subtipo")
                                           for sample in samples if sample["labelId"] == NEGATIVE))
        people[partition] = dict(Counter(sample["participantId"] for sample in samples))
        for sample in samples:
            campaign = sample["captureMetadata"].get("campaign")
            if campaign and "slotId" in campaign:
                slots_by_person.setdefault(sample["participantId"], set()).add(campaign["slotId"])
        absent = sorted(set(LABELS) - by_label[partition].keys())
        if absent:
            missing[partition] = absent
        if strict and set(negatives[partition]) != {0, 1, 2}:
            missing_hands[partition] = sorted({0, 1, 2} - negatives[partition].keys())
        if strict and partition in ("validation", "test") and len(people[partition]) < 2:
            missing_people[partition] = 2 - len(people[partition])
    return {"counts": by_label, "negativeByMaxHands": negatives, "negativeBySubtype": subtypes,
            "eligibleByParticipant": people, "participantPartitions": roles, "missing": missing,
            "missingNegativeHandCounts": missing_hands, "missingParticipants": missing_people,
            "eligibleGuideSlots": {person: len(slots) for person, slots in slots_by_person.items()}}
