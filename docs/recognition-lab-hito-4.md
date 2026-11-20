# Laboratorio de reconocimiento LSP de SeñaVerse

El Hito 4 conecta la SVM experimental V1 con la cámara de SeñaVerse. El laboratorio clasifica localmente las diez señas del piloto LSP en modo libre o compara la seña confirmada con un objetivo en modo dirigido. En la reproducción de prueba confirmó **33 de 34 tomas dinámicas** y aceptó erróneamente **4 de 7 gestos negativos**. La evaluación con personas frente a una cámara física queda pendiente.

## Abrir el laboratorio

1. Conserva la copia revisada de la V1 en `ml/artifacts/hito-3/model.json`. Su versión es `3.0.0-experimental.1+349faaea0427` y su SHA-256 es `055e31bf081e18a68081648e3948713fb86825afc6890bee7333d5cb3364c5a6`.
2. Agrega `VITE_ENABLE_RECOGNITION_LAB=true` a `.env.development.local` e inicia o reinicia `npm.cmd run dev`.
3. Abre `http://localhost:5173/herramientas/reconocimiento` o usa el puerto que anuncie Vite. Espera la carga del modelo y pulsa **Activar cámara**.
4. En **Dirigido**, selecciona un objetivo. En **Libre**, el modelo evalúa el catálogo completo. Mantén cada postura estática hasta la confirmación. En las señas dinámicas, realiza el movimiento completo. **Reiniciar reconocimiento** limpia la ventana. Desactivar y volver a activar la cámara crea una sesión nueva.

