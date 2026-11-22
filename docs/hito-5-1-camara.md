# SeñaVerse · Hitos 5.0 y 5.1

Cámara usa la SVM V1 experimental en `/camara` y `/camara/libre`. El reconocimiento funciona en el navegador con los recursos del mismo servidor. El laboratorio conserva sus herramientas de diagnóstico y Dataset Studio conserva sus capturas locales. El entrenamiento de V2 queda aplazado.

## Auditoría de la plataforma

| Área | Funcional antes de este hito | Pendiente |
| --- | --- | --- |
| Navegación y estado | React Router organiza panel, academia, biblioteca, cámara, simulador, minijuegos, progreso y perfil. `StudentLayout` comparte navegación y tema. Los proveedores de perfil y progreso, `useLearningActivity` y `useSituationProgress` administran estado local. | Las sesiones se guardan en el navegador. La sincronización entre dispositivos queda fuera de este hito. |
| Aprender | El currículo y sus lecciones tienen rutas, actividades y registro local de avance. | Incorporar demostraciones revisadas y conectar una actividad dirigida con una seña compatible. |
| Biblioteca | El catálogo permite buscar y filtrar, abrir fichas y cargar videos si la entrada aporta uno. | Incorporar material audiovisual revisado y vincular identificadores de biblioteca con etiquetas de reconocimiento cuando correspondan. |
| Centro de práctica | `PracticeCamera` ya usaba MediaPipe real para visualizar manos. La página de entrada presentaba señas de demostración y actividad reciente sin datos. | Hito 5.1 conecta los modos libre y dirigido. El desafío todavía recorre una secuencia demostrativa y queda pendiente la evaluación de esa secuencia. |
| Situaciones | Las escenas registran y verifican elecciones, guardan respuestas y muestran resultados. Existe una vista de práctica con cámara. | Integrar objetivos de señas compatibles y diseñar el criterio de finalización de cada escena. |
| Minijuegos | Las tarjetas presentan los juegos previstos. | Implementar juego y reglas antes de conectar resultados de reconocimiento. |
| Perfil y progreso | Hay ajustes locales de perfil, respaldo y seguimiento de actividades. | Definir cómo registrar prácticas educativas deliberadas con el nuevo motor. |
| Herramientas internas | Dataset Studio usa IndexedDB para consentimiento, fotogramas, revisión y exportación. El laboratorio ya cargaba la SVM, procesaba ventanas y mostraba candidatos, confirmaciones y diagnóstico. La exportación histórica contiene 355 tomas. | Continuar las capturas y la validación de V2 cuando se retome ese trabajo. |

## Arquitectura compartida

1. `PracticeCamera` obtiene el permiso y el flujo de cámara. Una reserva común serializa las aperturas en la pestaña, incluso si la vista se desmonta mientras está abierto el aviso de permiso. Detener o desmontar la vista para las pistas y cancela el detector. El backend termina cualquier Worker en cierre antes de iniciar el siguiente.
2. `useHandDetection` y el Worker de MediaPipe conservan el canal de resultados frescos. El espejo y la visibilidad de los landmarks son propiedades de presentación. La inferencia recibe la geometría original incluso cuando se ocultan los puntos. La primera respuesta tiene un plazo de transporte de 10 s para el arranque en frío de GPU. Las siguientes mantienen 2 s y todas conservan el requisito de frescura de 120 ms para votar.
3. `useRecognition` comparte la carga del modelo, inicio y parada, vencimiento de resultados, interrupción cuando se oculta la pestaña y reinicio de la ventana. Usa `createRecognitionSession` para preprocesar, clasificar, rechazar o confirmar. La V1 conserva su ventana de 1350 ms, puntuación mínima de 0,75, margen de 0,40 y tiempos de confirmación originales.
4. `RecognitionMode` expresa modo libre o un objetivo por ID. `recognitionResult` entrega el estado educativo y, cuando corresponde, el ID confirmado y el resultado `recognized`, `matched` o `different`. `onConfirmed` se emite al entrar en una confirmación o al cambiar la seña confirmada. Un resultado puede volver a confirmarse después de una pérdida de seguimiento. Para contabilizar una actividad, el consumidor debe identificar el intento y decidir cuándo completarlo.
5. `RecognitionPractice` combina el motor, un selector, las instrucciones y la referencia. Otros módulos pueden incluir ese componente con `initialSign` o usar el mismo hook con sus propios controles. El punto de sustitución del modelo educativo es `loadEducationModel`. Las páginas trabajan con IDs y confirmaciones, con independencia del formato interno del clasificador.

En el Laboratorio, `useRecognition` usa el cargador de desarrollo y expone el diagnóstico existente. En Cámara, se muestran exclusivamente estados de práctica y señas confirmadas. La interfaz educativa presenta «Gesto no reconocido» al rechazar una candidata por cantidad de manos, conservando el motivo técnico en el Laboratorio.

## Distribución

