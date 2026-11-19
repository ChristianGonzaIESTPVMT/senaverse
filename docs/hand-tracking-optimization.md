# Hito 1 — Continuidad y latencia del seguimiento

## Qué se identificó

El primer ciclo ejecutaba `detectForVideo` de forma síncrona en el hilo principal. La implementación optimizada ya utilizaba Worker y GPU/CPU, pero la investigación de las pérdidas intermitentes identificó dos fallos de lógica reproducibles sin modificar MediaPipe ni los umbrales:

1. **La retención visual quedaba anulada al caducar la frescura.** Un resultado capturado en 0 ms y recibido en 110 ms se dibujaba hasta 120 ms; entonces pasaba a pérdida y se borraba inmediatamente. Aunque se programaba un temporizador de retención, la condición de visibilidad seguía exigiendo una edad inferior a 120 ms, haciendo imposible esa retención al caducar un resultado. Esto permite parpadeos por caducidad aun cuando el modelo devuelve manos.
2. **Se descartaban capturas aún recientes al cambiar el token de cámara durante `createImageBitmap`.** Una captura de 40 ms se rechazaba simplemente por haber llegado otro fotograma, aunque todavía cumpliera el límite de frescura. En capturas lentas podía haber descartes reiterados sin inferir esos fotogramas reales.

Además, se redibujaba y limpiaba el Canvas aun si no cambiaban puntos, opacidad ni geometría, y todos los fallos acababan presentándose como errores de inicialización, perdiendo la excepción original del Worker. Son hallazgos de código y regresiones simuladas, **no una atribución definitiva de todas las pérdidas físicas observadas en Brave**. No se ha demostrado que el modelo deje de detectar por sus umbrales.

MediaPipe usa seguimiento entre fotogramas. `minTrackingConfidence` compara el IoU de las cajas de la mano entre fotogramas; si falla el seguimiento, o la presencia cae por debajo de `minHandPresenceConfidence`, puede volver a detectar la palma. Desplazamientos grandes entre muestras y desenfoque por movimiento son posibles causas de las pérdidas. Esta explicación está respaldada por la documentación del algoritmo; no es un diagnóstico físico medido en este equipo.

## Cambios

- Inferencia en un Worker de módulo con OffscreenCanvas. GPU primero y alternativa CPU dentro del mismo Worker. La captura y el dibujo permanecen en la interfaz; React no ejecuta inferencias.
- `requestVideoFrameCallback` cuando está disponible. Alternativa con `requestAnimationFrame`, `currentTime` y los contadores de reproducción disponibles.
- Una sola captura/inferencia en curso. No se guarda una cola de imágenes. Un bitmap reciente se puede inferir aunque durante su creación llegue otro fotograma; los bitmaps caducados se cierran antes de inferir. Al terminar se captura directamente el video actual si hay un fotograma nuevo pendiente, conservando solo sus metadatos.
- Timestamps monotónicos de `performance.now()`, con incremento mínimo y validación adicional en el Worker. El identificador y timestamp del resultado deben coincidir con la solicitud en curso.
- El timestamp se toma al solicitar el bitmap, no al recibir un callback de cámara anterior. Resultados con más de 120 ms desde esa solicitud se descartan tanto para detección como para Dataset Studio. Este límite sigue siendo el anterior; no es una latencia garantizada ni una medición del sensor.
- Cámara con valores **ideales** de 640 × 480 y 30 FPS, sin `exact` ni mínimos obligatorios. Se leen los valores reales negociados mediante `MediaStreamTrack.getSettings()`.
- Resolución de procesamiento independiente de la presentación: hasta 640 × 480, preservando la proporción de la cámara. Por ejemplo, una cámara de 1280 × 720 se procesa a 640 × 360. El video y Canvas conservan su tamaño visual, recorte y espejo existentes.
- Cierre de ImageBitmap, cancelación de callbacks y temporizadores, cancelación de cargas y terminación del Worker al apagar o desmontar. Un Worker ocupado se termina inmediatamente; si está libre se permite cerrar el detector y se aplica un límite de 50 ms para terminarlo.
- Redibujado solo al cambiar el resultado visible, su opacidad o la geometría del Canvas/video. Un cambio de tamaño sigue reproyectando los puntos; redibujar no emite detecciones nuevas.
- Los fallos conservan etapa (`initialization`, `capture`, `inference`, `render`, `worker`) y detalle técnico acotado, sin stacks, imágenes o fotogramas. Si fallan GPU y CPU durante el inicio, se conservan ambas causas. Un error de inferencia ya no se anuncia como fallo de inicialización. No se reinicia silenciosamente el detector ni se mezcla GPU/CPU a mitad de una captura.

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

