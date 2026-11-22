# Hito 5.5 · Minijuegos educativos

## Auditoría inicial

| Área | Estado inicial | Implementación |
| --- | --- | --- |
| Minijuegos | La ruta `/minijuegos` mostraba tarjetas de Memoria visual, Desafío rápido y Relaciona y aprende, sin controles para jugar. | Se conserva la pantalla de selección. Los tres IDs existentes se usan en partidas funcionales y se incorporan Adivina la seña y Desafío de señas. |
| Desafío de Cámara | `/camara/desafio` permitía recorrer tres o cinco fichas de demostración, con cámara básica y un contador de posición. | La misma ruta abre el desafío funcional compartido con `/minijuegos/senas`. Sigue admitiendo `?cantidad=5` para sugerir el nivel de cinco señas. |
| Material educativo | El catálogo incluía fichas, instrucciones y láminas. Las láminas numéricas muestran varias respuestas impresas en una página. | Se incorporan cinco diagramas individuales al catálogo. Los juegos visuales usan ese conjunto. El motor del desafío elige entre las diez clases V1. |
| Persistencia | El registro compartido admitía eventos de minijuego con puntaje y máximo. El módulo carecía de partidas que emitieran esos eventos. | Se conservan los eventos antiguos y se guardan las partidas nuevas con configuración, métricas, método de práctica y recompensa. |

## Juegos disponibles

| Juego | Ruta | Mecánica |
| --- | --- | --- |
| Memoria de señas | `/minijuegos/memoria` | Tres o cinco parejas entre diagramas y significados. Cuenta intentos por par, bloquea las parejas encontradas y mide el tiempo transcurrido. Al fallar, el estudiante puede examinar las dos tarjetas y ocultarlas cuando esté listo. |
| Adivina la seña | `/minijuegos/adivina` | Tres preguntas con tres alternativas o cinco con cuatro. Muestra retroalimentación inmediata, aciertos, errores, racha actual y mejor racha. |
| Reto contrarreloj | `/minijuegos/desafio` | Usa el mismo motor de preguntas. Ofrece 30, 60 o 90 segundos y un modo sin límite. Una ronda con reloj ofrece hasta 30 preguntas en ciclos aleatorios de vocabulario. |
| Desafío de señas | `/minijuegos/senas` | Una serie ajustada al nivel y al vocabulario elegido. Muestra el objetivo, la ficha y un ejercicio alternativo. La cámara se activa desde un control explícito y el resultado guardado se registra por seña. |
| Relaciona y aprende | `/minijuegos/relaciona` | Preguntas de significado escrito, con categorías del catálogo. El estudiante elige la palabra que corresponde a la descripción. |

Todas las partidas tienen progreso, resultados y opción de reinicio o repetición. Memoria, Adivina y Reto usan Uno a Cinco. El desafío ofrece hasta tres señas en Básico y cinco en Intermedio. Se adapta al número real de señas elegibles cuando se elige una categoría. Las partidas visuales y de texto funcionan con teclado, ratón o pantalla táctil mediante controles nativos.

## Fuente visual y revisión

