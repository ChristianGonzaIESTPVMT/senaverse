# SeñaVerse · Hito 4.3

La V1 sigue disponible como referencia. Se conservó su artefacto SVM lineal y se verificó el SHA-256 `055e31bf081e18a68081648e3948713fb86825afc6890bee7333d5cb3364c5a6`. El laboratorio ofrece un selector V1/V2. La V2 muestra un aviso de disponibilidad hasta que exista su artefacto local. La preparación descrita aquí llega hasta el diagnóstico, la captura y las herramientas de entrenamiento y comparación.

## Diagnóstico

| Hallazgo | Causa y evidencia |
| --- | --- |
| Estáticas con la izquierda | En las 170 tomas estáticas históricas, la mano predominante según MediaPipe fue derecha. El vector V1 centra y escala la mano, pero conserva componentes de orientación y postura con signo. Sobre 33 tomas de validación con lateralidad derecha suficientemente estable, la V1 acertó en 33 ventanas finales originales, en 19 al reflejar la toma para simular una izquierda y en 33 al normalizar la postura simulada. Es una prueba de geometría con capturas derechas y requiere confirmación con personas que realicen las señas con la izquierda. |
| Nada | Los vectores y las grabaciones conservan el desplazamiento original. El análisis de las 39 tomas encontró trayectorias inconcluyentes o incompatibles en la secuencia completa. V1 aprendió de estas ejecuciones, por lo que una puntuación alta para Nada puede corresponder a la ejecución histórica. |
| Solo con índice inmóvil | V1 usa características de postura y movimiento, junto con una ventana de 1350 ms y votos de clasificador sucesivos. La confirmación V1 carece de una comprobación específica del giro. Una postura sostenida que obtenga puntuación y margen suficientes puede generar varios votos y quedar confirmada. |
| Gestos desconocidos | V1 tiene diez salidas y carece de una salida negativa entrenada. Su softmax reparte la puntuación entre esas clases. La mano esperada, el margen y la persistencia reducen algunos errores, pero cuatro de siete negativos reservados produjeron confirmaciones. La candidata líder es el resultado de una ventana. Una confirmación requiere una decisión temporal y se muestra en «Seña confirmada». |

La vista de cámara y su superposición están reflejadas por CSS. El Worker recibe la imagen original de `createImageBitmap`. MediaPipe entrega lateralidad, puntos normalizados a la imagen y puntos mundiales con origen propio de cada mano. Se corrige la relación de aspecto de la imagen para la geometría relativa. Los puntos mundiales quedan disponibles en el dataset para análisis de articulación. El origen por mano impide usar esos puntos directamente para distancia entre manos o desplazamiento en la escena. La pista usa proximidad a la muñeca prevista, continuidad temporal y un aporte pequeño de la lateralidad. [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker?tab=Web)

En V2, una sola pista y lateralidad izquierda consistente habilitan una variante para las cinco estáticas. Se refleja la coordenada horizontal de cada punto respecto de su propia muñeca. El centro, la trayectoria de muñeca y el eje de profundidad conservan su valor. Las manos derechas usan el vector original y las dinámicas y las bimanuales se puntúan en la geometría original. El entrenamiento y el navegador usan el mismo cálculo. La orientación se conserva en la representación derecha canónica y se transforma junto a los puntos de la izquierda.

## Auditoría de las 39 tomas de Nada

