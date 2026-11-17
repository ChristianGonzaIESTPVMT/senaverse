# Hito 1: detección de manos con MediaPipe

La segunda optimización de este hito se documenta en la [guía de continuidad, Worker y diagnóstico](hand-tracking-optimization.md).

## Alcance

La cámara compartida ejecuta **Hand Landmarker Full** de MediaPipe sobre el video real de la webcam y dibuja los landmarks obtenidos por el modelo. La aplicación no genera puntos ficticios. Las tres vistas que reutilizan `PracticeCamera` reciben la detección: Práctica libre, Desafío y la práctica de una escena de Situaciones.

Se muestran hasta dos manos, cada una con sus 21 puntos y sus conexiones anatómicas. Este hito no clasifica señas, no predice palabras, no muestra precisión, no registra actividades ni XP y no verifica respuestas de Situaciones. El sistema de progreso permanece independiente.

## Archivos creados

- `src/features/sign-recognition/config.ts`: VIDEO, dos manos, umbrales base en 0.5, objetivo máximo de 30 detecciones/s, perfiles de ensayo y rutas de recursos.
- `src/features/sign-recognition/types.ts`: tipos del resultado real de MediaPipe, estados y mensajes.
- `src/features/sign-recognition/handLandmarker.ts`: carga diferida de la librería, inicialización serializada, GPU con alternativa CPU y cierre.
- `src/features/sign-recognition/useHandDetection.ts`: ciclo de vida de React, reintento del detector, observación del tamaño y referencia al último resultado.
- `src/features/sign-recognition/detectionSession.ts`: ciclo de fotogramas nuevos, límite de frecuencia, estados y cancelaciones.
- `src/features/sign-recognition/drawHandLandmarks.ts`: puntos, conexiones, limpieza y geometría del Canvas.
- `public/models/hand_landmarker.task`: modelo oficial Full FP16, versión 1, de 7 819 105 bytes.
- `public/models/README.md`: procedencia, versión y SHA-256 del modelo.
- `scripts/sync-mediapipe-assets.mjs`: copia de los WASM correspondientes a la versión instalada.
- `scripts/hand-detection.test.mjs`: pruebas de dibujo, geometría, estados, fotogramas y liberación.
- `scripts/hand-landmarker.test.mjs`: pruebas de inicialización, alternativa CPU, serialización, cancelaciones y carga HTTP de recursos.
- `docs/hand-landmarker-hito-1.md`: esta documentación y guía de validación.

## Archivos modificados

- `src/components/PracticeCamera.tsx`: añade el hook, Canvas, estados, reintento del detector y mensaje de procesamiento local. Conserva los permisos, errores y liberación del MediaStream existentes.
- `src/pages/CameraPage.css`: superposición, espejo idéntico en video/Canvas y estilos del error/reintento.
- `package.json` y `package-lock.json`: dependencia exacta `@mediapipe/tasks-vision@1.2.3` y preparación automática de WASM en instalación, desarrollo, compilación y pruebas.
- `.gitignore`: excluye los WASM generados desde la dependencia instalada.
- `README.md`: acceso a esta guía.

## Inicialización y recursos

Solo después de activar la webcam se importa `@mediapipe/tasks-vision`. `FilesetResolver.forVisionTasks` carga los recursos locales de `public/mediapipe/wasm/`; `HandLandmarker.createFromOptions` abre el modelo local con GPU y vuelve a intentarlo con CPU si esa inicialización falla. El paquete JavaScript y los WASM corresponden a la misma versión exacta, sin CDN ni `@latest` en tiempo de ejecución.

Las dos rutas se construyen a partir de `import.meta.env.BASE_URL`. El archivo del modelo se incluye en el repositorio. Los WASM se generan desde `node_modules` con `npm install`/`npm ci` y también antes de `dev`, `build` y `test`; Vite copia ambos recursos a `dist`. Una compilación publicada no necesita Node ni acceso al registro npm para detectar manos.

El detector recibe el video original sin reflejar. El video usa `object-fit: cover`; el Canvas aplica la misma escala y recorte centrado, y ambos elementos se reflejan únicamente con CSS `scaleX(-1)`. `ResizeObserver` vuelve a dibujar el resultado al cambiar el contenedor, con respaldo en el evento `resize`.

`requestVideoFrameCallback` observa los fotogramas nuevos, con alternativa por animación. El Worker procesa una única imagen en curso y descarta datos antiguos, con un objetivo máximo de 30 detecciones/s condicionado al hardware. React actualiza el estado solo si cambia el mensaje o el número de manos; los landmarks permanecen en una referencia y en el Canvas.

