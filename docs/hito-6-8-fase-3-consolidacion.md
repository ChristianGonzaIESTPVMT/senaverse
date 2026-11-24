# SeñaVerse · Hito 6.8, fase 3

La consolidación refuerza las actividades de Aprender que ya tienen material visual, da continuidad a las quince interacciones de Situaciones y corrige dos interrupciones de flujo en Desafío de señas y Mi perfil. La ruta visual de la aplicación se puede recorrer íntegramente sin webcam.

## Hallazgos y correcciones

| Gravedad | Hallazgo reproducible | Corrección o estado |
| --- | --- | --- |
| Media | En las escenas del pan y del arroz, elegir «Uno» dejaba al estudiante sin segunda comprobación porque el ejercicio disponía de una sola foto comparable. | El ejercicio ofrece fotos de Uno, Dos y Tres para comprobar la elección. Una identificación visual acertada con contexto incorrecto muestra ambos resultados y mantiene bloqueado el avance. |
| Media | Abrir una pista en Desafío desmontaba la captura y el detector. Al ocultarla, había que activar la cámara otra vez. | La pista oculta la vista previa y pausa el reloj y la evaluación. Al cerrarla, se reanuda la misma captura en la misma posición. Abandonar libera el dispositivo y el Worker. |
| Media | Tras fallar o completar la descarga del respaldo, «Exportar mis datos» quedaba deshabilitado hasta salir de Mi perfil. | El control vuelve a estar disponible al concluir la operación. La creación del respaldo valida la foto en un solo lugar. Chromium reprodujo el fallo anterior con un error de descarga controlado. |
| Media | Cinco prácticas de Expresiones cotidianas y Solo y Con daban la respuesta mediante el enunciado y podían completarse sin observar las señas. | Las prácticas piden distinguir clips originales. Las evaluaciones relacionan las demostraciones con su uso y comprueban rasgos concretos de configuración y movimiento. |
| Baja | Las reacciones genéricas de los personajes daban poca continuidad a los turnos y la retroalimentación visual apenas diferenciaba errores de diálogo y de identificación. | Las seis situaciones tienen interlocutor, preguntas en primera persona y reacciones vinculadas a la siguiente acción. La reacción se muestra después de completar la interacción. El resultado distingue el contexto de la identificación o coincidencia con V1. |
| Baja | Los reproductores de los cuestionarios reservaban un rectángulo vertical para clips horizontales y un selector de asociación compartía su etiqueta con los controles de video. | El reproductor usa la proporción del clip. Cada selector tiene una etiqueta propia y una descripción accesible del resultado de la corrección. |
| Baja | La interfaz y el estado de Situaciones comprobaban por separado si una alternativa admitía cámara. | Ambas reutilizan la misma regla para iniciar y evaluar. Se conservan los cinco turnos numéricos con cámara de doble validación, los cuatro turnos de doble validación visual y las reglas de las otras seis interacciones. |
| Limitación | El perfil local permite descargar el respaldo JSON. La interfaz carece de importador y de selector de cuentas. | Se verificó la rehidratación del progreso exportado en un perfil de prueba de Chromium y se comprobó que restablecer la personalización conserva los datos de aprendizaje. |

## Actividades educativas

| Lección | Cambio |
| --- | --- |
| Expresiones cotidianas | Se eligen tres clips por movimiento de muñeca, configuración de los dedos y uso de ambas manos. En la evaluación se vinculan las demostraciones con afirmar, indicar ausencia y expresar abundancia. |
| Solo y Con | Se comparan clips y se distingue el recorrido de una mano del acercamiento de ambas. La evaluación pide identificar qué ocurre primero y después durante «Con». |
| Cero y cantidades vacías | Se conserva la comparación con el diagrama de Uno y se incorpora su fotografía para contrastar el índice extendido con la mano cerrada de Cero en la lámina. |
| Evaluación integradora | Una fotografía sustituye el diagrama en la identificación de Tres. Dos clips evalúan «Nada» y «Con» junto con los casos de saludo y lugar. |
| Introducción a la LSP y Comunicación visual | Se conservan las actividades teóricas. Las alternativas ponen a prueba la procedencia del material y la preparación de la observación. |
| Saludos, Cortesía, Familia y Comunidad | Las consignas remiten a rasgos que ya documentan las fichas del MINEDU, como posición inicial, flechas, configuración y recorrido. |
| Del seis al diez | Conserva la práctica con la figura 2 y los recuentos. La ampliación de la evaluación visual requiere demostraciones individuales adecuadas de estos cinco números. |

Los identificadores de lecciones, preguntas y respuestas correctas se conservaron para recuperar la puntuación de recorridos anteriores. Algunos ejercicios siguen dependiendo de consultar la lámina enlazada. Para convertirlos en ejercicios visuales autónomos hacen falta recortes o demostraciones revisadas de los materiales. Las fotos, clips y diagramas usados conservan su estado de revisión lingüística pendiente.

## Minijuegos

