"""Split whole recordings before computing any features or fitting a scaler."""

from collections import Counter, defaultdict
from itertools import pairwise
from random import Random

from audit import LSP, NEGATIVE, date


SPLITS = ("train", "validation", "test")
RATIOS = (.60, .20, .20)
SESSION_GAP_SECONDS = 30 * 60
NEGATIVE_GAP_SECONDS = 120
PREFERRED_BOUNDARY_SECONDS = 20


def start(sample):
    return date(sample["recordedAt"]).timestamp()


def gap(earlier, later):
    return start(later) - start(earlier) - earlier["durationMs"] / 1000


def chronological(samples):
    return sorted(samples, key=lambda sample: (sample["participantId"], start(sample), sample["sampleId"]))


def bursts(samples, seconds):
    groups = []
    for sample in chronological(samples):
        if not groups or sample["participantId"] != groups[-1][-1]["participantId"] or gap(groups[-1][-1], sample) >= seconds:
            groups.append([])
        groups[-1].append(sample)
    return groups


def disjoint_groups(groups, seed):
    """Find a reproducible, label-balanced split among indivisible capture groups."""
    if len(groups) < 3:
        return None
    labels = [Counter(sample["labelId"] for sample in group) for group in groups]
    totals = sum(labels, Counter())
    if any(sum(label in counts for counts in labels) < 3 for label in LSP):
        return None
    negative_groups = sum(NEGATIVE in counts for counts in labels)
    rng = Random(seed)
    permutations = list(range(len(groups)))
    train_end = max(1, min(len(groups) - 2, round(len(groups) * RATIOS[0])))
    valid_end = max(train_end + 1, min(len(groups) - 1, round(len(groups) * sum(RATIOS[:2]))))
    best = None
    for _ in range(768):
        rng.shuffle(permutations)
        partitions = (permutations[:train_end], permutations[train_end:valid_end], permutations[valid_end:])
        counts = [sum((labels[index] for index in part), Counter()) for part in partitions]
        if any(any(label not in count for label in LSP) for count in counts):
            continue
        if negative_groups and NEGATIVE not in counts[2]:
            continue
        negative_penalty = (negative_groups >= 2 and NEGATIVE not in counts[0]) + (negative_groups >= 3 and NEGATIVE not in counts[1])
        deviation = sum(abs(count[label] / totals[label] - ratio)
                        for count, ratio in zip(counts, RATIOS) for label in LSP)
        score = (negative_penalty, deviation)
        if best is None or score < best[0]:
            best = (score, partitions)
    if best is None:
        return None
    return {split: [groups[index] for index in part] for split, part in zip(SPLITS, best[1])}


def positive_blocks(samples):
    ordered = chronological(samples)
    count = len(ordered)
    if count < 3:
        raise ValueError(f"{ordered[0]['labelId']} requiere tres capturas distintas como mínimo para dividir el piloto.")
    gaps = [gap(a, b) if a["participantId"] == b["participantId"] else float("inf")
            for a, b in pairwise(ordered)]

    def cost(cuts):
        first, second = cuts
        sizes = (first, second - first, count - second)
        imbalance = sum(abs(size - count * ratio) for size, ratio in zip(sizes, RATIOS))
        separation = sum(max(0, PREFERRED_BOUNDARY_SECONDS - gaps[cut - 1]) for cut in cuts)
        return imbalance + separation / 10, imbalance, first, second

    # Limit the search to a band around the target boundaries, including the nearest valid split.
    radius = max(2, round(count * .08))
    target_a, target_b = round(count * RATIOS[0]), round(count * sum(RATIOS[:2]))
    lower = range(max(1, target_a - radius), min(count - 2, target_a + radius) + 1)
    upper = range(max(2, target_b - radius), min(count - 1, target_b + radius) + 1)
    first, second = min(((a, b) for a in lower for b in upper if a < b), key=cost)
    finite_gaps = [gaps[cut - 1] for cut in (first, second) if gaps[cut - 1] != float("inf")]
    return (ordered[:first], ordered[first:second], ordered[second:]), finite_gaps


def negative_blocks(samples):
    groups = bursts(samples, NEGATIVE_GAP_SECONDS)
    if len(groups) <= 1:
        return [], [], groups
    if len(groups) == 2:
        return groups[:1], [], groups[1:]
    prefix = [0]
    for group in groups:
        prefix.append(prefix[-1] + len(group))
    first = min(range(1, len(groups) - 1), key=lambda i: abs(prefix[i] - prefix[-1] * RATIOS[0]))
    second = min(range(first + 1, len(groups)), key=lambda i: abs(prefix[i] - prefix[-1] * sum(RATIOS[:2])))
    return groups[:first], groups[first:second], groups[second:]


def split_recordings(samples, seed, grouping="auto"):
    by_person = defaultdict(list)
    by_label = defaultdict(list)
    for sample in chronological(samples):
        by_person[sample["participantId"]].append(sample)
        by_label[sample["labelId"]].append(sample)
    missing = sorted(set(LSP) - by_label.keys())
    if missing:
        raise ValueError("Faltan muestras elegibles para " + ", ".join(missing))

    groups = None
    mode = grouping
    if grouping in ("auto", "participant"):
        groups = disjoint_groups(list(by_person.values()), seed)
        if groups:
            mode = "participant"
        elif grouping == "participant":
            raise ValueError("Los grupos por participante no permiten cubrir el catálogo en las tres divisiones.")
    if groups is None and grouping in ("auto", "session"):
        groups = disjoint_groups(bursts(samples, SESSION_GAP_SECONDS), seed)
        if groups:
            mode = "session-by-time-gap"
        elif grouping == "session":
            raise ValueError("Las sesiones inferidas por pausas no cubren el catálogo en las tres divisiones.")

    boundary_gaps = []
    if groups is None:
        mode = "class-chronological-blocks"
        groups = {split: [] for split in SPLITS}
        for label in LSP:
            blocks, gaps = positive_blocks(by_label[label])
            boundary_gaps.extend(gaps)
            for split, block in zip(SPLITS, blocks):
                groups[split].append(block)
        for split, blocks in zip(SPLITS, negative_blocks(by_label[NEGATIVE])):
            groups[split].extend(blocks)

    partitions = {split: [sample for group in groups[split] for sample in group] for split in SPLITS}
    ids = [sample["sampleId"] for part in partitions.values() for sample in part]
    if len(ids) != len(samples) or len(set(ids)) != len(samples):
        raise ValueError("La división repetiría o perdería grabaciones.")
    return partitions, {
        "strategy": mode, "targetRatios": dict(zip(SPLITS, RATIOS)), "seed": seed,
        "sessionGapSeconds": SESSION_GAP_SECONDS, "negativeGapSeconds": NEGATIVE_GAP_SECONDS,
        "groups": {split: len(groups[split]) for split in SPLITS},
        "counts": {split: dict(Counter(sample["labelId"] for sample in part)) for split, part in partitions.items()},
        "minPositiveBoundaryGapSeconds": round(min(boundary_gaps), 2) if boundary_gaps else None,
    }
