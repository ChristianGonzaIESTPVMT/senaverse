# Hito 5.3 · Biblioteca interactiva de LSP

## Auditoría

| Área | Estado inicial | Integración |
| --- | --- | --- |
| Biblioteca | Dieciocho fichas de muestra, siete categorías, búsqueda por palabras y tildes, paginación y diálogo nativo. Las tarjetas usaban iconos decorativos y carecían de medios asociados. | Reutiliza búsqueda, categorías, cuadrícula, paginación y diálogo. Añade filtros combinables, contador, estado vacío, fichas enlazables, referencias visuales y compatibilidad por seña. |
| Favoritos y progreso | Los favoritos se almacenaban aparte y funcionaban como una categoría. El registro de consultas usaba identificadores como `uno`. | Guarda favoritos en el perfil local y combina el filtro con búsqueda y categoría. Migra los identificadores antiguos y cuenta una sola consulta por seña. |
| Aprender | Números básicos ya tenía una lámina, instrucciones, prácticas y progreso persistente. Las lecciones introductorias seguían siendo prototipos. | Los números Uno a Cinco enlazan en ambas direcciones con sus fichas. Los enlaces a Biblioteca conservan la reanudación de la lección. |
| Cámara | Ya ofrecía rutas de práctica libre y dirigida con V1. Biblioteca carecía de enlaces hacia la práctica. | La ficha pasa el ID de clase a la ruta dirigida existente. La cámara requiere una acción explícita. El motor, la confirmación y los umbrales conservan su comportamiento. |
| Dataset Studio y Laboratorio | Herramientas de desarrollo con catálogo técnico, datos locales y diagnóstico del reconocedor. | Conservan su catálogo, sus rutas de desarrollo y la categoría técnica `NEG-001`. |

## Catálogo y navegación

`src/data/library.ts` concentra el significado, la categoría, las instrucciones, los medios opcionales, la configuración de manos, la fuente y el estado de revisión. Los IDs educativos permanecen estables. Los diez IDs `LSP-001` a `LSP-010` apuntan explícitamente a sus clases V1. `Cero` tiene referencia e instrucciones de estudio y abre una opción de repaso visual. Las fichas se abren con `/biblioteca?sena=<id>`. Un ID inválido o técnico muestra un aviso y permite volver al catálogo.

El catálogo ofrece 25 fichas. Once tienen referencias ilustradas y 14 conservan su significado general con indicación de referencia e instrucciones pendientes. La disponibilidad de cámara y la validación lingüística se muestran por separado. Las 25 fichas indican revisión pendiente.

