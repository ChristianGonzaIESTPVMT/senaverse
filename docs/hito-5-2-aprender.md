# SeñaVerse · Hito 5.2

La lección piloto está en **Aprender → Unidad 2 → Números básicos**, en `/academia/unidad/2/leccion/numeros`. Conserva el ID curricular `numeros`. Usa la SVM V1 experimental para práctica orientativa y ofrece una alternativa sin cámara en cada práctica.

## Estado anterior de Aprender

| Área | Funcional | Pendiente al inicio del hito |
| --- | --- | --- |
| Navegación | Las rutas de Aprender, unidades y lecciones funcionaban. El panel usaba la última lección visitada para orientar la continuación. | Navegación y reanudación dentro de una lección. |
| Currículo | Las tres unidades ya tenían lecciones, títulos, descripciones y actividades de comprensión. «Números básicos» ya existía en la unidad 2. | Objetivos detallados y secuencias de actividades. «Números básicos» tenía una pregunta de cantidades y una referencia a la ficha de Dos. |
| Evaluación | Se corregían alternativas y asociaciones de conceptos. Una respuesta correcta habilitaba la acción de completar la lección. | Guardar intentos, respuestas y resultados al salir. La cámara de las lecciones estaba representada por un enlace externo al Centro de práctica. |
| Referencias | El reproductor de las lecciones admitía videos y subtítulos cuando se proporcionaban. | Incorporar materiales reales a las entradas con video pendiente. |
| Progreso | El estado de visita, las lecciones completadas y los 80 XP por lección se guardaban localmente. El respaldo de perfil conservaba el progreso. | Registrar pasos, ejercicios, métodos de práctica y resultados con una estructura que se pueda reanudar. |

## Flujo piloto

1. **Objetivos.** El estudiante inicia el recorrido y conoce las tres metas de aprendizaje.
2. **Observación.** Revisa la explicación de Uno, Dos, Tres, Cuatro y Cinco y abre la lámina oficial. Los cinco objetivos de práctica usan `LSP-001` a `LSP-005`.
3. **Comprensión.** Selecciona la cantidad adecuada en una situación cotidiana y relaciona tres configuraciones con sus números. Cada intento enviado recibe retroalimentación y queda guardado. Se puede corregir y volver a intentar.
4. **Cinco prácticas.** En cada una se puede elegir cámara o un ejercicio sobre la configuración de la lámina. Con cámara se espera la coincidencia experimental y el estudiante pulsa **Guardar práctica y continuar**. Sin cámara selecciona y comprueba la configuración correspondiente.
5. **Evaluación y resumen.** Responde cinco preguntas y envía una sola evaluación completa. Se muestra la puntuación obtenida y la corrección de cada respuesta. El resumen indica el método de cada práctica. **Finalizar lección** guarda el cierre y registra el evento de XP habitual. La evaluación conceptual puede finalizarse con una puntuación parcial.