El interruptor se evalúa en el entorno de desarrollo local. La ruta queda fuera de la navegación estudiantil y del build de producción. El middleware de Vite publica en `/__senaverse/recognition-v1.json` únicamente los campos necesarios para la inferencia del artefacto con hash aprobado. El original, el dataset y los reportes detallados conservan las protecciones de Vite y Git. Si falta el artefacto o su contenido difiere de la copia aprobada, la carga devuelve 503 y la interfaz permite reintentar. El interruptor de Vite controla la disponibilidad de la herramienta en desarrollo. Usa el servidor de desarrollo en localhost. [API de middleware de Vite](https://vite.dev/guide/api-plugin.html#configureserver) · [Entornos de Vite](https://vite.dev/guide/env-and-mode.html)

Con Node, las dependencias, el modelo V1, los WASM y el Hand Landmarker disponibles localmente, la clasificación funciona sin conexión a Internet. El navegador hace el preprocesamiento y la inferencia. Python se usa únicamente para reproducir las pruebas con el dataset local.

## Arquitectura y política de reconocimiento

`PracticeCamera` comparte la captura de cámara, el canvas y el Worker de MediaPipe. El laboratorio consume `FreshHandInference` en orden estricto y con la vigencia de 120 ms del detector. El canvas puede conservar temporalmente una imagen de seguimiento. El clasificador recibe resultados frescos del Worker.

El buffer conserva la última ventana de **1350 ms** y, cuando existe, una observación real anterior para interpolar su inicio. Usa el mismo preprocesamiento de **24 pasos** del Hito 3. Incluye normalización de escala, orientación, trayectoria, velocidad, separación de muñecas, asociación temporal y máscaras de presencia. Un resultado fresco sin manos, la expiración del flujo o un cambio de geometría limpian la evidencia de la decisión. Pausas en la secuencia mayores a 150 ms obligan a reunir una nueva ventana cuando llegan resultados otra vez.

El Hito 3 eligió retrospectivamente la ventana de mayor actividad dentro de cada toma delimitada. El laboratorio intenta analizar la ventana que termina en cada nuevo resultado elegible a un máximo de **10 Hz**. Así puede confirmar durante una seña dinámica de 2,5 o 3 s, a medida que se acumulan ventanas válidas. La posición de la ventana y la falta de un inicio de gesto anotado afectan el resultado en escenas continuas.

La seña con mayor puntuación debe alcanzar **0,75** y su margen frente a la segunda debe alcanzar **0,40**. La cantidad de manos esperada debe coincidir en la última captura y en al menos el **80 %** de los pasos remuestreados. La confirmación inicial requiere al menos dos ventanas nuevas consecutivas para la misma seña durante **180 ms**. Cambiar una seña ya confirmada requiere **300 ms**. Durante una duda breve se conserva el último rótulo estabilizado y se libera en el siguiente análisis al transcurrir **180 ms** sin evidencia válida para esa seña. El modo dirigido compara el objetivo únicamente con una decisión confirmada. Perder las manos requeridas despeja inmediatamente la confirmación.

El panel de diagnóstico permite ajustar estas constantes durante la sesión. Las puntuaciones son salidas de una SVM con softmax y se muestran como números sin unidades de probabilidad. Con puntuaciones que suman uno, el umbral de 0,75 ya implica un margen de al menos 0,50. El control de margen cobra efecto independiente con umbrales de puntuación inferiores. Los valores iniciales conservan los umbrales exportados de la V1.

## Pruebas con grabaciones guardadas

Se reprodujeron las **71** capturas de validación y las **75** de prueba del Hito 3 con los timestamps originales del Worker y el artefacto V1 congelado. Cada toma se reprodujo hasta su último resultado real. Los siete negativos se usaron al final para comprobar la política fija. La comparación es retrospectiva y corresponde a un solo participante.

En señas conocidas, una decisión instantánea correcta exige que la etiqueta esperada supere los umbrales y el control de manos en al menos una ventana. Una decisión estable correcta exige al menos una confirmación de esa etiqueta. En negativos, el éxito consiste en que la estrategia indicada rechace la toma. «Última ventana» aplica el modelo V1 a una sola ventana final.

| Grupo | Ventana más activa offline | Última ventana | Instantánea en laboratorio | Estable en laboratorio |
| --- | --- | --- | --- | --- |
| Validación, estáticas de 1,5 s | 34/34 | 34/34 | 34/34 | 0/34 |
| Validación, dinámicas de 2,5 o 3 s | 37/37 | 36/37 | 37/37 | 35/37 |
| Prueba, estáticas de 1,5 s | 34/34 | 34/34 | 34/34 | 0/34 |
| Prueba, dinámicas de 2,5 o 3 s | 33/34 | 32/34 | 33/34 | 33/34 |
| Prueba, rechazo de negativos | 3/7 | 2/7 | 2/7 | 3/7 |

Las tomas estáticas terminan antes de reunir la ventana de 1350 ms más el tiempo de confirmación. Para la prueba física, mantén la postura alrededor de **1,8 a 2 s** y verifica la confirmación. Entre las dinámicas de prueba se confirmaron **7/7 Sí**, **8/8 Nada**, **7/7 Mucho**, **5/6 Solo** y **6/6 Con**. El tiempo mediano de la primera confirmación correcta por seña quedó entre **1,64 y 1,66 s** desde el inicio de esas tomas. Dos negativos se confirmaron como Mucho y dos como Con. En ese bloque la estabilización conservó la tasa de falsas aceptaciones observada en el Hito 3.

### Rendimiento

| Medición en reproducción | Validación | Prueba |
| --- | --- | --- |
| FPS p50 de resultados guardados | 16,64 | 16,65 |
| Análisis por segundo p50 en tomas con más de una ventana puntuada | 8,29 | 8,30 |
| Ventana y clasificación en Node p50 / p95 | 0,25 / 0,47 ms | 0,20 / 0,51 ms |
| Captura a decisión en reproducción p50 / p95 | 9,72 / 12,71 ms | 9,87 / 12,87 ms |

La latencia de captura a decisión de la tabla combina el retardo registrado del Worker y el cómputo medido en Node 26 en Windows. Los 1350 ms de contexto y el tiempo de confirmación se contabilizan aparte. En dos ejecuciones de Chromium 157 con cámara simulada, la primera lectura estuvo entre 7,77 y 7,99 FPS. La prueba comprobó que se crea una sesión nueva al reiniciar y que se liberan la pista y el Worker al detener o salir de la ruta. Las 96 solicitudes observadas en cada ejecución eran locales. La cámara simulada sirvió como control de cero manos.

## Pruebas y archivos

Pasaron TypeScript, lint, **173 pruebas de la aplicación**, **6 pruebas del lector y el preprocesamiento compartidos** y **12 pruebas de Python**. Las pruebas sintéticas verifican paridad del vector, asociación ante reordenamiento de manos, secuencias incompletas, umbrales, cambios de seña, reinicio y pérdida de seguimiento. Las pruebas HTTP comprueban el interruptor, la proyección de la V1, la respuesta ante un modelo ausente y el bloqueo 403 de archivos privados. El build de producción excluyó el laboratorio y la V1 aun con el interruptor forzado.

```powershell
npx.cmd tsc -b --pretty false
npm.cmd run lint
npm.cmd test
npm.cmd run build
node --test ml/tests/web.test.mjs
& .\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
node scripts/recognition-lab-browser.mjs 'C:\Program Files\Google\Chrome\Application\chrome.exe'
& .\ml\.venv\Scripts\python.exe ml/scripts/replay_lab.py --partition both
```

| Área | Archivos |
| --- | --- |
| Ruta, interfaz y estilos | `src/App.tsx`, `src/pages/RecognitionLabPage.tsx`, `src/pages/RecognitionLabPage.css` |
| Integración con cámara y V1 | `src/components/PracticeCamera.tsx`, `src/features/sign-recognition/{labProtocol,labModel,liveRecognition}.ts`, `ml/web/features.mjs`, `ml/web/{features,model}.d.mts` |
| Distribución local | `vite.config.ts`, `scripts/vite-recognition-model.ts`, `.env.example` |
| Validación | `scripts/recognition-lab*.mjs`, `ml/scripts/replay_lab.{py,mjs}` |

## Validación física y datos para la V2

1. Con consentimiento, confirma que la cámara física permite iniciar, detener, reiniciar y recuperar el seguimiento. Prueba sin manos, salidas parciales del encuadre y cambios de una a dos manos. Repite en claro y oscuro, con CPU y en los dispositivos de destino.
2. Con revisión especializada de LSP, valida la identidad y ejecución de las señas. Alterna las diez señas entre personas, manos dominantes, distancias, fondos y sesiones. Anota inicio, fin y primera confirmación. Incluye posturas estáticas sostenidas y dinámicas de 2,5 y 3 s seguidas de reposo o de otra seña.
3. Registra negativos nuevos en bloques y participantes distintos. Incluye manos en reposo, transiciones, gestos ajenos al catálogo, gestos bimanuales parecidos a Mucho y Con y ventanas con una mano oculta. Mide falsos positivos por minuto, el acierto por seña, el rechazo de señas válidas y la latencia desde el inicio anotado.
4. Para V2, prepara ventanas causales de secuencias continuas después de dividir por persona y sesión. Ajusta el clasificador y sus umbrales con datos de desarrollo, con negativos diversos y ejemplos de transición. Congela los parámetros y reserva personas, sesiones y negativos nuevos para una prueba independiente. Compara el rechazo y la latencia con la V1 antes de usar el reconocimiento en actividades educativas.
