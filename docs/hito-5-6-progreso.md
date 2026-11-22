# Hito 5.6 · Progreso, gamificación y panel del estudiante

## Auditoría inicial

| Área | Estado inicial | Integración |
| --- | --- | --- |
| Perfil y preferencias | Perfil local con nombre, biografía, avatar, foto opcional, tema, favoritos y exportación. El perfil mostraba tres estadísticas derivadas principalmente de Aprender. | Se conservan las preferencias, claves y controles del perfil. La vista usa los mismos datos de nivel, racha y logros que Inicio y Mi progreso. El respaldo incluye los datos ampliados del progreso. |
| Aprender | Números básicos tenía diez actividades, evaluación y estado reanudable. Las otras lecciones ofrecían material preliminar y una actividad conceptual. El denominador anterior incluía todo el catálogo. | El avance actual usa las lecciones con un plan funcional. Las finalizaciones antiguas conservan su XP e historial. El material preliminar sigue abierto para consulta. |
| Situaciones | Seis situaciones, respuestas y método de práctica registrados. Repetir reemplazaba el intento anterior, y las prácticas carecían de su propia fecha. | Las interacciones nuevas llevan su fecha de guardado. Al repetir se conserva el intento finalizado, incluidos los métodos y las respuestas. |
| Minijuegos | Cinco juegos guardaban partidas y récords con un límite de una recompensa por juego. | El panel agrega partidas, aciertos, errores, juegos completados y récords. Las partidas nuevas de Desafío de señas conservan los IDs de las señas practicadas. |
| Biblioteca y Cámara | Las fichas consultadas se deduplicaban sin fechas. Cámara mostraba coincidencias experimentales sin guardarlas desde la práctica independiente. | Las primeras consultas nuevas llevan una fecha. Cámara ofrece guardar explícitamente una coincidencia, y el historial distingue consultas, estudio y práctica. |
| Inicio y Mi progreso | Inicio calculaba porcentajes por su cuenta y podía abrir una lección preliminar al elegir continuar. Mi progreso mostraba XP, tres insignias y el historial de finalizaciones. La presentación incluía una barra ilustrativa fija. | Inicio reanuda el paso real y propone retomar situaciones pendientes. Mi progreso incluye avance actual, actividad semanal, nivel, rachas, insignias, evaluaciones y récords. La presentación enlaza a Números básicos. |

## Arquitectura y almacenamiento

`progress.ts` sigue siendo el registro de eventos y recompensas. `studentOverview.ts` deriva los resúmenes de Aprender, Situaciones, Minijuegos, Biblioteca y Cámara. `learningCalendar.ts` agrupa las actividades fechadas por día. El hook `useStudentOverview` comparte el selector entre las tres pantallas y refresca el reloj de la vista. Las lecturas del panel carecen de efectos sobre XP, racha y cámara.

- **Lecciones funcionales**. El denominador se obtiene de los planes vigentes. Hoy hay una lección funcional y diez actividades. El avance usa el cierre guardado del plan actual. Si el perfil ya había recibido XP por la versión preliminar de esa lección, puede completar el plan vigente y conserva un solo crédito. La última evaluación completa se toma del intento guardado.
- **Vocabulario**. Una ficha consultada se cuenta una vez por ID. El estudio se deriva de una observación explícitamente completada o de actividades guiadas que ya registran la seña. La coincidencia de Cámara independiente se presenta como práctica experimental. Las partidas visuales anteriores que solo guardaban un puntaje global aportan ese resultado.
- **Situaciones y minijuegos**. Se cuentan las situaciones actuales completadas y las interacciones del intento actual y de los intentos archivados. Se contabilizan las respuestas comprobadas, incluidos los intentos incorrectos. Los puntajes de juego, el récord y las coincidencias experimentales se presentan con sus propias unidades.
- **Perfil**. Sigue existiendo un perfil por almacenamiento del navegador y origen. El nombre, la foto, el avatar, los favoritos, el tema y el respaldo conservan su sistema anterior.

Se mantiene `senaverse-student-progress-v1`. La lectura admite campos opcionales `consultedAt`, `practiceAt`, `situationArchive` y `practicedSignIds` en los registros correspondientes. El lector valida cada bloque de una versión 1 y recupera los registros válidos de los otros bloques. Las claves antiguas se conservan. Una versión explícita incompatible queda protegida de sobrescritura. Las fechas anteriores desconocidas permanecen como tales. La exportación incluye los campos nuevos junto con los datos existentes.

## XP y niveles

