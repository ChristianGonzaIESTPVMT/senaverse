"""Render aggregate results. The row-level audit and decisions stay local."""

from audit import LABELS, LSP, NEGATIVE
from split import SPLITS


NAMES = {"random-forest": "Random Forest", "linear-svm": "SVM lineal"}
REASONS = {
    "no-hands": "ausencia de manos o presencia insuficiente",
    "low-confidence": "confianza baja", "low-margin": "margen bajo",
    "negative-class": "clase NEG-001", "insufficient-window": "ventana temporal insuficiente",
}


def table(headers, rows):
    return "\n".join("| " + " | ".join(map(str, row)) + " |"
                     for row in (headers, ["---"] * len(headers), *rows))


def percent(value):
    return f"{value:.1%}"


def latency(value):
    return f"{value['medianMs']:.3f} / {value['p95Ms']:.3f}" if value else "—"


def distribution(value):
    return ", ".join(f"{count} por {REASONS.get(key, key)}" for key, count in value.items()) or "ninguno"


def render_report(evaluation, exported):
    audit, split, test = (evaluation[key] for key in ("audit", "split", "test"))
    selected = evaluation["selected"]
    winner = evaluation["candidates"][selected]
    env = evaluation["environment"]
    presence = evaluation["featureStatus"]
    counts = {name: sum(split["counts"][name].values()) for name in SPLITS}
    configuration = exported["preprocessing"]
    audit_flags = [
        ("Aceptadas", audit["review"].get("accepted", 0)),
        ("Calidad suficiente registrada", audit["reportedSufficient"]),
        ("Revisión de operador explícita", audit["operatorReview"].get("true", 0)),
        ("Campo de revisión de operador ausente", audit["operatorReview"].get("absent", 0)),
        ("Capturas con incidencias", audit["incidentSamples"]),
        ("Incidencias de cantidad de manos", audit["incidents"].get("hand-count-mismatch", 0)),
        ("Capturas con advertencias del Studio", audit["captureWarningSamples"]),
        ("Capturas con cambios de lateralidad en muñecas próximas", audit["flags"].get("cambio-lateralidad-muneca-proxima", 0)),
        ("Capturas con lateralidad de baja confianza", audit["flags"].get("lateralidad-baja-confianza", 0)),
        ("Capturas con la misma lateralidad en ambas manos", audit["flags"].get("misma-lateralidad-en-dos-manos", 0)),
        ("Capturas con fotogramas de geometría duplicada", audit["issues"].get("landmarks-de-fotogramas-duplicados", 0)),
        ("Capturas con secuencia duplicada exacta", audit["issues"].get("secuencia-duplicada-exacta", 0)),
        ("Capturas con posible secuencia duplicada o solapada", audit["issues"].get("posible-secuencia-duplicada-o-solapada", 0)),
    ]
    paragraphs = [
        "# SeñaVerse · Resultados del Hito 3",
        (f"**Modelo experimental recomendado** — {NAMES[selected]}, {configuration['steps']} pasos temporales. "
         f"La prueba final incluyó **{test['withRejection']['count']}** grabaciones. Con rechazo activo obtuvo "
         f"**{percent(test['withRejection']['accuracy'])}** de exactitud y **{percent(test['withRejection']['f1Macro'])}** de F1 macro."),
        "## Auditoría",
        (f"Se leyeron **{audit['samples']} capturas** y **{audit['frames']} fotogramas**. "
         f"La frecuencia media calculada fue de **{audit['meanFps']:.2f} FPS**. "
         f"Participantes con capturas elegibles **{audit['participants']}**. "
         f"Entraron en la división **{audit['eligible']}** capturas y se excluyeron **{audit['excluded']}** en auditoría."),
        table(("Comprobación", "Resultado"), audit_flags),
    ]
    if audit["issues"]:
        paragraphs.append(table(("Motivo de exclusión (puede coexistir con otros)", "Capturas"), sorted(audit["issues"].items())))
    paragraphs.extend([
        ("Política de revisión explícita activa." if evaluation["requireOperatorReview"] else
         "La política experimental admite capturas técnicamente aceptadas con el campo de revisión de operador ausente. "
         "Los casos quedan señalados en auditoría. La validación lingüística del catálogo sigue pendiente."),
        "El detalle por captura y los motivos vinculados a grabaciones se guardan localmente en `ml/reports/local/`.",
        "## División y preprocesamiento",
        (f"Estrategia `{split['strategy']}` con semilla `{split['seed']}`. "
         f"Entrenamiento **{counts['train']}**, validación **{counts['validation']}**, prueba **{counts['test']}**."),
        table(("Etiqueta", "Capturas auditadas", "Entrenamiento", "Validación", "Prueba"), [
            (f"{label} · {name}", audit["byLabel"].get(label, 0), *(split["counts"][part].get(label, 0) for part in SPLITS))
            for label, name in LABELS.items()
        ]),
    ])
    if split["strategy"] == "class-chronological-blocks" and split["minPositiveBoundaryGapSeconds"] is not None:
        paragraphs.append(
            "Se usaron bloques cronológicos por seña, con cortes cerca de 60/20/20 y preferencia por pausas entre bloques. "
            f"La separación mínima observada entre bloques de la misma seña fue de {split['minPositiveBoundaryGapSeconds']:.2f} s "
            "cuando compartían participante. Pueden persistir efectos de la misma persona, sesión y equipo.")
    if split["counts"]["test"].get(NEGATIVE, 0) and not split["counts"]["train"].get(NEGATIVE, 0):
        paragraphs.append(
            "Las capturas negativas se reservaron para la prueba. Esta corrida evalúa el rechazo de un clasificador "
            "entrenado en las diez señas, con umbrales ajustados sobre la validación de esas señas.")
    paragraphs.extend([
        (f"Se compararon 24 y 32 pasos en ventanas fijas de **{configuration['windowMs']} ms**. "
         "Durante el procesamiento de capturas delimitadas se elige la ventana de mayor actividad entre las candidatas. "
         "El orden de manos usa posición y continuidad de la muñeca con un peso leve para la lateralidad. "
         "Se interpola entre timestamps reales para una mano observada en ambos extremos de un intervalo válido. "
         "Las máscaras representan manos ausentes e intervalos largos."),
        ("El vector combina postura centrada en muñeca y escalada por palma, ángulos, distancias, orientación, "
         "trayectoria y velocidad de muñecas, variación de escala y separación entre manos. Se corrigen las coordenadas "
         "por la relación de aspecto de la imagen procesada. Los valores predictivos proceden de la geometría y del tiempo "
         "relativo dentro de la ventana fija."),
        f"Con los pasos del modelo recomendado, **{winner['trainFitCount']}** ventanas alimentaron el ajuste. "
        "Las capturas con ventana inutilizable conservan su división y cuentan como rechazo al evaluar.",
        table(("División", "Ventanas utilizables", "Sin ventana o sin manos"), [
            (name, presence[name][str(configuration["steps"])].get("", 0),
             counts[name] - presence[name][str(configuration["steps"])].get("", 0)) for name in SPLITS
        ]),
        "## Comparación con validación",
        ("La selección usa F1 macro de las diez señas en validación con clasificación cerrada. "
         f"A una distancia de hasta {100 * evaluation['practicalTieF1']:.0f} punto porcentual del máximo, "
         "se prefiere el menor tamaño comprimido."),
        table(("Modelo", "Pasos", "Exactitud ajuste", "F1 ajuste", "Exactitud validación", "F1 validación",
               "F1 con rechazo en validación", "JSON bruto / gzip (KiB)", "Python p50/p95 (ms)", "Node p50/p95 (ms)"), [
            (NAMES[kind], candidate["steps"], percent(candidate["train"]["closed"]["accuracy"]),
             percent(candidate["train"]["closed"]["knownF1Macro"]),
             percent(candidate["validation"]["closed"]["accuracy"]), percent(candidate["validationKnownF1Macro"]),
             percent(candidate["validation"]["withRejection"]["knownF1Macro"]),
             f"{candidate['size']['bytes'] / 1024:.1f} / {candidate['size']['gzipBytes'] / 1024:.1f}",
             latency(candidate["nativeLatency"]), latency(candidate["web"]["nodeClassifierLatency"]))
            for kind, candidate in evaluation["candidates"].items()
        ]),
        ("Los F1 de ajuste y validación de la tabla usan las diez señas. Los tiempos miden el clasificador con entradas "
         "de validación y calentamiento previo. El tamaño por candidato incluye parámetros y configuración."),
        "### Configuraciones evaluadas",
        table(("Modelo", "Pasos", "Parámetros", "F1 macro de validación (diez señas)"), [
            (NAMES[item["kind"]], item["steps"],
             ", ".join(f"{key}={value}" for key, value in item["hyperparameters"].items()),
             percent(item["validationKnownF1Macro"])) for item in evaluation["trials"]
        ]),
    ])

    deltas = {kind: 100 * (item["train"]["closed"]["knownF1Macro"] - item["validationKnownF1Macro"])
              for kind, item in evaluation["candidates"].items()}
    top = max(item["validationKnownF1Macro"] for item in evaluation["candidates"].values())
    rationale = "obtuvo el mayor F1 macro de validación" if winner["validationKnownF1Macro"] == top else (
        "tuvo el menor tamaño comprimido dentro del margen de F1 establecido")
    threshold = winner["thresholds"]
    paragraphs.extend([
        (f"Se recomienda **{NAMES[selected]}** porque {rationale}. La diferencia entre F1 de ajuste y validación fue de "
         + " y ".join(f"{delta:+.1f} puntos para {NAMES[kind]}" for kind, delta in deltas.items())
         + ". Las brechas positivas indican posible sobreajuste. Resultados cercanos entre bloques pueden reflejar similitud entre capturas. "
         "Se pospuso la CNN 1D por el volumen y la diversidad del dataset."),
        (f"Umbrales experimentales del modelo recomendado de **{threshold['confidence']:.2f}** para confianza y "
         f"**{threshold['margin']:.2f}** para margen. La búsqueda en validación conserva al menos el 95 % de los aciertos previos "
         "en las señas y busca reducir falsas aceptaciones si hay negativos de validación. El rechazo considera ausencia de manos, "
         "ventanas insuficientes, umbrales y NEG-001 cuando esa clase está entrenada."),
        "## Prueba final",
        ("La prueba final usa el modelo seleccionado y grabaciones completas reservadas. Con rechazo activo el promedio "
         "macro incluye las etiquetas con soporte. La clasificación cerrada abarca las ventanas evaluables de clases entrenadas."),
        table(("Evaluación", "Capturas", "Exactitud", "Precisión macro", "Recall macro", "F1 macro"), [
            (caption, item["count"], *(percent(item[key]) for key in ("accuracy", "precisionMacro", "recallMacro", "f1Macro")))
            for caption, item in (("Clasificación cerrada", test["closed"]), ("Clasificación con rechazo", test["withRejection"])) if item
        ]),
        table(("Etiqueta", "Soporte", "Precisión", "Recall", "F1"), [
            (f"{label} · {LABELS[label]}", value["support"], percent(value["precision"]), percent(value["recall"]), percent(value["f1"]))
            for label, value in test["withRejection"]["byLabel"].items()
        ]),
        "### Matriz de confusión con rechazo",
        "Filas de referencia, columnas de predicción. `NEG` incluye las decisiones de rechazo.",
    ])
    confusion = test["withRejection"]["confusion"]
    short_labels = [label.split("-")[-1] if label in LSP else "NEG" for label in confusion["labels"]]
    paragraphs.append(table(["Real / pred.", *short_labels], [
        (label, *row) for label, row in zip(short_labels, confusion["matrix"], strict=True)
    ]))
    errors = [(f"{truth} → {prediction}", count)
              for truth, row in zip(confusion["labels"], confusion["matrix"], strict=True)
              for prediction, count in zip(confusion["labels"], row, strict=True) if truth != prediction and count]
    paragraphs.extend([
        "### Errores y negativos",
        table(("Etiqueta real → predicción", "Capturas"), sorted(errors, key=lambda item: (-item[1], item[0])))
        if errors else "Todas las decisiones coincidieron con su etiqueta de referencia.",
        (f"Se aceptaron falsamente **{test['negative']['falseAccepts']}/{test['negative']['count']}** negativos. "
         f"Rechazos de negativos: {distribution(test['negative']['rejectedBy'])}. "
         f"Rechazos totales: {distribution(test['rejections'])}. "
         "La variedad y el tamaño de la muestra negativa limitan la estimación de rechazo fuera del catálogo."),
    ])
    for first, second in (("LSP-001", "LSP-009"), ("LSP-008", "LSP-010")):
        a, b = confusion["labels"].index(first), confusion["labels"].index(second)
        direct, reverse = confusion["matrix"][a][b], confusion["matrix"][b][a]
        paragraphs.append(f"Entre {LABELS[first]} y {LABELS[second]} hubo {direct} confusiones directas "
                          f"de {LABELS[first]} a {LABELS[second]} y {reverse} en sentido inverso.")
    web, model_size = exported["web"], exported["size"]
    parity = web["parity"]
    paragraphs.extend([
        "## Exportación y latencia",
        (f"Modelo JSON `{exported['artifact']}`, versión `{exported['modelVersion']}`. "
         f"Entrada de **{exported['inputDimensions']}** características y salida de **{exported['outputDimensions']}** puntuaciones. "
         f"El JSON ocupa **{model_size['bytes']:,} bytes** y **{model_size['gzipBytes']:,} bytes** con gzip. "
         "El paquete incluye parámetros, etiquetas, detector de origen, preprocesamiento, umbrales, evaluación agregada y limitaciones."),
        (f"En la prueba final coincidieron **{parity['matchingDecisions']}/{parity['recordings']}** decisiones y motivos entre "
         f"scikit-learn y JavaScript, con {parity['scored']} capturas puntuadas. Error absoluto máximo "
         f"**{parity['maxAbsoluteScoreError']:.3g}** con tolerancia **{parity['absoluteTolerance']:.1g}**."),
        table(("Medición local", "p50 / p95 (ms)"), [
            ("Clasificador JavaScript en Node, un vector de prueba", latency(web["nodeClassifierLatency"])),
            ("Preprocesamiento de una ventana final y clasificación en Node", latency(web.get("nodeTrailingWindowLatency"))),
        ]),
        (f"Entorno de medición {env['system']}, {env['cpu'] or 'CPU local'}, Python {env['python']}, NumPy {env['numpy']}, "
         f"SciPy {env['scipy']}, scikit-learn {env['scikitLearn']} y Node {env['node']}. "
         "La latencia registra el cómputo con entradas ya detectadas. La ventana de 1,35 s corresponde al contexto de cada decisión."),
    ])
    if exported["browser"]:
        browser = exported["browser"]
        paragraphs.append(
            f"Se comprobó el JSON local en **{browser['browser']}** con {browser['syntheticCases']} secuencias sintéticas "
            f"y error máximo de puntuación frente a Node de {browser['maxAbsoluteScoreError']:.3g}.")
    paragraphs.extend([
        "## Validaciones pendientes",
        ("Quedan pendientes participantes y sesiones independientes, gestos desconocidos más variados, el efecto de la lateralidad, "
         "reconocimiento en cámara continua y latencia en dispositivos representativos. La identidad y la ejecución de las señas "
         "requieren revisión lingüística."),
        "Consulta el protocolo y los comandos de reproducción en [ml/README.md](../README.md).",
    ])
    return "\n\n".join(paragraphs) + "\n"