Las posturas de Uno a Cinco se cotejaron con la figura 2 de la página impresa 72, página 14 del PDF. Se dibujan con trazos originales en Canvas a partir de la configuración de dedos. El build carece de recortes, escaneos y copias de la lámina. Los diagramas carecen de cifras o rótulos. La descripción para lectores de pantalla identifica la postura sin nombrar el número. Biblioteca conserva el enlace y añade el diagrama a la ficha. La validación lingüística sigue pendiente. [Cartilla del MINEDU, Orientaciones para la atención de estudiantes con discapacidad auditiva](https://formacionenservicio.minedu.gob.pe/sifods/centro-recurso/2022/Lineas-de-formacion-priorizadas/Mejora-de-Aprendizajes/Atencion-a-la-diversidad/Cartilla/orientaciones-discapacidad-auditiva.pdf#page=14).

## Arquitectura y progreso

- `minigames.ts` define el objetivo, las categorías, el nivel, la duración y la selección de vocabulario. Cada partida visual exige un diagrama individual. El repaso escrito admite el vocabulario general. La práctica con cámara exige una clase V1, referencia e instrucciones.
- `minigameRun.ts` compone tableros y preguntas con Fisher–Yates y aplica las acciones de juego. Rechaza selecciones repetidas, respuestas ajenas a la pregunta y acciones posteriores al plazo. El temporizador de la vista se libera al reiniciar, finalizar o cambiar de ruta.
- `GuidedSignPractice` reúne los controles e instrucciones ya usados en Situaciones. Reutiliza `DirectedLessonPractice` y el motor local existente. Cambiar de seña, reiniciar, elegir la alternativa o salir desmonta la práctica y libera los recursos. La confirmación temporal habilita **Guardar práctica con cámara**. El estudiante la registra explícitamente una sola vez por objetivo. El desafío carece de límite de tiempo y los dos métodos suman el mismo puntaje.
- El desafío guarda un borrador de la pestaña para volver desde Biblioteca. La sesión reanuda la seña y los resultados ya guardados con la cámara apagada. Los juegos de cartas y preguntas guardan los resultados al finalizar. Salir a mitad de una partida detiene sus recursos y el borrador permanece disponible solo para Desafío de señas.
- Cada pareja encontrada, respuesta correcta o práctica completada vale **10 puntos de partida**. El sistema registra **20 XP una sola vez por juego**, al terminar una partida con al menos un acierto, pareja o práctica. Hay un máximo de **100 XP** entre los cinco juegos. El evento `minigame:<id de partida>` evita registrar dos veces el mismo resultado. El respaldo del perfil incluye las partidas, los récords se calculan por configuración y el registro mantiene los datos de Aprender y Situaciones.
- El récord compara el puntaje y, en caso de empate, la menor cantidad de errores. Memoria compara también el tiempo si el número de intentos coincide. El desafío con cámara carece de desempate por velocidad.

## Archivos

| Área | Archivos |
| --- | --- |
| Catálogo, ejecución y persistencia | `src/data/minigames.ts`, `src/data/minigameRun.ts`, `src/data/progress.ts`, `src/data/library.ts` |
| Pantallas y rutas | `src/App.tsx`, `src/pages/MinigamesPage.tsx`, `src/pages/MinigamesPage.css`, `src/pages/MinigameRunPage.tsx`, `src/pages/SignChallengePage.tsx`, `src/pages/LibraryPage.tsx` |
| Componentes compartidos | `src/components/SignHandDiagram.tsx`, `src/components/GuidedSignPractice.tsx`, `src/components/SituationPracticeStep.tsx`, `src/data/signExercises.ts`, `src/data/situationStudy.ts` |
| Pruebas | `scripts/minigame-run.test.mjs`, `scripts/fixtures/minigames-browser.mjs`, `scripts/recognition-lab-browser.mjs`, `scripts/hand-detection.test.mjs` |

## Verificación reproducible

| Verificación | Resultado |
| --- | --- |
| TypeScript, lint y build | Correctos. El HTML inicial no precarga el motor de reconocimiento ni el Worker. |
| Pruebas automatizadas | 203 de la aplicación, 6 del lector web y 13 del pipeline de Python. |
| Minijuegos en Chromium | Los cinco juegos se iniciaron, reiniciaron y completaron en desarrollo y producción. Se verificaron Espacio para girar tarjetas, errores y bloqueo de parejas, racha de cuatro aciertos, liberación de temporizadores, modo sin límite, récords, recompensas y vista oscura a 390 px. El desafío confirmó Uno con una toma histórica, rechazó el guardado de una seña distinta, retomó la partida al volver de Biblioteca y liberó la cámara y el Worker al salir, reiniciar y avanzar. |
| Regresiones en Chromium | Situaciones conservó la reanudación, el ejercicio sin cámara de Cero y el registro de XP. Aprender completó Números básicos y guardó la evaluación y su única finalización. Biblioteca mantuvo filtros, favoritos y navegación. Cámara y Laboratorio conservaron el flujo dirigido y la liberación de recursos. |
| Referencias y privacidad | Los cinco diagramas se revisaron visualmente frente a la figura del MINEDU. El SHA-256 de la exportación de 355 tomas coincide con el manifiesto histórico. El build conserva la V1 pública y carece del directorio privado `ml`. |

```powershell
npm.cmd exec -- tsc -b --pretty false
npm.cmd run lint
npm.cmd run build
npm.cmd test
node --test ml/tests/web.test.mjs
& .\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v
$gameChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$gameDataset = 'ml/datasets/senaverse-dataset-dataset-json.json'
node scripts/recognition-lab-browser.mjs $gameChrome minigames-development $gameDataset
node scripts/recognition-lab-browser.mjs $gameChrome minigames-production $gameDataset
node scripts/recognition-lab-browser.mjs $gameChrome situation-production $gameDataset
node scripts/recognition-lab-browser.mjs $gameChrome lesson-production $gameDataset
node scripts/recognition-lab-browser.mjs $gameChrome library-production
node scripts/recognition-lab-browser.mjs $gameChrome student-production $gameDataset
node scripts/recognition-lab-browser.mjs $gameChrome lab
```

## Prueba manual

1. Ejecuta `npm.cmd run dev` y abre `/minijuegos`. En Memoria, abre dos tarjetas con Tab y Espacio, prueba una pareja distinta y completa el tablero. Juega otra vez y compara los intentos y el récord. Cambia a Intermedio y comprueba las diez tarjetas.
2. En Adivina, responde una alternativa incorrecta y luego varias correctas. Consulta el resumen. En Reto, prueba los tiempos disponibles y la opción sin límite. Sal a mitad de una ronda y vuelve a empezar.
3. En Desafío, abre una ficha en Biblioteca y vuelve. En la vista de práctica, deniega el permiso de cámara y completa el ejercicio sin cámara. Prueba después con cámara, realiza una seña distinta y usa **Reintentar práctica** antes de realizar el objetivo. Comprueba cuándo aparece el botón de guardar y que se apague la cámara al avanzar, reiniciar o salir.
4. Repite un juego con aciertos. Recarga y revisa las partidas y los XP en **Mi progreso**. Repite el recorrido en modo oscuro y un ancho de aproximadamente 390 px.

## Limitaciones y Hito 5.6

El conjunto visual individual cubre cinco posturas estáticas. Los demás materiales conservan sus fichas y referencias, que pueden abrirse con conexión. La V1 sigue siendo experimental y conserva las limitaciones de lateralidad, rechazo y ciertos movimientos. La revisión lingüística y la prueba con nueva cámara física quedan pendientes.

Para el Hito 5.6 conviene revisar con personas usuarias de LSP las posturas y textos de los cinco diagramas, observar partidas con teclado y dispositivos táctiles y ampliar el vocabulario visual con recursos individuales que tengan atribución y autorización documentadas. Los resultados permitirán ajustar la dificultad de las preguntas y los tableros manteniendo la práctica experimental opcional.
