# Hand Landmarker Full

`hand_landmarker.task` es el paquete oficial Full FP16 de MediaPipe, versión 1. Contiene la detección de palmas y los 21 landmarks de cada mano; no clasifica señas ni palabras.

- Fuente: <https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task>
- Documentación: <https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker>
- Tamaño: 7 819 105 bytes.
- SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.

El archivo está incluido en el repositorio y Vite lo copia a `dist/models/hand_landmarker.task`. La aplicación resuelve su dirección con `import.meta.env.BASE_URL`.

Los WASM se copian desde la versión exacta instalada de `@mediapipe/tasks-vision` a `public/mediapipe/wasm/` mediante `scripts/sync-mediapipe-assets.mjs`. Esa carpeta se genera en `npm install`/`npm ci`, antes de iniciar desarrollo, antes de compilar y antes de las pruebas. No se descarga código ni el modelo de un CDN durante la detección.
