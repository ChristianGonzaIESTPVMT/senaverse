"""Fit, select, measure and serialize the two classical model families."""

import gzip
import hashlib
import json
from collections import Counter
from itertools import product
from time import perf_counter

import numpy as np
from scipy.special import softmax
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, log_loss, precision_recall_fscore_support
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC

from audit import LABELS, LSP, NEGATIVE


FORMAT = "senaverse-landmark-classifier-v1"
SCORE_TOLERANCE = 2e-6
PRACTICAL_TIE_F1 = .01
LIMITATIONS = [
    "Modelo piloto. La aceptación de Dataset Studio es técnica y el catálogo requiere revisión lingüística.",
    "La generalización a otra persona, cámara o sesión requiere una evaluación independiente.",
    "La estimación del rechazo requiere más familias de gestos desconocidos y bloques de captura independientes.",
    "La segmentación y las activaciones en cámara continua requieren mediciones prospectivas.",
]


def json_bytes(document):
    return json.dumps(document, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode("utf-8")


def training_candidates(seed):
    for depth, leaf in product((6, 10), (1, 2)):
        parameters = {"n_estimators": 64, "max_depth": depth, "min_samples_leaf": leaf, "class_weight": "balanced"}
        yield "random-forest", parameters, RandomForestClassifier(**parameters, random_state=seed, n_jobs=1)
    for c in (.01, .1, 1.0):
        parameters = {"C": c, "class_weight": "balanced"}
        estimator = make_pipeline(StandardScaler(), LinearSVC(**parameters, dual="auto", random_state=seed, max_iter=10000))
        yield "linear-svm", parameters, estimator


def observed_labels(rows):
    return np.array([row["labelId"] for row in rows])


def closed_scores(estimator, kind, features, temperature=1.0):
    if kind == "random-forest":
        return estimator.predict_proba(features)
    return softmax(estimator.decision_function(features) / temperature, axis=1)


def eligible_features(rows):
    return np.array([row["reason"] is None for row in rows], dtype=bool)


def metrics(truth, predicted):
    truth = np.asarray(truth)
    predicted = np.asarray(predicted)
    labels = list(LABELS)
    precision, recall, f1, support = precision_recall_fscore_support(
        truth, predicted, labels=labels, zero_division=0)
    per_label = {label: {
        "precision": float(precision[i]), "recall": float(recall[i]), "f1": float(f1[i]), "support": int(support[i]),
    } for i, label in enumerate(labels)}
    present = support > 0
    return {
        "count": len(truth),
        "accuracy": float(accuracy_score(truth, predicted)),
        "precisionMacro": float(precision[present].mean()),
        "recallMacro": float(recall[present].mean()),
        "f1Macro": float(f1[present].mean()),
        "knownF1Macro": float(f1_score(truth, predicted, labels=list(LSP), average="macro", zero_division=0)),
        "byLabel": per_label,
        "confusion": {"labels": labels, "matrix": confusion_matrix(truth, predicted, labels=labels).tolist()},
    }


def rank(scores):
    order = np.argsort(-scores, axis=1, kind="stable")
    top = np.take_along_axis(scores, order[:, :2], axis=1)
    return order[:, 0], top[:, 0], top[:, 0] - top[:, 1]


def temperature_for(estimator, features, truth):
    # Use only the validation split. The resulting scores are experimental confidence estimates.
    return min((.15, .25, .4, .6, .85, 1.0, 1.5), key=lambda temperature: log_loss(
        truth, closed_scores(estimator, "linear-svm", features, temperature), labels=estimator.classes_))


def select_thresholds(scores, truth, classes):
    indices, confidence, margin = rank(scores)
    closed = classes[indices]
    negative = truth == NEGATIVE
    correctly_known = (closed == truth) & ~negative
    minimum_kept = np.ceil(correctly_known.sum() * .95)
    options = []
    for confidence_threshold, margin_threshold in product(
        (0, .25, .35, .45, .55, .65, .75, .85, .90), (0, .05, .10, .15, .20, .30, .40)
    ):
        keep = (confidence >= confidence_threshold) & (margin >= margin_threshold) & (closed != NEGATIVE)
        if (keep & correctly_known).sum() < minimum_kept:
            continue
        output = np.where(keep, closed, NEGATIVE)
        false_accepts = int((keep & negative).sum())
        f1 = f1_score(truth, output, labels=list(LSP), average="macro", zero_division=0)
        options.append(((false_accepts, -f1, -(confidence_threshold + margin_threshold), -margin_threshold),
                        {"confidence": confidence_threshold, "margin": margin_threshold}))
    return min(options, key=lambda option: option[0])[1]


def quantize(values):
    def float32(value):
        # Nine significant digits suffice to round-trip a float32.
        return float(f"{np.float32(value):.9g}")
    array = np.asarray(values)
    if array.ndim == 2:
        return [[float32(value) for value in row] for row in array]
    return [float32(value) for value in array]


def forest_parameters(estimator):
    trees = []
    for component in estimator.estimators_:
        tree = component.tree_
        nodes = []
        for i, feature in enumerate(tree.feature):
            if feature < 0:
                values = tree.value[i, 0]
                nodes.append([-1, *quantize(values / values.sum())])
            else:
                nodes.append([int(feature), float(tree.threshold[i]), int(tree.children_left[i]), int(tree.children_right[i])])
        trees.append(nodes)
    return {"trees": trees}


def make_bundle(candidate, detector):
    estimator = candidate["estimator"]
    kind = candidate["kind"]
    if kind == "linear-svm":
        scaler, svm = estimator.steps[0][1], estimator.steps[1][1]
        parameters = {
            "center": quantize(scaler.mean_), "scale": quantize(scaler.scale_),
            "weights": quantize(svm.coef_), "bias": quantize(svm.intercept_),
            "temperature": candidate["temperature"],
        }
    else:
        parameters = forest_parameters(estimator)
    bundle = {
        "format": FORMAT, "kind": kind,
        "detector": detector,
        "preprocessing": candidate["config"],
        "normalization": {"landmarks": "wrist-centered-scaled-by-palm-with-processing-aspect",
                          "features": "standard-scaler-train-only" if kind == "linear-svm" else "identity"},
        "inputDimensions": int(estimator.n_features_in_),
        "outputDimensions": len(estimator.classes_),
        "labels": [{"id": label, "name": LABELS[label]} for label in estimator.classes_],
        "negativeLabelId": NEGATIVE,
        "thresholds": candidate["thresholds"],
        "parameters": parameters,
    }
    signature = hashlib.sha256(json_bytes(bundle)).hexdigest()[:12]
    return {**bundle, "modelVersion": f"3.0.0-experimental.1+{signature}"}


def size(document):
    raw = json_bytes(document)
    return {"bytes": len(raw), "gzipBytes": len(gzip.compress(raw, mtime=0))}


def fit_candidates(development, configurations, seed, detector):
    train, validation = development["train"], development["validation"]
    train_y, validation_y = observed_labels(train["rows"]), observed_labels(validation["rows"])
    finalists, trials = {}, []
    for key, config in configurations.items():
        train_valid = eligible_features(train["rowsBySteps"][key])
        validation_valid = eligible_features(validation["rowsBySteps"][key])
        train_x, fit_y = train["features"][key][train_valid], train_y[train_valid]
        val_x, val_y = validation["features"][key][validation_valid], validation_y[validation_valid]
        if not set(LSP).issubset(fit_y) or not set(LSP).issubset(val_y):
            raise ValueError(f"No hay ventanas usables de todas las señas en entrenamiento y validación con {key} pasos.")
        for kind, parameters, estimator in training_candidates(seed):
            estimator.fit(train_x, fit_y)
            closed = estimator.classes_[closed_scores(estimator, kind, val_x).argmax(axis=1)]
            by_known = f1_score(val_y, closed, labels=list(LSP), average="macro", zero_division=0)
            evaluation = {"kind": kind, "steps": config["steps"], "hyperparameters": parameters, "validationKnownF1Macro": float(by_known)}
            trials.append(evaluation)
            candidate = {
                **evaluation, "estimator": estimator, "config": config,
                "trainFitCount": int(train_valid.sum()), "validationWindowCount": int(validation_valid.sum()),
            }
            prior = finalists.get(kind)
            if prior is None or by_known > prior["validationKnownF1Macro"]:
                finalists[kind] = candidate

    for kind, candidate in finalists.items():
        key = str(candidate["steps"])
        mask = eligible_features(validation["rowsBySteps"][key])
        val_x, val_y = validation["features"][key][mask], validation_y[mask]
        estimator = candidate["estimator"]
        known = np.isin(val_y, estimator.classes_)
        candidate["temperature"] = temperature_for(estimator, val_x[known], val_y[known]) if kind == "linear-svm" else 1.0
        scores = closed_scores(estimator, kind, val_x, candidate["temperature"])
        candidate["thresholds"] = select_thresholds(scores, val_y, estimator.classes_)
        candidate["size"] = size(make_bundle(candidate, detector))

    best = max(candidate["validationKnownF1Macro"] for candidate in finalists.values())
    comparable = [candidate for candidate in finalists.values() if best - candidate["validationKnownF1Macro"] <= PRACTICAL_TIE_F1]
    selected = min(comparable, key=lambda candidate: (
        candidate["size"]["gzipBytes"], -candidate["validationKnownF1Macro"], candidate["kind"]))["kind"]
    return finalists, trials, selected


def predict_rows(candidate, data):
    key = str(candidate["steps"])
    estimator, kind, thresholds = candidate["estimator"], candidate["kind"], candidate["thresholds"]
    rows = data["rowsBySteps"][key]
    ready = eligible_features(rows)
    scores = closed_scores(estimator, kind, data["features"][key][ready], candidate["temperature"]) if any(ready) else np.empty((0, len(estimator.classes_)))
    indices, confidences, margins = rank(scores)
    predictions = []
    score_index = 0
    for row in rows:
        reason = row["reason"]
        if reason is not None:
            predictions.append({"labelId": None, "reason": reason, "scores": []})
            continue
        label = estimator.classes_[indices[score_index]]
        confidence, margin = confidences[score_index], margins[score_index]
        if label == NEGATIVE:
            reason = "negative-class"
        elif confidence < thresholds["confidence"]:
            reason = "low-confidence"
        elif margin < thresholds["margin"]:
            reason = "low-margin"
        predictions.append({
            "labelId": None if reason else label, "reason": reason, "scores": scores[score_index].tolist(),
            "confidence": float(confidence), "margin": float(margin),
        })
        score_index += 1
    return predictions


def measure(candidate, data, predictions):
    truth = observed_labels(data["rows"])
    closed_names = candidate["estimator"].classes_
    scored = np.array([len(item["scores"]) > 0 and actual in closed_names for actual, item in zip(truth, predictions)])
    closed = [closed_names[np.argmax(item["scores"])] for include, item in zip(scored, predictions) if include]
    policy = [item["labelId"] or NEGATIVE for item in predictions]
    negative_results = [item for actual, item in zip(truth, predictions) if actual == NEGATIVE]
    return {
        "closed": metrics(truth[scored], closed) if any(scored) else None,
        "withRejection": metrics(truth, policy),
        "negative": {
            "count": len(negative_results),
            "falseAccepts": sum(item["labelId"] is not None for item in negative_results),
            "acceptedAs": dict(Counter(item["labelId"] for item in negative_results if item["labelId"])),
            "rejectedBy": dict(Counter(item["reason"] for item in negative_results if item["reason"])),
        },
        "rejections": dict(Counter(item["reason"] for item in predictions if item["reason"])),
    }


def native_latency(candidate, data):
    key = str(candidate["steps"])
    rows = data["features"][key][eligible_features(data["rowsBySteps"][key])]
    if not len(rows):
        return None
    elapsed = []
    for i in range(240):
        index = i % len(rows)
        start = perf_counter()
        closed_scores(candidate["estimator"], candidate["kind"], rows[index:index + 1], candidate["temperature"])
        if i >= 40:
            elapsed.append((perf_counter() - start) * 1000)
    return {"medianMs": float(np.median(elapsed)), "p95Ms": float(np.percentile(elapsed, 95)), "iterations": len(elapsed)}


def check_parity(reference, exported):
    if len(reference) != len(exported):
        raise ValueError("La comparación web recibió un número distinto de predicciones.")
    max_error, scored = 0.0, 0
    for original, web in zip(reference, exported):
        if original["labelId"] != web["labelId"] or original["reason"] != web["reason"] or len(original["scores"]) != len(web["scores"]):
            raise ValueError("La predicción o el motivo de rechazo difiere entre scikit-learn y el modelo web.")
        if original["scores"]:
            scored += 1
            difference = np.abs(np.asarray(original["scores"]) - np.asarray(web["scores"]))
            if not np.isfinite(difference).all() or difference.max() > SCORE_TOLERANCE:
                raise ValueError(f"Error numérico del modelo web mayor que {SCORE_TOLERANCE:.1g}.")
            max_error = max(max_error, float(difference.max()))
    return {"recordings": len(reference), "scored": scored, "maxAbsoluteScoreError": max_error,
            "absoluteTolerance": SCORE_TOLERANCE, "matchingDecisions": len(reference)}