Los resultados frescos se dibujan directamente, sin promedios ni extrapolación. Un resultado vacío después de detectar manos, o la caducidad del último resultado, puede conservar sus últimos puntos **reales**, atenuados a 0.45 de opacidad, durante un máximo de 80 ms desde la pérdida y sin superar 200 ms desde la solicitud del bitmap original (120 ms de frescura más 80 ms visuales). Los resultados vacíos sucesivos y los redibujados no reinician ese plazo. Durante la retención el estado es «Seguimiento temporalmente perdido» y el recuento detectado es cero. El panel indica **Continuidad temporal · puntos anteriores atenuados**.

El límite adicional es exclusivamente visual. El canal `onFreshInference` mantiene la admisión estricta de 120 ms, emite una vez cada resultado real aceptado e incluye resultados reales de cero manos. La retención, su caducidad, el redimensionado y los resultados antiguos no emiten observaciones. No se altera la estructura de muestras, su configuración ni los datos guardados. Una prueba conecta el controlador de seguimiento al capturador real de Dataset Studio y comprueba que la secuencia contiene el resultado real y el vacío, pero ningún punto retenido ni resultado tardío.

Cuando se detecta una de dos manos, se dibuja el resultado nuevo de esa mano; no se duplica ni se inventa la mano ausente. Se indica la pérdida temporal de la otra mano. Tras una ausencia sostenida de 300 ms, el mensaje pasa a «No hay manos visibles en el encuadre».

La ausencia de resultados no permite distinguir con certeza una mano fuera del campo de una mano ocluida o desenfocada. Por eso el mensaje describe lo que el detector ve y no afirma conocer la causa de la ausencia.

## Activar el panel temporal

1. Ejecuta `npm.cmd run dev` y abre `/camara/libre?handDebug=1`. El mismo parámetro funciona en `/herramientas/dataset?handDebug=1` si Dataset Studio está habilitado.
2. Selecciona una seña y activa la cámara. El panel aparece bajo los controles de cámara.
3. Si quieres mantener el diagnóstico al navegar por Desafío/Situaciones, añade localmente `VITE_HAND_DEBUG=true` a `.env.development.local` y reinicia Vite. El archivo ya está excluido de Git.
4. «Desactivar diagnóstico» oculta el panel y restablece el perfil base. Quitar el parámetro y recargar también lo desactiva.

El panel está limitado a `import.meta.env.DEV`: no se carga en producción aunque la URL tenga el parámetro. Las métricas se publican como máximo dos veces por segundo; los landmarks no se almacenan en el estado de React.

Se muestran FPS de cámara, respuestas de inferencia y resultados aceptados; latencia media/máxima, tiempo de inferencia, pérdidas y recuperaciones; respuestas totales y aceptadas; fotogramas reales sin detección (todos los devueltos por el modelo y solo los aceptados); recuento del último resultado frente al recuento fresco; delegado GPU/CPU, resoluciones y FPS negociados. También se distinguen descartes por edad/orden/pausa, capturas caducadas, fotogramas saltados por la cámara o sustituidos antes de procesar, oportunidades limitadas por frecuencia, respuestas con ID/timestamp incorrectos, caducidades y retenciones visuales. Antes de disponer de datos suficientes se muestra «—».

