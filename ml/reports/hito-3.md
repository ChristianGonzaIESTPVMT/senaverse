# SeñaVerse · Resultados del Hito 3

**Modelo experimental recomendado** — SVM lineal, 24 pasos temporales. La prueba final incluyó **75** grabaciones. Con rechazo activo obtuvo **93.3%** de exactitud y **92.6%** de F1 macro.

## Auditoría

Se leyeron **355 capturas** y **12546 fotogramas**. La frecuencia media calculada fue de **16.70 FPS**. Participantes con capturas elegibles **1**. Entraron en la división **355** capturas y se excluyeron **0** en auditoría.

| Comprobación | Resultado |
| --- | --- |
| Aceptadas | 355 |
| Calidad suficiente registrada | 355 |
| Revisión de operador explícita | 237 |
| Campo de revisión de operador ausente | 118 |
| Capturas con incidencias | 6 |
| Incidencias de cantidad de manos | 8 |
| Capturas con advertencias del Studio | 0 |
| Capturas con cambios de lateralidad en muñecas próximas | 23 |
| Capturas con lateralidad de baja confianza | 27 |
| Capturas con la misma lateralidad en ambas manos | 5 |
| Capturas con fotogramas de geometría duplicada | 0 |
| Capturas con secuencia duplicada exacta | 0 |
| Capturas con posible secuencia duplicada o solapada | 0 |

La política experimental admite capturas técnicamente aceptadas con el campo de revisión de operador ausente. Los casos quedan señalados en auditoría. La validación lingüística del catálogo sigue pendiente.

El detalle por captura y los motivos vinculados a grabaciones se guardan localmente en `ml/reports/local/`.

## División y preprocesamiento

Estrategia `class-chronological-blocks` con semilla `1729`. Entrenamiento **209**, validación **71**, prueba **75**.

| Etiqueta | Capturas auditadas | Entrenamiento | Validación | Prueba |
| --- | --- | --- | --- | --- |
| LSP-001 · Uno | 41 | 25 | 8 | 8 |
| LSP-002 · Dos | 30 | 18 | 6 | 6 |
| LSP-003 · Tres | 34 | 20 | 7 | 7 |
| LSP-004 · Cuatro | 30 | 18 | 6 | 6 |
| LSP-005 · Cinco | 35 | 21 | 7 | 7 |
| LSP-006 · Sí | 38 | 23 | 8 | 7 |
| LSP-007 · Nada | 39 | 23 | 8 | 8 |
| LSP-008 · Mucho | 37 | 22 | 8 | 7 |
| LSP-009 · Solo | 32 | 19 | 7 | 6 |
| LSP-010 · Con | 32 | 20 | 6 | 6 |
| NEG-001 · Ejemplos negativos | 7 | 0 | 0 | 7 |

Se usaron bloques cronológicos por seña, con cortes cerca de 60/20/20 y preferencia por pausas entre bloques. La separación mínima observada entre bloques de la misma seña fue de 6.09 s cuando compartían participante. Pueden persistir efectos de la misma persona, sesión y equipo.

Las capturas negativas se reservaron para la prueba. Esta corrida evalúa el rechazo de un clasificador entrenado en las diez señas, con umbrales ajustados sobre la validación de esas señas.

Se compararon 24 y 32 pasos en ventanas fijas de **1350 ms**. Durante el procesamiento de capturas delimitadas se elige la ventana de mayor actividad entre las candidatas. El orden de manos usa posición y continuidad de la muñeca con un peso leve para la lateralidad. Se interpola entre timestamps reales para una mano observada en ambos extremos de un intervalo válido. Las máscaras representan manos ausentes e intervalos largos.

El vector combina postura centrada en muñeca y escalada por palma, ángulos, distancias, orientación, trayectoria y velocidad de muñecas, variación de escala y separación entre manos. Se corrigen las coordenadas por la relación de aspecto de la imagen procesada. Los valores predictivos proceden de la geometría y del tiempo relativo dentro de la ventana fija.

Con los pasos del modelo recomendado, **209** ventanas alimentaron el ajuste. Las capturas con ventana inutilizable conservan su división y cuentan como rechazo al evaluar.

