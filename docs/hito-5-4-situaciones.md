# Hito 5.4 · Situaciones cotidianas

## Auditoría inicial

| Área | Estado inicial | Hito 5.4 |
| --- | --- | --- |
| Catálogo, rutas y diseño | Cuatro escenarios de demostración. El filtro, las rutas de escena y el diálogo de ayuda estaban implementados. | Se conservan las rutas, el filtro, la cuadrícula y la identidad visual. El catálogo visible ofrece seis situaciones. |
| Respuestas y avance | Los cuestionarios comprobaban alternativas y guardaban respuestas en una clave propia. Las barras estaban fijas en cero y el avance se bloqueaba en la práctica. | Las evaluaciones guardan selecciones e intentos en el progreso compartido. Cada interacción avanza cuando se completa una práctica. |
| Cámara y referencias | La vista de práctica utilizaba un componente de cámara sin conexión al reconocedor. Los elementos visuales del prototipo eran decorativos. | La práctica utiliza el mismo componente dirigido de Aprender. Las referencias lingüísticas proceden de Biblioteca. Las ilustraciones de Situaciones muestran el entorno. |
| Resumen y recompensas | El resumen contaba algunas respuestas comprobadas. El registro técnico de escenas quedaba sin conexión con la interfaz. | El resumen separa comprensión contextual, coincidencias experimentales y ejercicios sin cámara. La primera finalización otorga 40 XP. |

## Catálogo y actividades

| Situación | Dificultad | Interacciones | Objetivos de vocabulario |
| --- | --- | ---: | --- |
| Comprando en una tienda | Intermedio | 4 | Hola, Agua, Dos y Gracias |
| Pidiendo comida | Intermedio | 3 | Uno, Nada y Mucho |
| Respondiendo preguntas | Básico | 2 | Sí y Cero |
| Organizando una actividad | Intermedio | 2 | Solo y Con |
| Comprando útiles escolares | Básico | 2 | Tres y Cuatro |
| Eligiendo una cantidad | Básico | 2 | Cinco y Uno |

Las **15 interacciones** tienen un contexto escrito en español que explica la respuesta esperada. La práctica se centra en la seña elegida. El estudiante puede corregir su respuesta o dejarla registrada como incorrecta y repasar la opción que eligió. El resumen informa ambos resultados por separado.

Los tres escenarios anteriores que quedaron fuera del catálogo visible conservan sus rutas y respuestas para facilitar el acceso desde enlaces guardados. Los cuatro IDs de interacción de la tienda se conservan.

## Arquitectura

- `situations.ts` define las situaciones con IDs, contextos, objetivos, alternativas, explicaciones y recompensa. Cada opción apunta al catálogo educativo. Las diez clases V1 se usan como objetivos en las situaciones visibles. Cero tiene lámina y alternativa educativa. Las fichas pendientes, como Hola, Agua y Gracias, ofrecen un ejercicio de significado.
- `situationStudy.ts` controla la selección, comprobación, práctica y finalización en orden. Una alternativa usa los mismos controles de Aprender y comprueba una propiedad documentada de la seña, como la cantidad de manos, o su significado cuando la referencia aún está pendiente.
- `SituationPracticeStep` carga `DirectedLessonPractice` al elegir cámara. El navegador solicita permiso al pulsar **Activar cámara**. El componente solo habilita el guardado cuando el motor confirma la clase seleccionada. Cambiar de respuesta o método, guardar una práctica o abrir otra ruta desmonta la cámara y libera sus recursos. El enlace a Biblioteca incluye un retorno validado a la interacción.
- `StudentProgressProvider` almacena el recorrido en `situationStudy` bajo la misma clave que Aprender. Recupera respuestas del prototipo y normaliza IDs como `dos` a `LSP-002`. Una respuesta histórica sin práctica mantiene su estado de comprobación. Tras recargar, se retoma la primera interacción sin práctica, o la última si queda pendiente pulsar **Finalizar situación**. El método se guarda al completar el ejercicio o aceptar una coincidencia.
- `progress.ts` incorpora los XP a **Mi progreso** y al respaldo del perfil. El evento estable `situation:<id>` registra una primera finalización por situación del catálogo. Repetir el recorrido actualiza su resumen y conserva la recompensa ya registrada. La transición a la versión nueva conserva los datos de Aprender y los favoritos.

## Archivos del hito

| Área | Archivos |
| --- | --- |
| Catálogo y estado | `src/data/situations.ts`, `src/data/situationStudy.ts`, `src/data/progress.ts`, `src/components/StudentProgressProvider.tsx`. Se retiró `src/hooks/useSituationProgress.ts` tras integrar su almacenamiento anterior. |
| Rutas y pantallas | `src/App.tsx`, `src/components/StudentLayout.tsx`, `src/pages/SituationsPage.tsx`, `src/pages/SituationScenePage.tsx`, `src/pages/SituationResultsPage.tsx`, `src/pages/SituationsPage.css`, `src/pages/LibraryPage.tsx`. |
| Práctica y presentación compartida | `src/components/SituationContent.tsx`, `src/components/SituationPracticeStep.tsx`, `src/components/DirectedLessonPractice.tsx`, `src/components/RecognitionPractice.tsx`. |
| Pruebas | `scripts/situation-study.test.mjs`, `scripts/fixtures/situation-browser.mjs`, `scripts/fixtures/lesson-browser.mjs`, `scripts/recognition-lab-browser.mjs`, `scripts/hand-detection.test.mjs`. |