El SDK instalado expone `handedness[].score`, junto con las coordenadas normalizadas y world landmarks. Ese score clasifica izquierda/derecha; **no es la confianza de detección ni presencia de la mano**. No se exponen aquí scores por fotograma de detección, presencia o IoU. El panel y el reporte distinguen explícitamente esa limitación.

Se puede asignar un escenario, introducir el número de episodios de falsos positivos observados por el operador y descargar un JSON. El valor vacío de falsos positivos se exporta como `null`, nunca como cero supuesto. El reporte contiene contadores reales, la configuración efectiva y el contexto indicado por el operador; no contiene imágenes, video, landmarks ni muestras. No es el esquema del dataset ni se importa en Dataset Studio. El diagnóstico sigue publicándose cada 500 ms; los landmarks no pasan al estado de React.

Interpretación:

- Los FPS se calculan sobre una ventana de 2 segundos. El FPS negociado de `getSettings()` se muestra aparte y no se presenta como una medición real.
- La fuente preferida es `presentedFrames` de los callbacks de video. Si solo existe muestreo por animación, se identifica como `sampled`; esa ruta puede subestimar fotogramas no observados.
- La latencia mide desde la solicitud del bitmap hasta recibir el resultado, incluyendo captura, transferencia e inferencia. No mide exposición del sensor ni tiempo hasta iluminar la pantalla. El tiempo medio de inferencia del Worker se presenta por separado.
- El FPS de inferencia cuenta también inferencias cuyo resultado acabó descartado por antigüedad. El contador de resultados antiguos permite reconocer ese caso.
- Una pérdida es una caída del número de manos de resultados frescos. La recuperación es el regreso al número anterior, medido entre los fotogramas correspondientes; no identifica una mano individual ni mide falsos positivos.
- Los descartes de fotogramas incluyen saltos observables, metadatos sustituidos por otros más nuevos y capturas caducadas. Los resultados antiguos se contabilizan por separado. Una oportunidad de cámara limitada por frecuencia no es una inferencia ejecutada; su contador se muestra aparte.
- «Reiniciar medición» limpia los acumulados sin recargar el modelo. Cambiar el perfil reinicia el detector y la medición para no mezclar configuraciones.

## Comparación anterior y posterior

| Aspecto | Antes de esta corrección | Después de esta corrección |
| --- | --- | --- |
| Inferencia | Worker, GPU/CPU | Worker, GPU/CPU, una tarea en curso |
| Umbrales por defecto | 0.5 / 0.5 / 0.5 | 0.5 / 0.5 / 0.5 |
| Bitmap de 40 ms con nuevo callback de cámara | Se descartaba por cambio de token | Se admite si sigue reciente; no se encola otra imagen |
| Resultado capturado en 0 ms, recibido en 110 ms | Borrado a los 120 ms | Detección hasta 120 ms y retención atenuada hasta 200 ms como máximo |
| Redibujados idénticos | Limpiaban y dibujaban de nuevo | No limpian ni repintan |
| Inicialización e inferencia fallidas | Mensaje genérico de inicialización | Etapa y detalle originales, con causas GPU y CPU cuando corresponda |
| Detecciones para Dataset Studio | Canal fresco, máximo 120 ms | Mismo canal y máximo, sin retención visual |
| FPS reales en el i7/Iris Plus | Sin medición disponible | Pendientes de medición física |
| Latencia y pérdidas reales | Sin medición disponible | Pendientes de medición física |

Los tiempos de las filas de bitmap y continuidad son relojes controlados de pruebas de regresión. No son resultados de webcam. El Canvas ejecutó cero limpiezas adicionales ante dos redibujados idénticos en esa prueba, y sí se redibujó al cambiar su tamaño.