- Cero a Cinco comparten la figura 2 de la página impresa 72, página 14 del PDF. Números básicos usa las mismas instrucciones y la misma lámina. [Orientaciones para la atención de estudiantes con discapacidad auditiva](https://formacionenservicio.minedu.gob.pe/sifods/centro-recurso/2022/Lineas-de-formacion-priorizadas/Mejora-de-Aprendizajes/Atencion-a-la-diversidad/Cartilla/orientaciones-discapacidad-auditiva.pdf#page=14).
- Sí, Nada y Mucho enlazan a la página 134. Solo y Con enlazan a la página 135. Se comprobó el contenido ilustrado de ambas páginas. [Guía para el aprendizaje de la lengua de señas peruana, vocabulario básico](https://repositorio.minedu.gob.pe/handle/20.500.12799/5545).

Las fichas abren las páginas originales del MINEDU en otra pestaña. Se necesita conexión para consultar esos documentos. El catálogo admite imágenes, video y subtítulos cuando haya material autorizado. La aplicación conserva el reconocimiento y el progreso local.

Al leer un perfil anterior, los marcadores de `senaverse-library-saved-v1` se recuperan, se convierten a IDs actuales y se deduplican. El siguiente guardado los incorpora al perfil compartido. Una lista vacía indica que el estudiante quitó todos sus favoritos. El respaldo del perfil incluye los favoritos y los datos existentes se conservan.

## Archivos

| Área | Archivos |
| --- | --- |
| Biblioteca y catálogo | `src/data/library.ts`, `src/pages/LibraryPage.tsx`, `src/pages/LibraryPage.css` |
| Aprender y Cámara | `src/data/numbersLesson.ts`, `src/components/LessonSequence.tsx`, `src/components/RecognitionPractice.tsx`, `src/pages/AcademyPage.css`, `src/pages/LessonPage.tsx` |
| Perfil, progreso y compatibilidad de IDs | `src/data/profile.ts`, `src/data/progress.ts`, `src/components/StudentProfileProvider.tsx`, `src/hooks/profileContext.ts`, `src/data/practice.ts`, `src/pages/SituationScenePage.tsx` |
| Pruebas | `scripts/educational-catalog.test.mjs`, `scripts/fixtures/library-browser.mjs`, `scripts/recognition-lab-browser.mjs` |

## Verificación

| Verificación | Resultado |
| --- | --- |
| TypeScript, lint y build | Correctos. |
| Pruebas automatizadas | 190 de la aplicación, 6 del lector web y 13 del pipeline de Python. |
| Biblioteca en Chromium | Correcta en desarrollo y producción. Se comprobó búsqueda con tildes, filtros combinados, alta y baja de favoritos, migración y recarga, enlaces directos, IDs inválidos, cierre y retorno del foco con Escape, modo oscuro y ancho de 390 px. |
| Números básicos en Chromium | La lección se reanuda al volver desde Biblioteca. El recorrido de producción conserva la evaluación, el guardado único, el manejo del permiso denegado y la liberación de recursos. |
| Cámara en Chromium | El enlace preselecciona Tres en modo dirigido. El modelo local carga y el navegador no solicita el dispositivo ni crea un Worker antes de la activación. La regresión de producción confirmó la seña Con en modos libre y dirigido, rechazó una toma negativa y liberó la cámara y el Worker. |
| Laboratorio en Chromium | En desarrollo se verificaron selección de versiones, recurso ausente, recuperación, práctica dirigida y liberación de recursos. |
| Integridad y privacidad | El SHA-256 de la exportación de 355 tomas coincide con el manifiesto histórico. La copia pública del modelo coincide con la incluida en el build y el directorio privado `ml` queda fuera de `dist`. |

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
node --test ml/tests/web.test.mjs
& .\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
$libraryChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$libraryDataset = 'ml/datasets/senaverse-dataset-dataset-json.json'
node scripts/recognition-lab-browser.mjs $libraryChrome library-development
node scripts/recognition-lab-browser.mjs $libraryChrome library-production
node scripts/recognition-lab-browser.mjs $libraryChrome lesson-production $libraryDataset
node scripts/recognition-lab-browser.mjs $libraryChrome student-production $libraryDataset
node scripts/recognition-lab-browser.mjs $libraryChrome lab
```

Las pruebas de reconocimiento usaron capturas históricas y el clasificador V1 real. La prueba del dispositivo usó la cámara de prueba de Chromium. El navegador accedió únicamente al servidor local durante esos recorridos.

## Contenido pendiente

La Biblioteca requiere completar las referencias e instrucciones de 14 fichas y revisar lingüísticamente el contenido existente. Aprender tiene un recorrido funcional para Números básicos y mantiene el resto del currículo como antes. Centro de práctica, Situaciones y Minijuegos quedan disponibles para integraciones posteriores. Para añadir vocabulario, incorpora primero la fuente de LSP y su referencia visual, y enlaza una clase de reconocimiento solo cuando esté disponible.

El reconocimiento V1 sigue siendo experimental. Las limitaciones de lateralidad, movimiento y rechazo de gestos desconocidos se mantienen, y este hito carece de nuevas pruebas físicas de reconocimiento.