## Verificación reproducible

| Verificación | Resultado |
| --- | --- |
| TypeScript, lint y build | Correctos. La página inicial de producción no precarga el reconocimiento ni el Worker. |
| Pruebas automatizadas | 196 de la aplicación, 6 del lector web y 13 del pipeline de Python. Las pruebas del simulador completaron las seis situaciones sin cámara y verificaron que la recompensa se mantiene al repetir. |
| Situaciones en Chromium | En desarrollo y producción se verificaron el filtro, la navegación en orden, la vuelta desde Biblioteca, la reanudación, el permiso denegado y la vista oscura a 390 px. Se comprobó una seña distinta y una coincidencia con el clasificador real. La comprensión se mantuvo separada de la práctica. La cámara y el Worker se liberaron. En producción se completó el ejercicio sin cámara de Cero durante una repetición que conservó un solo registro de 40 XP. |
| Biblioteca y Cámara en Chromium | En producción se verificaron los favoritos, los enlaces a la práctica dirigida y la carga local. Cámara confirmó Con, rechazó una toma negativa y liberó sus recursos. |
| Aprender en Chromium | En producción, Números básicos conservó el permiso denegado, los ejercicios alternativos, la reanudación, el rechazo y la confirmación experimental. El recorrido guardó una evaluación de 4/5 y un solo evento de finalización. |
| Laboratorio en Chromium | En desarrollo se comprobó el selector de versiones, la recuperación del modelo, el modo dirigido y la liberación de dos sesiones de cámara. |
| Privacidad | El SHA-256 de la exportación de 355 tomas coincide con el manifiesto histórico. El build contiene la copia de V1 para inferencia y excluye el directorio privado `ml`. |

```powershell
npm.cmd exec -- tsc -b --pretty false
npm.cmd run lint
npm.cmd run build
npm.cmd test
node --test ml/tests/web.test.mjs
& .\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
$caseChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$caseDataset = 'ml/datasets/senaverse-dataset-dataset-json.json'
node scripts/recognition-lab-browser.mjs $caseChrome situation-development $caseDataset
node scripts/recognition-lab-browser.mjs $caseChrome situation-production $caseDataset
node scripts/recognition-lab-browser.mjs $caseChrome library-production
node scripts/recognition-lab-browser.mjs $caseChrome lesson-production $caseDataset
node scripts/recognition-lab-browser.mjs $caseChrome student-production $caseDataset
node scripts/recognition-lab-browser.mjs $caseChrome lab
```

## Prueba física y limitaciones

1. Ejecuta `npm.cmd run dev`. Abre **Situaciones → Eligiendo una cantidad** y comprueba la respuesta de cada interacción. Abre la lámina o la ficha de Biblioteca y vuelve al escenario.
2. Elige **Practicar con cámara**, pulsa **Activar cámara** y comprueba la seña objetivo con una mano visible. Repite con la otra. Prueba una seña distinta y comprueba que el botón de guardado sale solo tras una coincidencia con el objetivo. Usa **Reintentar práctica** entre intentos.
3. En **Pidiendo comida** observa el comportamiento con Nada y, en **Organizando una actividad**, con Solo. Registra las diferencias de lateralidad o movimiento y los gestos desconocidos que aparezcan como coincidencias.
4. Deniega el permiso y termina la situación con el ejercicio alternativo. Comprueba que el indicador de cámara se apaga al cambiar de método o salir a Biblioteca. Recarga antes de terminar para comprobar la reanudación. Completa el recorrido otra vez y verifica los 40 XP en **Mi progreso**.

La V1 sigue siendo experimental. Persisten las dificultades con la mano izquierda, Solo y el rechazo de gestos desconocidos. Nada conserva la posible inconsistencia documentada durante la captura. La revisión lingüística sigue pendiente y los PDF de referencia requieren conexión. Las pruebas con Chromium usan cámara de prueba, tomas históricas y el clasificador real. Queda pendiente una sesión nueva con cámara física.

## Propuesta para el Hito 5.5

Empezar con un minijuego corto de asociación entre cantidades y vocabulario de Números básicos. Reutilizar los IDs del catálogo y las fichas del MINEDU. Guardar un resultado al entregar la partida, con un ID estable por partida, y mantener la puntuación del juego independiente del reconocimiento experimental. Después se puede ofrecer una ronda opcional de práctica dirigida usando el mismo componente y una alternativa sin cámara.