La figura 2 de la cartilla del MINEDU contiene los dibujos de los números que se enseñan. La verifiqué visualmente en la página impresa 72, que corresponde a la página 14 del PDF. La lección enlaza esa lámina y ofrece descripciones textuales de las configuraciones. La revisión lingüística del contenido de SeñaVerse sigue pendiente. [Lámina del MINEDU](https://formacionenservicio.minedu.gob.pe/sifods/centro-recurso/2022/Lineas-de-formacion-priorizadas/Mejora-de-Aprendizajes/Atencion-a-la-diversidad/Cartilla/orientaciones-discapacidad-auditiva.pdf#page=14)

## Arquitectura

- `LessonPlan` reúne objetivos y pasos con IDs estables de introducción, observación, preguntas, práctica y evaluación. El resumen se construye a partir de las actividades enviadas. `LessonAnswerFields` comparte controles de alternativas y asociación con las lecciones anteriores. El contenido anterior conserva su descripción como objetivo general y su recorrido de observación, explicación y ejercicio.
- `DirectedLessonPractice` recibe el ID de una seña. Reutiliza `RecognitionPractice`, `useRecognition` y `PracticeCamera`. El objetivo se compara con la predicción confirmada de la V1. Una seña distinta, una hipótesis sin confirmar y un gesto desconocido dejan la práctica abierta.
- Seleccionar cámara monta la práctica y carga el modelo. Elegir el ejercicio alternativo, cambiar de actividad, salir de la lección o guardar la coincidencia desmonta la cámara. Los controles existentes permiten desactivarla, reintentar y alternar los puntos de la mano.
- `lessonStudy` amplía el registro local existente con fecha de inicio, intentos, aciertos y método. El reductor comprueba el orden de los pasos y que las respuestas pertenezcan a sus opciones. Al restaurar, recalcula las puntuaciones a partir de las respuestas guardadas. El respaldo del perfil incluye los datos de la lección.
- El registro distingue coincidencia experimental y ejercicio alternativo. La entrega explícita completa la práctica una sola vez. El cierre usa el ID de evento `lesson:numeros` y conserva los créditos de quien completó la versión anterior. El modo cámara no guarda imágenes, landmarks ni puntuaciones internas.

## Archivos

| Área | Archivos creados o modificados |
| --- | --- |
| Currículo, corrección y persistencia | `src/data/curriculum.ts`, `numbersLesson.ts`, `lessonPlan.ts`, `lessonStudy.ts`, `progress.ts` |
| Secuencia, práctica y navegación | `src/components/LessonSequence.tsx`, `LessonActivity.tsx`, `DirectedLessonPractice.tsx`, `RecognitionPractice.tsx`, `src/pages/LessonPage.tsx`, `AcademyPage.css`, `ProgressPage.tsx`, `ProgressPage.css`, `src/App.tsx` |
| Pruebas | `scripts/lesson-study.test.mjs`, `progress.test.mjs`, `recognition-lab-browser.mjs`, `fixtures/lesson-browser.mjs` |
| Documentación | `README.md`, `docs/hito-5-2-aprender.md` |

## Verificación reproducible

| Verificación | Resultado |
| --- | --- |
| TypeScript, lint y build | Correctos. El HTML inicial de producción carece de precarga de reconocimiento o detector. |
| Pruebas automatizadas | 185 de la aplicación, 6 del lector web y 13 del pipeline de Python. |
| Aprender en Chromium | Recorrido completado en desarrollo y producción. Se verificaron carga bajo demanda, permiso denegado, coincidencia y rechazo con tomas guardadas, 4/5 en la evaluación, persistencia, una sola finalización y vista móvil de 390 px. |
| Regresión de Cámara y Laboratorio | Cámara mantuvo el reconocimiento libre y dirigido en producción. Laboratorio mantuvo selector de versiones, modo dirigido y liberación de cámara y Worker en desarrollo. |
| Integridad y privacidad | Se verificaron los hashes de la V1 y de la exportación original de 355 tomas. El build contiene la copia pública de inferencia y carece del directorio privado `ml`. |

```powershell
npx.cmd tsc -b --pretty false
npm.cmd run lint
npm.cmd run build
npm.cmd test
node --test ml/tests/web.test.mjs
& .\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
$lessonChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$lessonDataset = 'ml/datasets/senaverse-dataset-dataset-json.json'
node scripts/recognition-lab-browser.mjs $lessonChrome lesson-development $lessonDataset
node scripts/recognition-lab-browser.mjs $lessonChrome lesson-production $lessonDataset
node scripts/recognition-lab-browser.mjs $lessonChrome student-production $lessonDataset
node scripts/recognition-lab-browser.mjs $lessonChrome lab
```

Las pruebas Chromium verifican la carga diferida, el permiso denegado, los temas y la navegación con cámara. El recorrido registrado comprueba una seña distinta, un negativo rechazado y la coincidencia en el objetivo Uno. Usa landmarks de capturas históricas con el clasificador real y sostiene la última observación de las tomas estáticas para dar tiempo a la confirmación de V1. Los landmarks históricos se leen en el proceso de prueba local. El sitio no contiene las grabaciones. El recorrido también verifica reintento, alternativa, nota de 4/5, recarga y un único evento de finalización.

## Prueba física y ampliación

1. Ejecuta `npm.cmd run dev` o ejecuta `npm.cmd run build` y luego `npm.cmd run preview`. Abre la ruta de Números básicos.
2. Completa observación, comprensión y asociación. Abre la lámina en la primera fila de la figura 2 y compara las cinco posturas.
3. En una práctica, inicia la cámara, respeta la postura de la figura y mantenla visible unos dos segundos. Prueba con ambas manos y repite con otra seña. Comprueba los mensajes y cuándo se habilita el guardado.
4. Rechaza el permiso o utiliza **Hacer ejercicio sin cámara**, completa la alternativa y comprueba que el resumen indique el método. Cambia de actividad y verifica que se apague el indicador de cámara del navegador.
5. Recarga a mitad de la lección y tras finalizar. Comprueba la reanudación, el resultado y la presencia de un solo evento de lección en **Mi progreso**.

La V1 sigue limitada por la lateralidad, falsos positivos con gestos desconocidos, dificultades en determinados movimientos y un conjunto de validación recogido con un solo participante. La coincidencia en pantalla es orientativa. Los resultados de la reproducción de pruebas no corresponden a nuevas sesiones con cámara física. La referencia externa requiere conexión cuando se abre. La V1, sus umbrales y el dataset original se mantienen. La V2 sigue aplazada.

Para ampliar el contenido, incorpora planes con objetivos concretos y recursos revisados por personas competentes en LSP. Vincula un objetivo de cámara únicamente cuando exista una clase compatible en el catálogo. Para otros objetivos usa ejercicios de observación, alternativas o asociación. Mantén los identificadores de pasos existentes al editar contenido que ya tenga progreso guardado.