| Actividad válida | XP | Clave de deduplicación |
| --- | ---: | --- |
| Completar Números básicos | 80 | ID de lección |
| Completar una situación actual | 40 | ID de situación |
| Primera partida con aciertos en cada minijuego | 20 | ID del juego para el XP e ID de partida para el historial |

El contenido vigente suma **420 XP**. Los XP de finalizaciones anteriores se conservan. Los récords muestran puntos de partida. Las coincidencias que se guardan desde Cámara independiente aportan una práctica al historial. Los niveles reflejan participación en SeñaVerse.

| Nivel | Nombre | XP mínimo |
| ---: | --- | ---: |
| 1 | Exploración | 0 |
| 2 | Primer avance | 80 |
| 3 | Práctica activa | 200 |
| 4 | Aprendizaje continuo | 320 |
| 5 | Trayectoria activa | 420 |

## Rachas e insignias

Las fechas se agrupan según `America/Lima`. Una actividad de Aprender completada, una interacción resuelta, una partida con participación o una práctica explícitamente guardada aporta su día. Una fecha cuenta una vez para la racha. La semana muestra el número de registros educativos de los últimos siete días. La racha vigente se mantiene si el último día activo fue hoy o ayer. Consultas, visitas, inicios y partidas agotadas sin respuestas quedan fuera del cálculo. Las finalizaciones anteriores sin fecha conservan su lugar en el historial.

| Insignia | Condición |
| --- | --- |
| Primer paso | Primera lección completada, incluida una finalización anterior válida |
| Explorador | Tres fichas distintas consultadas, regla anterior |
| Constancia del recorrido | Dos unidades según el recorrido anterior, con el ID anterior `consistency` |
| Dominando los números | Números básicos completada |
| Primera práctica | Una coincidencia experimental guardada |
| Comunicador | Las seis situaciones actuales completadas |
| Aprender jugando | Una partida con participación en cada uno de los cinco minijuegos |
| Constancia | Tres días consecutivos de actividad educativa |
| Explorador de señas | Diez fichas distintas con referencia disponible |
| Aprendiz destacado | 400 XP |

Las insignias se derivan de registros existentes y usan IDs estables. La vista de logros muestra la condición, el avance y la fecha cuando hay evidencia disponible.

## Pantallas y continuidad

- **Inicio y panel** (`/` y el enlace anterior `/panel`). Nivel, XP, racha actual, actividad reciente, últimos logros y accesos a los cinco módulos. El enlace principal reanuda el paso guardado de Aprender o inicia Números básicos. La recomendación prioriza una situación en curso y, según el avance, propone Situaciones, Minijuegos o Biblioteca.
- **Mi progreso**. Desglose por módulo, actividad semanal accesible, historial ordenado, diálogo de insignias, evaluación y récords. Las coincidencias experimentales y las alternativas sin cámara tienen contadores separados.
- **Mi perfil**. Indicadores y logros reales junto a los controles de personalización. Su respaldo conserva preferencias y registros ampliados. La presentación pública mantiene el acceso a la ruta educativa.

## Archivos

| Área | Archivos |
| --- | --- |
| Selectores y datos | `src/data/studentOverview.ts`, `src/data/learningCalendar.ts`, `src/data/progress.ts`, `src/data/situationStudy.ts`, `src/data/minigameRun.ts`, `src/data/profile.ts` |
| Estado y componentes compartidos | `src/components/StudentProgressProvider.tsx`, `src/hooks/useStudentOverview.ts`, `src/components/StudentLevel.tsx`, `src/components/StudentActivityList.tsx`, `src/components/StudentLayout.tsx` |
| Pantallas de progreso | `src/pages/DashboardPage.tsx`, `DashboardPage.css`, `ProgressPage.tsx`, `ProgressPage.css`, `ProfilePage.tsx`, `ProfilePage.css`, `HomePage.tsx` |
| Integraciones | `src/App.tsx`, `src/pages/AcademyPage.tsx`, `src/pages/LessonPage.tsx`, `src/pages/FreePracticePage.tsx`, `src/components/LessonActivity.tsx`, `src/components/RecognitionPractice.tsx` |
| Pruebas | `scripts/student-overview.test.mjs`, `scripts/progress-ui.test.mjs`, `scripts/profile-ui.test.mjs`, `scripts/fixtures/student-overview-browser.mjs`, `scripts/recognition-lab-browser.mjs`, `scripts/dataset-access.test.mjs`, `scripts/recognition-lab-access.test.mjs`, `scripts/hand-landmarker.test.mjs` |