El objetivo de 20–30 FPS es orientativo. No se afirma haberlo conseguido. El desenfoque de la webcam, su exposición, oclusiones, CPU/GPU, controladores y carga de Brave siguen limitando el seguimiento. Un resultado que tarda más de 120 ms se descarta deliberadamente: en un equipo muy lento puede haber pocos puntos visibles en vez de mostrar puntos atrasados. El diagnóstico permite detectar ese caso.

## Protocolo físico para el equipo de referencia

Equipo indicado: Intel Core i7-1065G7, Intel Iris Plus integrada, 8 GB, Windows y Brave. Registrar versión del navegador, webcam usada, iluminación, distancia, aplicaciones abiertas y estado actual de aceleración gráfica. Mantener esas condiciones entre ensayos, sin modificar ajustes de seguridad o aceleración. La resolución y los FPS efectivos se leen del panel, no se presuponen por el equipo.

Empieza con el perfil base en `/camara/libre?handDebug=1`, fuera de una grabación del dataset. Espera 3–5 segundos de calentamiento, confirma delegado y resolución, selecciona escenario y pulsa **Reiniciar medición**. Realiza cada escenario durante **10 segundos** y descarga su reporte. Anota la duración efectiva del contador: puede exceder 10 s por el tiempo empleado en pulsar Descargar, por lo que no debe presentarse como una ventana de exactamente 10 s. Las comparaciones de FPS usan tasas medidas y los recuentos de episodios deben relacionarse con esa duración efectiva.

| Escenario | Qué observar | Base | Presencia 0.45 | Seguimiento 0.40 | Seguimiento 0.35 |
| --- | --- | --- | --- | --- | --- |
| Una mano quieta, 10 s | Pérdidas sin movimiento, alineación de los 21 puntos | Pendiente | Pendiente | Pendiente | Pendiente |
| Una mano con movimientos lentos | Continuidad y latencia del recorrido | Pendiente | Pendiente | Pendiente | Pendiente |
| Una mano cambiando de orientación | Oclusión y recuperación | Pendiente | Pendiente | Pendiente | Pendiente |
| Una mano desplazándose lateralmente | Descartes y alineación durante el desplazamiento | Pendiente | Pendiente | Pendiente | Pendiente |
| Una mano abriendo/cerrando los dedos | Pérdidas al cambiar la configuración manual | Pendiente | Pendiente | Pendiente | Pendiente |
| Dos manos quietas | Pérdidas parciales y simultaneidad real | Pendiente | Pendiente | Pendiente | Pendiente |
| Dos manos con movimientos simultáneos | Conteo, pérdidas y recuperación de ambas | Pendiente | Pendiente | Pendiente | Pendiente |

Repite cada escenario con presencia 0.45, seguimiento 0.40 y seguimiento 0.35, modificando **una variable por vez**. El selector conserva 0.5 en las otras dos. Intercala una nueva medición base para detectar deriva por iluminación o calentamiento; repite si las diferencias son pequeñas. No compares un perfil ejecutado en GPU con otro en CPU como si solo cambiara el umbral.

Añade el control **ninguna mano visible** durante 10 s por perfil. Registra manualmente falsos positivos tanto en ese control como en las secuencias con manos: puntos sobre el fondo, manos inexistentes o trazados claramente desalineados. Usa el mismo criterio de episodio en todas las tomas, separando episodios tras un segundo sin el falso positivo. Deja el campo vacío si no se evaluó; introduce cero solo si se observó explícitamente su ausencia. El software no puede deducir la verdad física de sus propios landmarks.

Conserva por reporte perfil, escenario, delegado, resolución/FPS negociados, FPS medidos, latencia media/máxima, pérdidas, recuperaciones, fotogramas vacíos, descartes por antigüedad/identidad, retenciones visuales y falsos positivos observados. No se necesitan imágenes ni videos guardados. Rechaza una reducción si introduce falsas manos o empeora la alineación aunque aumente las detecciones. Ninguna variante sustituye al perfil base sin evidencia física repetible.

