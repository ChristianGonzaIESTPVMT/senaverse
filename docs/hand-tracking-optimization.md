# Hito 1 — Continuidad y latencia del seguimiento

## Qué se identificó

El ciclo anterior ejecutaba `detectForVideo` de forma síncrona en el hilo principal. Además del máximo de 24 FPS, fijaba el intervalo al doble del tiempo de una inferencia. Esa espera adicional reducía las oportunidades de seguir movimientos rápidos. El Canvas se vaciaba ante un único resultado sin manos y la cámara solicitaba 1280 × 720 sin inspeccionar sus ajustes negociados.

MediaPipe usa seguimiento entre fotogramas. `minTrackingConfidence` compara el IoU de las cajas de la mano entre fotogramas; si falla el seguimiento, o la presencia cae por debajo de `minHandPresenceConfidence`, puede volver a detectar la palma. Desplazamientos grandes entre muestras y desenfoque por movimiento son posibles causas de las pérdidas. Esta explicación está respaldada por la documentación del algoritmo; no es un diagnóstico físico medido en este equipo.

## Cambios

- Inferencia en un Worker de módulo con OffscreenCanvas. GPU primero y alternativa CPU dentro del mismo Worker. La captura y el dibujo permanecen en la interfaz; React no ejecuta inferencias.
- `requestVideoFrameCallback` cuando está disponible. Alternativa con `requestAnimationFrame`, `currentTime` y los contadores de reproducción disponibles.
- Una sola captura/inferencia en curso. No se guarda una cola de imágenes. Si llega otro fotograma durante una captura asíncrona, se cierra esa captura superada. Al terminar una inferencia se captura directamente el video actual si ya se observó otro fotograma nuevo, conservando solo sus metadatos.
- Timestamps monotónicos de `performance.now()`, con incremento mínimo y validación adicional en el Worker. El identificador y timestamp del resultado deben coincidir con la solicitud en curso.
- Resultados con más de 120 ms desde la observación del fotograma se descartan. Este límite es configurable en `config.ts`; no es una latencia garantizada ni una medición del sensor.
- Cámara con valores **ideales** de 640 × 480 y 30 FPS, sin `exact` ni mínimos obligatorios. Se leen los valores reales negociados mediante `MediaStreamTrack.getSettings()`.
- Resolución de procesamiento independiente de la presentación: hasta 640 × 480, preservando la proporción de la cámara. Por ejemplo, una cámara de 1280 × 720 se procesa a 640 × 360. El video y Canvas conservan su tamaño visual, recorte y espejo existentes.
- Cierre de ImageBitmap, cancelación de callbacks y temporizadores, cancelación de cargas y terminación del Worker al apagar o desmontar. Un Worker ocupado se termina inmediatamente; si está libre se permite cerrar el detector y se aplica un límite de 50 ms para terminarlo.

El Worker requiere `Worker`, `OffscreenCanvas` e `ImageBitmap`, disponibles en Brave/Chromium actuales. Si faltan o no se puede inicializar el detector, se muestra el error de detección. No se vuelve silenciosamente a inferir en el hilo principal. **La alternativa CPU se conserva dentro del Worker.**

La versión instalada `@mediapipe/tasks-vision@1.2.3` ofrece un cargador WASM ESM. Se usa ese cargador en el Worker y se restaura su fábrica al reintentar con CPU, porque el SDK consume la variable global de la fábrica mientras las importaciones ESM permanecen cacheadas. Los archivos siguen siendo locales y de la misma versión que el paquete. Vite compila el Worker con formato ES.

## Umbrales: decisión y ensayos aislados

El valor predeterminado sigue siendo **0.5 / 0.5 / 0.5**, dos manos y VIDEO. No hay pruebas físicas que justifiquen reducirlo y aceptar más falsos positivos.

| Perfil | Detección de palma | Presencia | Seguimiento |
| --- | --- | --- | --- |
| Base, seleccionado por defecto | 0.5 | 0.5 | 0.5 |
| Presencia 0.45 | 0.5 | 0.45 | 0.5 |
| Seguimiento 0.40 | 0.5 | 0.5 | 0.4 |
| Seguimiento 0.35 | 0.5 | 0.5 | 0.35 |

Cada variante modifica un único valor. No se han combinado reducciones. El panel permite ejecutar estas pruebas controladas; las pruebas automáticas verifican que los perfiles sean independientes, no su calidad con manos reales.

## Continuidad sin predecir detecciones