## Verificación reproducible

| Verificación | Resultado |
| --- | --- |
| TypeScript, lint y build | Correctos. |
| Pruebas automatizadas | 212 de la aplicación, 6 del lector web y 13 del pipeline de Python. Las pruebas de consolidación comprobaron el total de 420 XP, el crédito único para una versión preliminar y su plan vigente, la recuperación de datos parciales y las rachas alrededor de medianoche. |
| Chromium en desarrollo y producción | Se comprobó el perfil vacío, el historial sin fechas, la conservación de 100 XP anteriores, la racha de tres días, la reanudación de Aprender y Situaciones, y la conservación de avatar y favoritos tras recargar. Se comprobó el diálogo de logros en modo oscuro a 390 px y su cierre con Escape. |
| Cámara en Chromium | El panel y el perfil no iniciaron cámara ni solicitaron recursos de reconocimiento. En Cámara, el clasificador real confirmó Uno con una toma histórica. Guardar añadió un solo registro sin XP y salir liberó cámara y Worker. Una seña distinta no habilitó el guardado. |
| Regresiones en Chromium | Se verificaron los recorridos de Aprender, Biblioteca, Situaciones, Minijuegos, Cámara y Laboratorio, incluido el acceso local y la liberación de recursos. |
| Integridad y privacidad | La exportación de 355 tomas coincide con su SHA-256 histórico. El modelo V1 coincide con el archivo público del build. `dist` excluye el directorio privado `ml` y la página inicial no precarga el reconocedor. |

```powershell
npm.cmd exec -- tsc -b --pretty false
npm.cmd run lint
npm.cmd run build
npm.cmd test
node --test ml/tests/web.test.mjs
& .\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
$progressChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$progressDataset = 'ml/datasets/senaverse-dataset-dataset-json.json'
node scripts/recognition-lab-browser.mjs $progressChrome progress-development $progressDataset
node scripts/recognition-lab-browser.mjs $progressChrome progress-production $progressDataset
```

## Verificación manual

1. Abre Inicio en un perfil limpio. Usa **Empezar a aprender**, completa la primera actividad de Números básicos y vuelve a Inicio. **Continuar aprendiendo** abre el paso guardado y Mi progreso refleja la actividad fechada.
2. Comienza una situación, completa una interacción y vuelve a Inicio. Comprueba el enlace para continuar. Completa la situación y repítela para comprobar el historial y el único crédito de 40 XP.
3. Consulta fichas en Biblioteca y completa un minijuego. Comprueba la diferencia entre consultas, señas estudiadas, récords de juego y XP. Abre el historial y los logros con teclado.
4. En Cámara, inicia manualmente una práctica dirigida, realiza la seña objetivo y guarda la coincidencia experimental. Vuelve a **Mi progreso** y verifica que figure una práctica. Usa **Reintentar práctica** para iniciar un nuevo intento.
5. Recarga Inicio, Mi progreso y Mi perfil. Comprueba el nombre, avatar, favoritos, racha, insignias y XP. Alterna los temas y revisa la vista móvil.

## Límites y siguiente etapa

| Módulo | Funcionalidades pendientes |
| --- | --- |
| Aprender | Completar los planes, medios, actividades y evaluaciones del resto del currículo. |
| Biblioteca | Ampliar referencias visuales individuales y revisar las fichas pendientes con personas usuarias de LSP. |
| Cámara | Validar físicamente la V1 con más participantes, ambas lateralidades y movimientos difíciles. La optimización y la V2 siguen aplazadas. |
| Situaciones | Ampliar vocabulario y validar los contextos. Los intentos que ya se habían reemplazado antes de este hito carecen de evidencia recuperable. |
| Minijuegos | Ampliar los recursos visuales y observar el uso con teclado y dispositivos táctiles. Las partidas anteriores con métricas globales conservan su resultado. |
| Perfil y datos | El perfil permanece local al navegador. El respaldo de perfil actual ofrece exportación. El historial anterior sin fecha queda fuera de la racha y del gráfico semanal. |
| Dataset Studio y Laboratorio | Mantener el piloto físico y el diagnóstico interno. La validación lingüística y el rendimiento en hardware real requieren su propia verificación. |

La ampliación puede empezar con una segunda lección completa, referencias individuales autorizadas y dos situaciones vinculadas al vocabulario nuevo. Antes de la preparación final, conviene verificar los recorridos con personas usuarias de LSP en distintos dispositivos, confirmar la accesibilidad de los medios y revisar el almacenamiento, la exportación y la distribución de producción.