| Juego | Revisión en Chromium y pruebas de estado |
| --- | --- |
| Memoria de señas | Se voltearon cartas, se comprobó el bloqueo de una tercera selección mientras se resuelve una pareja incorrecta y se verificaron movimientos, tiempo, niveles y récords. |
| Adivina la seña | Se comprobó la identificación entre cantidades cercanas, la descripción sin glosa previa, el cambio de foto a diagrama tras responder, las explicaciones y los resultados. |
| Reto contrarreloj | Se comprobaron preparación, cuenta regresiva, cambios de objetivo y puntuación en visual, vencimiento, permiso denegado, cámara ausente y limpieza. Las pruebas de estado cubren el combo, el cambio de modalidad y la separación de récords. |
| Desafío de señas | Se recorrieron estudio, ocultación, error de orden, corrección, ayuda y resultados. Con captura sintética se probó la pausa y reanudación de la misma sesión y su liberación al abandonar. |
| Relaciona y aprende | Se probaron selección por teclado, toque, eventos de arrastre, parejas erróneas, corrección y resultados. |

## Verificación

| Comprobación | Resultado |
| --- | --- |
| TypeScript y build de producción | Aprobados con `npm.cmd run build`. |
| ESLint y formato de Git | Aprobados con `npm.cmd run lint` y `git diff --check`. |
| Pruebas de la aplicación | 248 aprobadas, 0 fallidas y 1 omitida. La prueba omitida requiere `ml/artifacts/hito-3/model.json`. |
| Motor web | 6 aprobadas con `node --test ml/tests/web.test.mjs`. |
| Auditoría visual | 224 combinaciones aprobadas en Chromium con 16 vistas, 7 anchos de 320 a 1920 px y ambos temas. La pasada registró cero desbordamientos, errores de red o ejecución y solicitudes externas. Las pruebas de tema cubren contraste de texto, controles y estados. |
| Inicio, navegación y Situaciones | Se comprobaron accesos e historial, enlace de salto, almacenamiento bloqueado y aviso ante documento externo inaccesible. Las seis situaciones y sus quince interacciones obtuvieron 240 XP y repetir no volvió a conceder XP. |
| Aprender | Se finalizaron las 12 lecciones y se obtuvieron 960 XP. El repaso pasó de 5/6 a 6/6 y se restauró tras recargar. Se comprobaron reproducción de clips y tamaños de pantalla de 390 y 768 px. |
| Biblioteca y multimedia | Se verificaron 35 fichas, filtros combinados, favoritos, navegación de teclado, enlace a ficha y retorno a lección. Los 10 videos originales se decodificaron y reprodujeron, cinco en escritorio y cinco a 390 px. El recorrido comprobó fotos, referencias y disponibilidad de práctica dirigida. |
| Progreso y Mi perfil | Se comprobaron XP, nivel, racha, insignias, récord histórico, registro sin fecha, favoritos al recargar, exportación con reintento, restablecimiento de perfil y restitución del progreso exportado. |
| Minijuegos | Se completaron los cinco recorridos y resultados en escritorio claro y móvil oscuro. También se verificaron teclado, toque, arrastre, abandono y récord al volver a abrir el juego. |

Durante la auditoría se reprodujo el bloqueo de exportación en la versión previa. Algunos ensayos de cámara agotaron la espera del Worker con varias instancias de Chromium activas. Las ejecuciones finales de práctica, Situaciones y Minijuegos pasaron en procesos separados. La comprobación física y los recorridos que requieren grabaciones privadas siguen pendientes.

## Reconocimiento sin cámara física

La cámara sintética de Chromium permitió probar el arranque, la denegación o ausencia del dispositivo, el seguimiento sin manos, la transición al ejercicio visual y la liberación de pistas y Workers. Esas pruebas se distinguieron de las de estado con observaciones de prueba. El rechazo de eventos antiguos, el rearme tras retirar la mano y el bloqueo de puntuación duplicada se cubren también con pruebas automatizadas del estado y de la puerta de entrada de gestos.

| Integración | Evidencia disponible |
| --- | --- |
| Centro de práctica | Modelo servido en producción, denegación y recuperación, detector sin manos, reinicio y cierre. |
| Aprender | Números básicos en cámara sintética y alternativa visual, con permiso denegado y salida sin dejar pistas activas. Las lecciones nuevas se completaron sin solicitudes de cámara. |
| Situaciones | Permiso denegado, resultado por seguimiento insuficiente, cambio a ejercicio visual y liberación de recursos. Las pruebas de estado verifican que una coincidencia con una alternativa equivocada deja el turno pendiente. |
| Desafío de señas | Inicio sintético, pausa al mostrar ayuda, reanudación de la misma sesión y cierre al abandonar. |
| Reto contrarreloj | Inicio sintético, cuenta regresiva, tiempo agotado sin manos y prueba con un clip original en el Worker. |

### Por qué el video de Uno seguía en «Buscando manos»