Los resultados frescos se dibujan directamente, sin promedios ni extrapolación. Un resultado vacío después de detectar manos puede conservar los últimos puntos **reales**, atenuados, durante un máximo de 80 ms desde la pérdida y siempre dentro de 120 ms desde el fotograma original. Durante ese intervalo el estado es «Seguimiento temporalmente perdido», el recuento detectado es cero y no se expone esa retención como una detección nueva.

Cuando se detecta una de dos manos, se dibuja el resultado nuevo de esa mano; no se duplica ni se inventa la mano ausente. Se indica la pérdida temporal de la otra mano. Tras una ausencia sostenida de 300 ms, el mensaje pasa a «No hay manos visibles en el encuadre».

La ausencia de resultados no permite distinguir con certeza una mano fuera del campo de una mano ocluida o desenfocada. Por eso el mensaje describe lo que el detector ve y no afirma conocer la causa de la ausencia.

## Activar el panel temporal

1. Ejecuta `npm.cmd run dev` y abre `/camara/libre?handDebug=1`.
2. Selecciona una seña y activa la cámara. El panel aparece bajo los controles de cámara.
3. Si quieres mantener el diagnóstico al navegar por Desafío/Situaciones, crea localmente `.env.local` con `VITE_HAND_DEBUG=true` y reinicia Vite. El archivo ya está excluido de Git.
4. «Desactivar diagnóstico» oculta el panel y restablece el perfil base. Quitar el parámetro y recargar también lo desactiva.

El panel está limitado a `import.meta.env.DEV`: no se carga en producción aunque la URL tenga el parámetro. Las métricas se publican como máximo dos veces por segundo; los landmarks no se almacenan en el estado de React.

Se muestran FPS medidos de cámara e inferencia, latencia media/máxima, tiempo medio de inferencia, última recuperación, pérdidas observadas, delegado GPU/CPU, Worker, resolución procesada, ajustes negociados, manos actuales, fotogramas descartados y resultados descartados por antigüedad. Antes de disponer de datos suficientes se muestra «—».

Interpretación:

- Los FPS se calculan sobre una ventana de 2 segundos. El FPS negociado de `getSettings()` se muestra aparte y no se presenta como una medición real.
- La fuente preferida es `presentedFrames` de los callbacks de video. Si solo existe muestreo por animación, se identifica como `sampled`; esa ruta puede subestimar fotogramas no observados.
- La latencia mide desde la observación del fotograma en la interfaz hasta recibir el resultado, incluyendo captura, transferencia e inferencia. No mide el retardo físico de exposición del sensor ni el tiempo hasta iluminar la pantalla.
- El FPS de inferencia cuenta también inferencias cuyo resultado acabó descartado por antigüedad. El contador de resultados antiguos permite reconocer ese caso.
- Una pérdida es una caída del número de manos de resultados frescos. La recuperación es el regreso al número anterior, medido entre los fotogramas correspondientes; no identifica una mano individual ni mide falsos positivos.
- Los descartes de fotogramas incluyen saltos observables, metadatos sustituidos por otros más nuevos y capturas superadas. Los resultados antiguos se contabilizan por separado.
- «Reiniciar medición» limpia los acumulados sin recargar el modelo. Cambiar el perfil reinicia el detector y la medición para no mezclar configuraciones.

## Comparación anterior y posterior

| Aspecto | Anterior | Optimizado |
| --- | --- | --- |
| Inferencia | Hilo principal | Worker, con GPU o CPU |
| Notificación de fotogramas | Animación de pantalla | Callback de video; animación como alternativa |
| Resolución solicitada | 1280 × 720 ideal | 640 × 480 ideal; se verifica la negociación |
| Límite de programación | 24 FPS y espera de 2 × duración | 30 FPS objetivo, una inferencia en curso, sin espera multiplicada |
| Resultado vacío | Borrado inmediato | Retención breve y explícita de puntos reales |
| Diagnóstico | Sin métricas | FPS, latencia, recuperación, delegado y descartes |
| FPS reales en el i7/Iris Plus | Sin medición disponible | Pendientes de medición física |
| Latencia y pérdidas reales | Sin medición disponible | Pendientes de medición física |

El objetivo de 20–30 FPS es orientativo. No se afirma haberlo conseguido. El desenfoque de la webcam, su exposición, oclusiones, CPU/GPU, controladores y carga de Brave siguen limitando el seguimiento. Un resultado que tarda más de 120 ms se descarta deliberadamente: en un equipo muy lento puede haber pocos puntos visibles en vez de mostrar puntos atrasados. El diagnóstico permite detectar ese caso.

