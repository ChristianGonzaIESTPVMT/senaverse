# SeñaVerse · Entrenamiento local de reconocimiento LSP

Este módulo audita, prepara, entrena y exporta el clasificador experimental del Hito 3. Los resultados de la corrida con el dataset disponible están en [ml/reports/hito-3.md](reports/hito-3.md).

## Entorno y datos

Ejecuta los comandos desde la raíz del repositorio. Se verificó el flujo con CPython 3.13 y Node 26. `requirements.txt` fija NumPy, SciPy, scikit-learn y sus dependencias de ejecución. Node ejecuta el mismo preprocesamiento ESM que usa el navegador.

En PowerShell, si falta Python 3.13 y tienes Python Install Manager, ejecuta `py install 3.13`. Luego crea el entorno virtual e instala las dependencias.

```powershell
py -3.13 -m venv ml/.venv
$pyMl = '.\ml\.venv\Scripts\python.exe'
& $pyMl -m pip install --only-binary=:all: -r ml/requirements.txt
```

En macOS o Linux, usa `python3.13 -m venv ml/.venv` y `ml/.venv/bin/python` para los mismos comandos.

Coloca la exportación JSON v1 de Dataset Studio en `ml/datasets/senaverse-dataset-dataset-json.json` o indica otra ruta local con `--dataset`. Los scripts abren el original en modo lectura. Usa `ml/datasets/` para datos locales, incluidos respaldos o nuevas capturas. Los datos, los vectores procesados, el entorno virtual, los checkpoints, el modelo exportado y los reportes detallados quedan excluidos por Git. Vite también bloquea el acceso a esos directorios en desarrollo. Los reportes Markdown contienen métricas agregadas. [Configuración de archivos en Vite](https://vite.dev/config/server-options#server-fs-deny)

## Reproducir la corrida

```powershell
& $pyMl ml/scripts/pipeline.py run
```

Cada etapa también puede ejecutarse por separado.

| Etapa | Comando | Resultado local |
| --- | --- | --- |
| Auditoría | `& $pyMl ml/scripts/pipeline.py audit` | `ml/reports/local/hito-3/audit.json` con disposición, motivos y banderas por captura |
| Preparación | `& $pyMl ml/scripts/pipeline.py preprocess` | División e insumos `development.npz`, `test.npz` y `prepared.json` |
| Entrenamiento | `& $pyMl ml/scripts/pipeline.py train` | Selección con desarrollo y checkpoint `trained.joblib` |
| Evaluación | `& $pyMl ml/scripts/pipeline.py evaluate` | Comparación, métricas y decisiones por captura en la prueba reservada |
| Exportación | `& $pyMl ml/scripts/pipeline.py export` | `ml/artifacts/hito-3/model.json`, verificación numérica y reporte agregado |

Usa un ejecutable Chromium local con `--browser` para verificar el exportado con secuencias sintéticas y sin cámara.

```powershell
& $pyMl ml/scripts/pipeline.py export --browser 'C:\Program Files\Google\Chrome\Application\chrome.exe'
```

Cada corrida usa la semilla `1729` por defecto. `--run-name` asigna salidas propias a otra corrida. Conserva el mismo nombre para todas sus etapas. Si usas un dataset alternativo, pasa la misma ruta a `preprocess` y `export`. La exportación comprueba que su hash coincida. `trained.joblib` está pensado para el checkpoint generado en ese directorio por el comando local. Entrena y evalúa de nuevo al cambiar de dataset o de política.

```powershell
& $pyMl ml/scripts/pipeline.py run --dataset ml/datasets/piloto-ampliado.json --run-name piloto-ampliado --grouping participant
```

## Auditoría y división

El exportador web conserva `schemaVersion: 1` con metadatos de calidad v2 por captura. La auditoría toma del JSON el consentimiento, las categorías LSP y NEG-001, el perfil y las dimensiones de captura, el estado de revisión, los tiempos originales del detector cuando existen y los incidentes. Verifica la integridad de cada toma y vuelve a calcular FPS, cobertura y proporción de manos esperadas. La detección conservadora de duplicados comprueba geometría exacta y coincidencias de varias ternas consecutivas en landmarks redondeados.

Dataset Studio permite aceptar una captura técnicamente suficiente y marcar su revisión de operador de forma independiente. Esta corrida admite la ausencia histórica de `operatorReviewed`, emite una bandera y deja fuera las capturas desmarcadas explícitamente. Para exigir revisión explícita, añade `--require-operator-review` en `audit`, `preprocess` o `run`. Valida identidad y ejecución de las señas con especialistas de LSP antes de interpretar ese estado como revisión lingüística.

La división precede a cualquier transformación. `--grouping auto` intenta primero participantes completos y después sesiones aproximadas por pausas de 30 minutos, con cobertura de las diez señas en cada división. Con el material disponible se usaron bloques cronológicos por clase cerca de 60/20/20. Los cortes favorecen pausas sin desbalancear sustancialmente las clases. `--grouping participant` y `--grouping session` requieren su estrategia de forma explícita. Una sesión inferida por tiempo sirve como aproximación cuando la exportación carece de identificador de sesión.

En el caso cronológico, las capturas negativas se agrupan por persona y pausas de al menos dos minutos. Un único bloque se preserva en prueba, dos bloques permiten entrenamiento y prueba, y tres o más permiten cubrir también validación. Las dos familias admiten `NEG-001` como salida entrenada cuando el entrenamiento contiene negativos con geometría utilizable. La ausencia real de manos se maneja con una regla explícita. `train` consume únicamente `development.npz`. `evaluate` abre `test.npz` después de fijar la selección. El escalador de la SVM se ajusta con entrenamiento. Esta corrida usa una ventana por toma y prescinde de aumento de datos.

## Ventanas y exportación

SeñaVerse usa React 19.3.1, TypeScript 6.0.3 y Vite 8.3.7 en el entorno comprobado. MediaPipe Tasks Vision 1.2.3 produce un evento `FreshHandInference` por resultado aceptado del Worker. El evento contiene los landmarks originales y las dimensiones de la imagen procesada. La retención visual del lienzo opera por separado. El adaptador en `ml/web/` necesita geometría de imagen común a ambas manos. Los landmarks del espacio propio de cada mano carecen de esa referencia compartida para medir separación y desplazamiento. [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker?tab=Web)

Las ventanas tienen 1350 ms, con 24 o 32 muestras regularmente espaciadas. Para comparar grabaciones delimitadas se elige la ventana con mayor movimiento observado de muñeca e índice entre candidatas cada 180 ms, incluyendo la última. El adaptador para cámara usa la ventana que termina en la última captura fresca. Se conservan únicamente pasos con observación válida o interpolación entre dos observaciones consecutivas de la misma pista separadas por hasta 150 ms. Las máscaras se calculan en la cuadrícula temporal. La asociación de pistas combina proximidad a la muñeca prevista y una contribución pequeña de la lateralidad de MediaPipe.

Los landmarks de imagen se corrigen usando la relación de aspecto procesada en `x` y `z`. Para la postura se resta la muñeca y se divide por el promedio de las distancias muñeca–MCP del dedo medio y MCP del índice–MCP del meñique. Se conservan orientación, ángulos y distancias de dedos. Para el movimiento se usa la primera muñeca visible como origen, la escala mediana de la palma en la ventana, velocidades en palmas por segundo y separación relativa entre manos. Los nombres de clase, IDs, fechas, duración solicitada y número de fotogramas originales quedan fuera del vector de entrada.

Se compararon Random Forest y SVM lineal con pesos balanceados. La primera exporta árboles y distribuciones de hojas. La segunda exporta el escalador de entrenamiento, pesos e interceptos. La SVM usa softmax con temperatura ajustada en validación para puntuar confianza de forma experimental. Los umbrales comparan la puntuación líder y su diferencia con la segunda. La selección entre familias usa F1 macro de validación y tamaño gzip. La CNN 1D se pospuso por el tamaño y la diversidad de las capturas. [LinearSVC](https://scikit-learn.org/1.7/modules/generated/sklearn.svm.LinearSVC.html) · [Predicción de Random Forest](https://scikit-learn.org/1.7/modules/ensemble.html)

El JSON propio tiene un lector ESM sin dependencias en `ml/web/model.mjs`. ONNX Runtime Web con WASM sería una opción para un modelo interoperable. TensorFlow.js permite convertir modelos Keras si se justifica una CNN exportable. Para los estimadores actuales el JSON lleva directamente los parámetros necesarios y reduce el tamaño y las dependencias de ejecución. El exportador exige coincidencia de todas las etiquetas y motivos de rechazo de prueba, y error absoluto de puntuación de hasta `2e-6` entre scikit-learn y JavaScript. [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) · [Conversión a TensorFlow.js](https://www.tensorflow.org/js/guide/conversion)

### API local para una integración posterior

```js
import { createPredictor } from './ml/web/model.mjs';

const predictor = createPredictor(modelDocument);
const live = predictor.live();

function onFreshInference(event) {
  if (live.push(event)) {
    const decision = live.predict();
    // decision.labelId es null para una ventana insuficiente o un rechazo.
    return decision;
  }
}
```

`modelDocument` es el JSON exportado y leído por un cliente autorizado. Pasa únicamente eventos del canal fresco. Consulta `live.predict()` también al vencer la vigencia de una captura, de modo que expire cualquier decisión visible si se detiene el flujo. Llama a `live.reset()` al cerrar o cambiar de cámara. El adaptador se prueba de manera independiente de los módulos educativos.

## Protocolo de validación posterior

1. Con revisión especializada de LSP, confirma las etiquetas, la ejecución y las variaciones aceptables. Registra consentimiento antes de cada sesión y conserva por separado las exportaciones locales.
2. Recluta participantes distintos y realiza sesiones separadas, alternando el orden de las señas. Varía lateralidad, distancias, iluminación y dispositivos. Recopila reposo, cambios de pose, señas fuera del catálogo y periodos con cero manos.
3. Congela modelo, umbrales y protocolo antes de la prueba independiente. Reserva participantes completos y sesiones de fechas distintas. Mantén esos registros fuera del ajuste de hiperparámetros. Separa negativos adicionales de validación para mejorar el rechazo en la siguiente revisión del modelo.
4. Evalúa tomas delimitadas y sesiones continuas. En cámara continua anota inicio y fin, mide confusiones por seña, rechazo incorrecto, activaciones falsas por minuto, latencia desde el gesto hasta la decisión y tiempos en dispositivos de destino.

## Pruebas

```powershell
& $pyMl -m unittest discover -s ml/tests -v
node --test ml/tests/web.test.mjs
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Las pruebas cubren auditoría, separación de grabaciones, entrenamiento con negativos cuando hay cobertura, escalado, geometría temporal, asociación de manos, reutilización del flujo fresco y rechazo por umbrales. La comprobación Chromium de `export --browser` ejecuta el lector ESM, el modelo exportado y el adaptador en un perfil temporal local.