1. **Recurso.** Chromium decodificó el MP4 original de 848 × 478 px y 6,27 s. La vista previa recibió 414 fotogramas de la pista que mostró la postura a los 3,45 s, el mismo tramo relativo usado en la fase 2.
2. **Detector.** MediaPipe devolvió puntos de la mano en 10 de 10 observaciones del tramo del 55 %. También detectó la mano en los tramos del 15 % y 35 %, en la ampliación central y en la foto de control. Los tramos del 75 % y 90 % devolvieron cero manos en esta pasada.
3. **Entorno y sesión en vivo.** En Chromium 157 sin interfaz, con el delegado GPU ejecutado por SwiftShader, las 51 observaciones de la prueba tardaron entre 479 y 4836 ms desde la captura hasta la respuesta. Ninguna llegó dentro del límite vigente de 120 ms. El filtro de frescura las descartó antes del seguimiento visual y del clasificador en vivo. Así se reprodujo «Buscando manos» con 0 puntos pese a las detecciones del Worker.
4. **Clasificador.** Al repetir fuera de la interfaz los puntos reales de una postura del tramo del 55 % con un reloj simulado, la misma V1 confirmó `LSP-001`. Ese resultado aísla el clasificador de la latencia en este caso. La comprobación física y la clasificación en tiempo real con una webcam quedan pendientes. Se conservaron los umbrales y los modelos.

Las confirmaciones positivas de V1 mediante tomas históricas y la validación física siguen pendientes. Los respaldos privados de 355 y 505 tomas, el artefacto privado V1 y el ZIP de feria no aparecieron en las ubicaciones accesibles. Los hashes históricos del dataset y del ZIP se conservan en el informe de fase 1. [Verificación histórica de integridad](hito-6-8-fase-1-profundizacion-pedagogica.md#integridad-verificada-por-sha-256)

## Capturas

- Aprender en tema claro, con tres clips y alternativas sin revelar. [Expresiones cotidianas](evidencia-hito-6-8-fase-3/aprender-expresiones-clips.png)
- Aprender en móvil oscuro, con la corrección y las demostraciones de la evaluación. [Evaluación integradora](evidencia-hito-6-8-fase-3/aprender-repaso-movil-oscuro.png)
- Situaciones en móvil oscuro, con la comprobación visual correcta y el contexto pendiente, seguida del turno correcto y la reacción. [Doble comprobación](evidencia-hito-6-8-fase-3/comedor-visual-correcto-contexto-incorrecto.png) · [Transición del comedor](evidencia-hito-6-8-fase-3/comedor-transicion-narrativa.png)
- Desafío de señas con captura sintética, en la pista y al volver a la misma sesión. [Pista](evidencia-hito-6-8-fase-3/escritorio-dark-senas-camara-pista.png) · [Reanudación](evidencia-hito-6-8-fase-3/escritorio-dark-senas-camara-reanudada.png)
- Reto contrarreloj con el video original entrando por una pista de lienzo en el navegador. [Diagnóstico de Uno](evidencia-hito-6-8-fase-3/escritorio-dark-desafio-video-educativo.png)

## Archivos e integridad

| Área | Archivos |
| --- | --- |
| Actividades de Aprender | `src/data/basicLessons.ts`, `src/components/LessonActivity.tsx`, `src/components/QuizSignMedia.css`, `src/pages/AcademyPage.css` |
| Situaciones | `src/data/situations.ts`, `src/data/situationStudy.ts`, `src/components/SituationDialogue.tsx`, `src/pages/SituationScenePage.tsx`, `src/pages/SituationsPage.css` |
| Minijuegos y perfil | `src/pages/MinigameRunPage.tsx`, `src/pages/ProfilePage.tsx` |
| Verificación | `scripts/recognition-lab-browser.mjs`, `scripts/fixtures/curriculum-browser.mjs`, `scripts/fixtures/fair-audit-browser.mjs`, `scripts/fixtures/minigames-browser.mjs`, `scripts/fixtures/situation-browser.mjs`, `scripts/fixtures/student-overview-browser.mjs` |
| Entrega | Este informe y `docs/evidencia-hito-6-8-fase-3/` |

Git no registró cambios en `public`, `ml` ni `state`. Las 21 ilustraciones WebP y los 20 archivos multimedia originales mantienen su contenido. V1 y su copia en `dist` conservan el SHA-256 `afd2aae852de7bb07f0318c3ed392353d11e1e89816b59265273454c781e83f3`. No se realizaron commits ni pushes.

## Exposición de cinco minutos

| Tiempo | Demostración |
| --- | --- |
| 0:00–0:45 | En Biblioteca, busca «Nada» y muestra su foto, el clip y la referencia. |
| 0:45–1:45 | En Expresiones cotidianas, compara dos demostraciones y explica el rasgo que permite elegir. |
| 1:45–3:15 | En el comedor, elige «Uno» para la bandeja vacía e identifica su foto. Muestra por qué no avanza. Corrige con «Nada» para activar la reacción. |
| 3:15–4:30 | En Desafío visual, memoriza, oculta y reconstruye tres tarjetas. |
| 4:30–5:00 | Abre Progreso y muestra el resultado y el historial. |