## Protocolo físico para el equipo de referencia

Equipo indicado: Intel Core i7-1065G7, Intel Iris Plus integrada, 8 GB, Windows y Brave con aceleración gráfica activada. Mantén la misma webcam, distancia, iluminación y carga del navegador en cada comparación. No cambies la configuración de aceleración entre ensayos.

Empieza con el perfil base. Espera 3–5 segundos de calentamiento, confirma el delegado y la resolución negociados, pulsa «Reiniciar medición» y realiza cada escenario durante 30 segundos. Repite con presencia 0.45 y con cada alternativa de seguimiento por separado, intercalando una nueva prueba base. Repite dos veces si hay diferencias pequeñas.

1. **Una mano estática:** cuenta pérdidas sin movimiento y observa falsos puntos fuera de la mano.
2. **Una mano lenta:** traza movimientos horizontales, verticales y círculos. Observa coincidencia y recuperación.
3. **Una mano rápida:** repite el mismo recorrido y amplitud, sin acercarte más a la cámara para favorecer una variante.
4. **Dos manos independientes:** mueve una mientras la otra permanece quieta y luego ambas en sentidos opuestos.
5. **Entradas y salidas rápidas:** saca y reintroduce una mano y luego ambas. Distingue ausencia real de pérdida estando aún visibles.
6. **Orientación de palma:** gira lentamente y después rápidamente, manteniendo las manos dentro del encuadre.
7. **Iluminación:** repite la base con luz frontal, luz tenue y contraluz. Anota el contexto para no comparar condiciones distintas.

Registra manualmente perfil, escenario, delegado, resolución/FPS negociados, FPS medidos, latencia media/máxima, recuperación, pérdidas, resultados antiguos y falsos positivos observados. No se necesitan imágenes ni videos guardados. Rechaza una reducción de umbral si introduce falsas manos o empeora la estabilidad, aunque aumente el recuento de detecciones. Solo considera una combinación después de mejoras repetibles por separado.

Comprueba también desactivación durante captura/inferencia/carga, navegación, cambio de seña, reintento tras error y redimensionado. El indicador de webcam debe apagarse al salir. Para comprobar CPU, usa un entorno donde la inicialización GPU falle y confirma **CPU / worker**; no compares un perfil GPU con otro CPU como si solo hubiera cambiado el umbral.

**Estas pruebas físicas no se han realizado en esta sesión.** El servicio de control del navegador sigue sin estar disponible. Las cifras comparativas reales y la calidad de cada umbral quedan pendientes; las pruebas automatizadas no las sustituyen.

## Verificaciones automatizadas y archivos

Comandos: `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd test`. La batería incluye 53 pruebas: 17 añadidas sobre las 36 de la primera implementación. Cubren perfiles aislados, resolución, callbacks, exclusión de inferencias simultáneas, captura inmediata del fotograma más reciente, descarte de capturas/resultados antiguos, timestamps, cierre de bitmaps, cancelaciones, recuperación/latencia de eventos controlados, continuidad sin puntos inventados, transporte del Worker y alternativa CPU con cargador ESM. Los ensayos del modelo usan dobles de prueba; el HTTP comprueba recursos reales locales.

Archivos de esta optimización: `config.ts`, `types.ts`, `handLandmarker.ts`, `detectionSession.ts`, `useHandDetection.ts`, `drawHandLandmarks.ts` y los nuevos `workerProtocol.ts`, `handDetection.worker.ts`, `inferenceBackend.ts`, `trackingContinuity.ts`, `performanceMetrics.ts`, `HandDiagnostics.tsx`, todos bajo `src/features/sign-recognition/`. También se adaptan `PracticeCamera.tsx`, `CameraPage.css`, `vite.config.ts`, las dos pruebas de manos, la fixture `scripts/fixtures/wasm-factory.mjs` y la documentación.

No se cambia el modelo oficial, el número de manos, sus 21 puntos, las reglas de progreso ni los componentes de Aprender, Biblioteca, Situaciones o Mi progreso. Los fotogramas se transfieren únicamente al Worker local, se liberan tras usarlos y no se guardan ni se envían a servidores. No se añaden dependencias ni clasificación de señas.

Fuentes: [Hand Landmarker, opciones y seguimiento](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker), [requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback), [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas), [hilos e inferencia síncrona en MediaPipe](https://developers.google.com/edge/mediapipe/solutions/tasks). Se inspeccionaron además los tipos y cargadores de la versión instalada 1.2.3.