Para interpretar A–F: un aumento de fotogramas vacíos del modelo señala A; resultados devueltos con manos pero descartados por edad señalan B; respuestas con identidad incorrecta señalan C; retenciones y redibujados sin nuevas inferencias permiten revisar D; la etapa/detalle del fallo permite investigar E. F requiere comparar perfiles con condiciones controladas y observar falsos positivos; los contadores por sí solos no prueban que bajar un umbral sea correcto.

Comprueba también desactivación durante captura/inferencia/carga, navegación, cambio de seña, reintento tras error y redimensionado. El indicador de webcam debe apagarse al salir. Para comprobar CPU, usa un entorno donde la inicialización GPU falle y confirma **CPU / worker**; no compares un perfil GPU con otro CPU como si solo hubiera cambiado el umbral.

**Estas pruebas físicas no se han realizado por el agente en esta sesión.** El servicio de acceso al navegador sigue sin estar disponible. No se han recibido mediciones de los siete escenarios; la tabla permanece pendiente y no se rellenó con datos simulados. Las cifras comparativas reales y la calidad de cada umbral siguen pendientes; las pruebas automatizadas no las sustituyen.

## Verificaciones automatizadas y archivos

Comandos: `npm.cmd run build`, `npx.cmd tsc -b --pretty false`, `npm.cmd run lint` y `node --experimental-strip-types --test --test-concurrency=1 scripts/*.test.mjs`. La ejecución en serie evita conflictos de la caché compartida de Vite en Windows. Las regresiones cubren latencia de 110 ms y caducidad visual, cero manos, pérdidas parciales, recuperación, bitmaps recientes/caducados, ausencia de colas e inferencias simultáneas, sincronización de IDs/timestamps, redibujado, cancelación, integridad de la secuencia de Dataset Studio, reportes y errores de inicialización/inferencia del Worker. Los ensayos del modelo usan dobles de prueba; el HTTP comprueba recursos reales locales.

Resultado automatizado de esta corrección: **152 pruebas aprobadas**, incluidas 50 focalizadas de seguimiento, Worker y diagnóstico; TypeScript y ESLint aprobados. Se comprobó por SHA-256 la conservación de los archivos de catálogo, formato/captura/exportación/almacenamiento del dataset, perfil, progreso y rutas. El modelo local y los cargadores WASM respondieron HTTP 200 en el servidor de desarrollo. Esto no certifica la inicialización física en Brave ni el rendimiento de la webcam.

Archivos de esta corrección: `trackingContinuity.ts`, `detectionSession.ts`, `performanceMetrics.ts`, `types.ts`, `useHandDetection.ts`, `HandDiagnostics.tsx`, `handLandmarker.ts`, `handDetection.worker.ts`, `workerProtocol.ts`, `inferenceBackend.ts` y el nuevo `detectionErrors.ts`, todos bajo `src/features/sign-recognition/`. También `src/pages/CameraPage.css`, `scripts/hand-detection.test.mjs`, `scripts/hand-landmarker.test.mjs`, el nuevo `scripts/hand-diagnostics-ui.test.mjs`, esta guía y `README.md`.

`config.ts` conserva los cuatro perfiles, el límite de 120 ms, los 80 ms de retención, dos manos y VIDEO. Los archivos de catálogo, tipos de muestras, controlador de captura, validación/importación, almacenamiento y ruta del Studio se conservan sin cambios en esta corrección; no se aplican migraciones.

No se cambia el modelo oficial, el número de manos, sus 21 puntos, las reglas de progreso ni los componentes de Aprender, Biblioteca, Situaciones o Mi progreso. Los fotogramas se transfieren únicamente al Worker local, se liberan tras usarlos y no se guardan ni se envían a servidores. No se añaden dependencias ni clasificación de señas.

Fuentes: [Hand Landmarker, opciones y seguimiento](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker), [requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback), [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas), [hilos e inferencia síncrona en MediaPipe](https://developers.google.com/edge/mediapipe/solutions/tasks). Se inspeccionaron además los tipos y cargadores de la versión instalada 1.2.3.