Desactivar la webcam cancela inmediatamente el ciclo del detector, cierra MediaPipe y limpia los resultados/Canvas antes de detener las pistas de video. Desmontar el componente también desconecta el observador y los eventos de tamaño, cierra el detector y libera el MediaStream. Si se cancela mientras MediaPipe carga, se cierra la instancia en cuanto termina de crearse y no se inicia ningún ciclo tardío. Las inicializaciones se serializan para evitar solapamientos al remontar rápidamente o en React Strict Mode.

## Cómo probar con tu webcam

1. Ejecuta `npm install` si es una instalación nueva y luego `npm run dev`. En PowerShell puedes usar `npm.cmd`.
2. Abre la dirección que indique Vite. Entra en **Cámara → Práctica libre** y selecciona una seña de demostración.
3. Pulsa **Activar cámara** y concede el permiso del navegador. La cámara necesita localhost o HTTPS; para probar desde un móvil con la IP de tu computadora, configura HTTPS.
4. Comprueba la secuencia «Inicializando detector de manos...» y «Buscando manos...».
5. Muestra una mano y luego las dos: deben aparecer «1 mano detectada» y «2 manos detectadas», con 21 puntos por mano y las conexiones siguiendo los dedos.
6. Mueve las manos a ambos lados y cerca de los bordes. Comprueba que los puntos coincidan con el video reflejado. Cambia el tamaño de ventana y prueba orientación vertical en móvil.
7. Retira ambas manos: debe indicarse «Seguimiento temporalmente perdido», retirarse los puntos tras su breve retención y pasar a «No hay manos visibles en el encuadre».
8. Pulsa **Desactivar cámara**. Comprueba que desaparezca el indicador del navegador de webcam en uso. Repite activación/desactivación durante la carga y después de detectar manos.
9. Activa la webcam y navega a otra sección. Comprueba que se apague el indicador. Repite también al cambiar de seña en Práctica libre.
10. Abre **Desafío**, inicia la secuencia y activa su cámara. En **Situaciones**, comprueba una alternativa correcta y abre **Practicar con cámara**. Debe funcionar el mismo detector; no se desbloquea la verificación de la respuesta.
11. Prueba el permiso denegado: debe mostrarse un error de cámara, separado del estado del detector.
12. Para comprobar un error de carga sin cambiar archivos, bloquea temporalmente `models/hand_landmarker.task` en las herramientas de desarrollo del navegador y reactiva la cámara. Debe aparecer «No se pudo inicializar el detector. Inténtalo nuevamente» y el botón **Reintentar detector**. Desbloquea la solicitud y reintenta.

Para probar la compilación, ejecuta `npm run build` y `npm run preview`. También se admite `npm run build -- --base=/senaverse/`; en ese caso inicia la vista previa con `npm run preview -- --base=/senaverse/`.

## Pruebas y límites de la validación

Se ejecutan `npm run build`, `npm run lint` y `npm run test`. La batería completa incluye ahora 53 pruebas; la segunda optimización añade 17 sobre las 36 iniciales.

Las pruebas del hito verifican configuración y umbrales, rutas con subcarpetas, estados de cero/una/dos manos, dibujo de 21 puntos y conexiones, geometría del espejo/recorte, redimensionado, descarte de fotogramas repetidos, límite de frecuencia, limpieza, cancelación durante carga, cierre tras errores, alternativa GPU/CPU y serialización. Además, comprueban el SHA-256 del modelo oficial, la versión de los WASM y la entrega HTTP del módulo de cámara, modelo, loader y binario WASM bajo `/senaverse/`.

Las pruebas del ciclo y de inicialización utilizan dobles de prueba. No demuestran una inferencia real ni el acceso a la webcam: eso requiere completar la lista manual anterior. En esta sesión no fue posible usar el navegador interactivo porque el servicio de control de interfaz no estaba disponible. Quedan pendientes la prueba física de una/dos manos, el seguimiento visual, los permisos reales y la verificación del indicador de cámara al navegar.

La inferencia web es síncrona, pero ahora se ejecuta dentro de un Worker, con alternativa CPU en ese mismo Worker. Un dispositivo lento puede mostrar menos detecciones por segundo. Los umbrales base permanecen en 0.5; las alternativas requieren comparación física. La iluminación, el encuadre y las oclusiones afectan la detección; no se ha medido su calidad con hardware real en esta sesión.

Todo el procesamiento ocurre en el navegador. No se transmiten imágenes, no se guardan capturas y no se escribe información del detector en localStorage.

Documentación oficial consultada: [Hand Landmarker para web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js) y [configuración de MediaPipe web](https://developers.google.com/edge/mediapipe/solutions/setup_web).