La página 134 indica pinza de pulgar e índice derechos, otros dedos extendidos, mano vertical, palma hacia afuera y movimiento de la derecha a la izquierda de la persona que signa. Con la persona de frente, el desplazamiento corresponde a **x creciente** en la imagen original y a x decreciente en la vista espejo. Mantén esa convención al revisar los reportes. [Guía MINEDU (2015)](https://repositorio.minedu.gob.pe/handle/20.500.12799/5545) · [Reproducción de la página 134](https://mislibrostexto.com/pe/diccionarios/lenguaje-de-signos-sin-nivel/page/134)

| Trayectoria en la secuencia completa | Tomas |
| --- | ---: |
| Poco desplazamiento horizontal | 19 |
| Retorno o dirección neta inconcluyente | 18 |
| Dirección opuesta | 1 |
| Predominantemente vertical | 1 |
| Desplazamiento neto compatible con el criterio preliminar | 0 |

En nueve tomas apareció por lo menos una ventana local compatible con el filtro de Nada. La comparación de extremos del tramo continuo permite detectar retornos que una ventana aislada puede ocultar. El reporte guarda ID, participante, repetición, estado, incidencias técnicas, desplazamientos en unidades de palma, métricas de la pinza y orientación, y ventanas candidatas con sus tiempos. Estas métricas sirven para localizar tramos durante la revisión. La validación lingüística requiere revisar la toma y cotejarla con la referencia.

```powershell
$pyMl = '.\ml\.venv\Scripts\python.exe'
& $pyMl -X utf8 ml/scripts/v2.py audit-nada
& $pyMl -X utf8 ml/scripts/v2.py diagnose
```

Los reportes quedan en `ml/reports/local/hito-4-3-v2/nada-audit.json` y `historical-development-motion.json`. Para revisar un ID, abre Dataset Studio → **Muestras guardadas**, pega el ID, pulsa **Revisar** y luego **Reproducir secuencia**. Desmarca **Vista en espejo** para comparar con x original. Puedes recorrer o pausar en una observación. **Excluir de V2** y **Retirar exclusión de V2** modifican la misma marca que lee el pipeline. La marca se conserva en el respaldo y la exportación. Los puntos, IDs y estados de revisión se mantienen como se grabaron. El filtro de preparación también separa las tomas históricas de Nada y NEG-001 del protocolo de recopilación nuevo.

## Movimiento y rechazo

La V2 mantiene la ventana causal de 1350 ms con 24 pasos y reinicia el contexto ante cero manos, cambios en la cantidad de manos, pausas de captura o cambios de geometría. Para dinámica exige evidencia en un tramo continuo, suaviza tres observaciones y normaliza las distancias por palma. Estas reglas corren después de la puntuación y antes de confirmar. El cuadro compara una ventana elegible durante cada toma de desarrollo V1 con el mismo tipo de medida en el tramo continuo completo.

| Seña | Evidencia evaluada | Alguna ventana de 1350 ms | Tramo completo |
| --- | --- | ---: | ---: |
| Sí | Flexión hacia abajo o hacia delante del eje de la palma | 4/8 | 1/8 |
| Nada | Pinza y progreso lateral hacia el extremo esperado | 0/8 | 0/8 |
| Mucho | Apertura y cierre de yemas en ambas manos, con evidencia conjunta | 8/8 | 8/8 |
| Solo | Recorrido curvo coherente del índice respecto de la muñeca | 7/7 | 7/7 |
| Con | Separación decreciente entre muñecas y final cercano a la menor separación | 6/6 | 6/6 |

Esas cifras miden evidencia geométrica, no aciertos ni confirmaciones. En Sí, mirar la toma completa tampoco resolvió el criterio: el final puede incluir un regreso a reposo o varias flexiones. Antes de fijar la política definitiva, revisa tomas nuevas de Sí con inicio y fin anotados y compara la fase descendente y el retorno. Prueba los movimientos lentos antes de ampliar la ventana, ya que más contexto aumenta la latencia inicial y puede mezclar repeticiones. Para Solo se verificaron de forma sintética un índice inmóvil, uno que se mueve en línea y otro que gira. Uno a Cinco conservan la confirmación por postura sostenida.

La V2 entrena `NEG-001` con ventanas que contienen manos. Las tomas sin manos verifican «Buscando manos» y el reinicio sin requerir vectores de clasificación. Una categoría negativa líder, una puntuación o un margen insuficientes, una cantidad de manos incompatible o un movimiento incompleto dejan «Gesto no reconocido». La confirmación usa resultados frescos consecutivos. El panel de diagnóstico reúne las puntuaciones candidatas y los tiempos. El ajuste por clase parte de los mínimos de V1 (0,75 de puntuación, 0,40 de margen), puede elevarlos si reduce errores en validación y procura retener el 95 % del peso de las ventanas correctas aceptadas en ese bloque. Son puntuaciones internas del clasificador. El replay de secuencias completas mide el efecto de aplicar todas las reglas juntas.

## Recopilación

1. En `.env.development.local` habilita `VITE_ENABLE_DATA_COLLECTION=true` y `VITE_ENABLE_RECOGNITION_LAB=true`. Inicia `npm.cmd run dev` y abre `/herramientas/dataset` en el perfil donde ya están tus capturas. Descarga un respaldo antes de empezar. Recoge consentimiento de sesión y crea nuevos IDs para los participantes reservados para prueba.
2. Reúne unas **30 tomas nuevas de Nada** con `LSP-007`. Conserva la mano en cuadro antes, durante y un breve momento después del desplazamiento. Usa la instrucción de la página 134 en el panel. Reproduce cada toma, valida la dirección y la configuración con una persona competente en LSP y marca las tomas utilizables **Aceptada** y **Revisada por operador**. Estas dos decisiones se registran por separado.
3. Reúne unos **60 negativos** con `NEG-001` y **Sin requisito** de manos. Una distribución inicial es 10 sin manos, 25 con una mano y 25 con dos. Reparte reposo o gestos ajenos al catálogo, transiciones, movimientos parciales, índice quieto y negativos bimanuales parecidos a Mucho o Con. Graba también uno o dos gestos por familia bajo condiciones de cámara y participantes distintos. Respeta la categoría técnica y aplica las dos decisiones de revisión a las tomas utilizables.
4. Cubre las diez clases en cada división. Además de Nada y los negativos, recoge los positivos necesarios con personas nuevas para validación y prueba. En Uno a Cinco, usa el editor de etiqueta para configurar **2000 ms** de grabación y alterna derecha e izquierda. A 1500 ms, la ventana y las confirmaciones sucesivas suelen requerir más tiempo del que contiene la toma. Reparte ambas manos en desarrollo y prueba y registra las dinámicas completas. Puedes empezar con un reparto aproximado de 60/20/20 por personas y sesiones separadas.
5. Exporta **Dataset JSON** a `ml/datasets/hito-4-3.json`. Conserva por separado la exportación histórica con la que se creó la V1 y los manifiestos locales de su división. La exportación nueva conserva el mismo ID de dataset y puede contener todas las capturas históricas. La preparación reserva participantes completos y mantiene juntas todas las ventanas derivadas de una toma.

## Preparación, entrenamiento posterior y comparación

Los siguientes comandos suponen que `P003` está reservado para desarrollo y `P004` para prueba independiente. Sustituye los IDs por los reales y repite cada argumento para añadir más participantes. Las demás personas elegibles pertenecen al entrenamiento. La prueba requiere participantes ajenos a la exportación histórica. El código comprueba los hashes de la exportación y división V1 y excluye los IDs de prueba de V1 de toda división V2. Las nuevas Nada, NEG-001 y tomas de prueba requieren revisión explícita y la marca de captura del Hito 4.3.

```powershell
$pyMl = '.\ml\.venv\Scripts\python.exe'
$datasetMl = 'ml/datasets/hito-4-3.json'
& $pyMl -X utf8 ml/scripts/v2.py prepare --dataset $datasetMl --validation-participant P003 --test-participant P004
& $pyMl -X utf8 ml/scripts/v2.py train
& $pyMl -X utf8 ml/scripts/v2.py compare --dataset $datasetMl --partition validation
# Ejecutar una vez que modelo, reglas y protocolo hayan quedado fijados.
& $pyMl -X utf8 ml/scripts/v2.py compare --dataset $datasetMl --partition test
```

Si la exportación original está en otra ubicación, pasa `--baseline <ruta>` a `prepare` o `diagnose`. `prepare` informa etiquetas faltantes, exclusiones y composición de negativos en `dataset-audit.json`. Calcula ventanas causales de entrenamiento y validación después de dividir, con peso total igual por toma en el ajuste de la SVM. En un negativo de una mano izquierda puede conservar los dos vectores vistos por el laboratorio. La prueba se abre en `compare`; la etapa de entrenamiento usa únicamente los vectores de desarrollo. `train` exporta a `ml/artifacts/hito-4-3-v2/model.json`, la ruta que carga el selector V2.

`comparison-validation.json` y `comparison-test.json` registran ambos modelos sobre las mismas secuencias completas. Incluyen acierto por seña y por mano en las estáticas, aceptaciones falsas por cantidad máxima observada de manos, positivos sin confirmación, positivos con confirmación de otra clase, matriz de primeras confirmaciones, confusiones entre estáticas y dinámicas, primera confirmación correcta desde el inicio de grabación y percentiles de cómputo y latencia. El replay mide tiempos en Node y usa los retrasos grabados del Worker. Complementa con cámara física y sesiones continuas anotadas para verificar el tiempo desde el inicio efectivo de la seña y el comportamiento ante pausas y transiciones.