| División | Ventanas utilizables | Sin ventana o sin manos |
| --- | --- | --- |
| train | 209 | 0 |
| validation | 71 | 0 |
| test | 75 | 0 |

## Comparación con validación

La selección usa F1 macro de las diez señas en validación con clasificación cerrada. A una distancia de hasta 1 punto porcentual del máximo, se prefiere el menor tamaño comprimido.

| Modelo | Pasos | Exactitud ajuste | F1 ajuste | Exactitud validación | F1 validación | F1 con rechazo en validación | JSON bruto / gzip (KiB) | Python p50/p95 (ms) | Node p50/p95 (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Random Forest | 24 | 100.0% | 100.0% | 98.6% | 98.4% | 98.4% | 73.7 / 16.6 | 2.337 / 3.226 | 0.013 / 0.052 |
| SVM lineal | 24 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 47.9 / 20.4 | 0.115 / 0.208 | 0.023 / 0.059 |

Los F1 de ajuste y validación de la tabla usan las diez señas. Los tiempos miden el clasificador con entradas de validación y calentamiento previo. El tamaño por candidato incluye parámetros y configuración.

### Configuraciones evaluadas

| Modelo | Pasos | Parámetros | F1 macro de validación (diez señas) |
| --- | --- | --- | --- |
| Random Forest | 24 | n_estimators=64, max_depth=6, min_samples_leaf=1, class_weight=balanced | 98.4% |
| Random Forest | 24 | n_estimators=64, max_depth=6, min_samples_leaf=2, class_weight=balanced | 98.4% |
| Random Forest | 24 | n_estimators=64, max_depth=10, min_samples_leaf=1, class_weight=balanced | 98.4% |
| Random Forest | 24 | n_estimators=64, max_depth=10, min_samples_leaf=2, class_weight=balanced | 98.4% |
| SVM lineal | 24 | C=0.01, class_weight=balanced | 100.0% |
| SVM lineal | 24 | C=0.1, class_weight=balanced | 100.0% |
| SVM lineal | 24 | C=1.0, class_weight=balanced | 100.0% |
| Random Forest | 32 | n_estimators=64, max_depth=6, min_samples_leaf=1, class_weight=balanced | 98.4% |
| Random Forest | 32 | n_estimators=64, max_depth=6, min_samples_leaf=2, class_weight=balanced | 98.4% |
| Random Forest | 32 | n_estimators=64, max_depth=10, min_samples_leaf=1, class_weight=balanced | 98.4% |
| Random Forest | 32 | n_estimators=64, max_depth=10, min_samples_leaf=2, class_weight=balanced | 98.4% |
| SVM lineal | 32 | C=0.01, class_weight=balanced | 98.5% |
| SVM lineal | 32 | C=0.1, class_weight=balanced | 100.0% |
| SVM lineal | 32 | C=1.0, class_weight=balanced | 100.0% |

Se recomienda **SVM lineal** porque obtuvo el mayor F1 macro de validación. La diferencia entre F1 de ajuste y validación fue de +1.6 puntos para Random Forest y +0.0 puntos para SVM lineal. Las brechas positivas indican posible sobreajuste. Resultados cercanos entre bloques pueden reflejar similitud entre capturas. Se pospuso la CNN 1D por el volumen y la diversidad del dataset.

Umbrales experimentales del modelo recomendado de **0.75** para confianza y **0.40** para margen. La búsqueda en validación conserva al menos el 95 % de los aciertos previos en las señas y busca reducir falsas aceptaciones si hay negativos de validación. El rechazo considera ausencia de manos, ventanas insuficientes, umbrales y NEG-001 cuando esa clase está entrenada.

## Prueba final

La prueba final usa el modelo seleccionado y grabaciones completas reservadas. Con rechazo activo el promedio macro incluye las etiquetas con soporte. La clasificación cerrada abarca las ventanas evaluables de clases entrenadas.

| Evaluación | Capturas | Exactitud | Precisión macro | Recall macro | F1 macro |
| --- | --- | --- | --- | --- | --- |
| Clasificación cerrada | 68 | 100.0% | 100.0% | 100.0% | 100.0% |
| Clasificación con rechazo | 75 | 93.3% | 93.4% | 93.3% | 92.6% |

| Etiqueta | Soporte | Precisión | Recall | F1 |
| --- | --- | --- | --- | --- |
| LSP-001 · Uno | 8 | 100.0% | 100.0% | 100.0% |
| LSP-002 · Dos | 6 | 100.0% | 100.0% | 100.0% |
| LSP-003 · Tres | 7 | 100.0% | 100.0% | 100.0% |
| LSP-004 · Cuatro | 6 | 100.0% | 100.0% | 100.0% |
| LSP-005 · Cinco | 7 | 100.0% | 100.0% | 100.0% |
| LSP-006 · Sí | 7 | 100.0% | 100.0% | 100.0% |
| LSP-007 · Nada | 8 | 100.0% | 100.0% | 100.0% |
| LSP-008 · Mucho | 7 | 77.8% | 100.0% | 87.5% |
| LSP-009 · Solo | 6 | 100.0% | 83.3% | 90.9% |
| LSP-010 · Con | 6 | 75.0% | 100.0% | 85.7% |
| NEG-001 · Ejemplos negativos | 7 | 75.0% | 42.9% | 54.5% |

### Matriz de confusión con rechazo

Filas de referencia, columnas de predicción. `NEG` incluye las decisiones de rechazo.

| Real / pred. | 001 | 002 | 003 | 004 | 005 | 006 | 007 | 008 | 009 | 010 | NEG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 001 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 002 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 003 | 0 | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 004 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 005 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| 006 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 0 | 0 | 0 |
| 007 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 0 |
| 008 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 0 |
| 009 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 1 |
| 010 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 |
| NEG | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 3 |

### Errores y negativos

| Etiqueta real → predicción | Capturas |
| --- | --- |
| NEG-001 → LSP-008 | 2 |
| NEG-001 → LSP-010 | 2 |
| LSP-009 → NEG-001 | 1 |

Se aceptaron falsamente **4/7** negativos. Rechazos de negativos: 3 por confianza baja. Rechazos totales: 4 por confianza baja. La variedad y el tamaño de la muestra negativa limitan la estimación de rechazo fuera del catálogo.

Entre Uno y Solo hubo 0 confusiones directas de Uno a Solo y 0 en sentido inverso.

Entre Mucho y Con hubo 0 confusiones directas de Mucho a Con y 0 en sentido inverso.

## Exportación y latencia

Modelo JSON `ml/artifacts/hito-3/model.json`, versión `3.0.0-experimental.1+349faaea0427`. Entrada de **286** características y salida de **10** puntuaciones. El JSON ocupa **51,445 bytes** y **21,885 bytes** con gzip. El paquete incluye parámetros, etiquetas, detector de origen, preprocesamiento, umbrales, evaluación agregada y limitaciones.

En la prueba final coincidieron **75/75** decisiones y motivos entre scikit-learn y JavaScript, con 75 capturas puntuadas. Error absoluto máximo **2.2e-07** con tolerancia **2e-06**.

| Medición local | p50 / p95 (ms) |
| --- | --- |
| Clasificador JavaScript en Node, un vector de prueba | 0.023 / 0.081 |
| Preprocesamiento de una ventana final y clasificación en Node | 0.203 / 0.417 |

Entorno de medición Windows AMD64, Intel64 Family 6 Model 151 Stepping 2, GenuineIntel, Python 3.13.17, NumPy 2.3.5, SciPy 1.16.3, scikit-learn 1.7.2 y Node v26.13.1. La latencia registra el cómputo con entradas ya detectadas. La ventana de 1,35 s corresponde al contexto de cada decisión.

Se comprobó el JSON local en **chrome.exe (Chrome/157.0.0.0)** con 4 secuencias sintéticas y error máximo de puntuación frente a Node de 1.73e-18.

## Validaciones pendientes

Quedan pendientes participantes y sesiones independientes, gestos desconocidos más variados, el efecto de la lateralidad, reconocimiento en cámara continua y latencia en dispositivos representativos. La identidad y la ejecución de las señas requieren revisión lingüística.

Consulta el protocolo y los comandos de reproducción en [ml/README.md](../README.md).