- `public/models/lsp-v1.json` es una proyección de inferencia de **48 915 bytes**. Incluye etiquetas, preprocesamiento, escalador, pesos, temperatura y umbrales de la V1 congelada. SHA-256 `afd2aae852de7bb07f0318c3ed392353d11e1e89816b59265273454c781e83f3`. Está versionada para que una compilación funcione sin acceso a los archivos privados de entrenamiento.
- `scripts/export-recognition-v1.mjs` comprueba el hash del artefacto original y escribe únicamente los campos de inferencia. Las instalaciones y el build habitual usan la copia pública ya generada.
- Vite copia `hand_landmarker.task` y el WASM de la misma versión 1.2.3 de MediaPipe. El Worker y el SDK se empaquetan en `dist/assets`. El modelo se carga desde `BASE_URL`. No se envían imágenes, puntos ni resultados a servicios externos.
- Publica el contenido de `dist/` y habilita la resolución de rutas de la SPA a `index.html`. La cámara requiere HTTPS o localhost y permiso del navegador. La guía ilustrada del MINEDU es un enlace externo que se abre por decisión de la persona usuaria. [Especificación de permisos de cámara](https://w3c.github.io/mediacapture-main/#security-and-permissions) · [Ficha del MINEDU en ALICIA](https://alicia.concytec.gob.pe/vufind/index.php/Record/MIIN_a99ba3532e88df544c391ae31f16f5e5/Details)
- Dataset Studio, Laboratorio y su endpoint de artefactos de laboratorio existen solo en desarrollo. Los datasets, grabaciones, participantes y artefactos de entrenamiento se mantienen en sus directorios privados y están bloqueados por Vite en desarrollo. En producción se sirve el contenido compilado de `dist/`.

## Cámara

- Activa o detiene la cámara desde la vista. Si se deniega el permiso o falla la carga del modelo o del detector, se informa el problema y se puede reintentar.
- Practica en modo libre o elige una de las diez señas del catálogo. Los enlaces antiguos de práctica para señas compatibles siguen abriendo la seña correspondiente. Un enlace a una seña ajena al modelo muestra un aviso en Cámara.
- Consulta la seña confirmada, el resultado respecto del objetivo, los estados de búsqueda y rechazo, las instrucciones y la página ilustrada correspondiente. Cambiar el objetivo o reintentar borra la evidencia de la práctica anterior.
- Los puntos de la mano son opcionales. El reconocimiento se identifica como experimental. El resultado se mantiene dentro de la sesión de Cámara.

## Archivos de este hito

| Área | Creados o modificados |
| --- | --- |
| Motor y ciclo de vida | `src/features/sign-recognition/useRecognition.ts`, `recognitionResult.ts`, `cameraAccess.ts`, `inferenceBackend.ts`, `src/components/PracticeCamera.tsx` |
| Catálogo, distribución y rutas | `src/features/sign-recognition/educationModel.ts`, `recognitionCatalog.ts`, `labModel.ts`, `src/App.tsx`, `public/models/lsp-v1.json`, `scripts/export-recognition-v1.mjs`, `.gitattributes` |
| Experiencia de práctica | `src/components/RecognitionPractice.tsx`, `src/pages/CameraPage.tsx`, `CameraPage.css`, `FreePracticePage.tsx`, `RecognitionLabPage.tsx` |
| Verificación | `scripts/recognition-integration.test.mjs`, `scripts/hand-detection.test.mjs`, `scripts/hand-landmarker.test.mjs`, `scripts/recognition-lab-browser.mjs` |
| Documentación | `README.md`, `docs/hito-5-1-camara.md` |

## Pruebas y continuación

| Verificación | Resultado |
| --- | --- |
| TypeScript, lint y build Vite | Correctos. El build con ambos interruptores internos activados siguió excluyendo Laboratorio y Dataset Studio. |
| Pruebas automatizadas | 181 de la aplicación, 6 del lector web y 13 del pipeline de Python. |
| Cámara en Chromium de desarrollo y producción | Carga de V1 y MediaPipe, estados sin manos, permiso denegado, modelo ausente y recuperación, una sola cámara y un solo Worker activo, limpieza al detener o navegar, tema claro y oscuro y vista de 390 px. |
| Reconocimiento en navegador | El build de producción confirmó Con al reproducir una de las tomas guardadas. Se comprobó el resultado libre, el acierto dirigido, el aviso ante un objetivo distinto y el rechazo de una toma negativa guardada. |
| Laboratorio y privacidad | V1 siguió cargando en desarrollo. Se verificaron el selector, el aviso de V2 pendiente, el reinicio y la liberación de recursos. El servidor de producción no entregó las rutas privadas de muestra. |
| Datos originales | El SHA-256 de la exportación histórica de 355 tomas coincide con el registrado al preparar V1. |

```powershell
npx.cmd tsc -b --pretty false
npm.cmd run lint
npm.cmd test
npm.cmd run build
node --test ml/tests/web.test.mjs
& .\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
$chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/recognition-lab-browser.mjs $chrome
node scripts/recognition-lab-browser.mjs $chrome student-development
node scripts/recognition-lab-browser.mjs $chrome student-production ml/datasets/senaverse-dataset-dataset-json.json
```

El modo de prueba de navegador usa cámara simulada para verificar cero manos, permiso denegado, recurso ausente, exclusión mutua, cambio de objetivo, landmarks, tema y limpieza al detener o navegar. Al pasar una exportación local como cuarto argumento, además reproduce los puntos de una toma real de Con a través del clasificador y comprueba el resultado libre y dirigido. Esta reproducción no mide capturas físicas nuevas ni reemplaza la evaluación de campo.

Las limitaciones conocidas de V1 siguen vigentes. El Hito 4.3 documenta menor robustez con la izquierda y limitaciones en las trayectorias, la verificación de movimiento y el rechazo. En la reproducción histórica V1 confirmó cuatro de siete negativos. Conviene probar en cámara física con varias personas y contrastar la referencia con revisión lingüística antes de usar la salida como evaluación académica.

Para 5.2, integra primero una actividad dirigida en **Aprender** con una de las diez señas y una demostración revisada. Conserva el intento y su cierre como acciones de la actividad. Usa el mismo catálogo para el enlace desde **Biblioteca**. Una vez validada esa integración, la misma interfaz puede alimentar el desafío de práctica o una escena de **Situaciones**. Los **Minijuegos** pueden adoptar ese mecanismo cuando tengan una lógica de juego propia.
