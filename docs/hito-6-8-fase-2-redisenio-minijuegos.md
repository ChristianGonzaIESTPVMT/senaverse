# Hito 6.8 · fase 2 · Minijuegos

Los cinco juegos tienen partidas propias, tres niveles y una pantalla de resultados. Las portadas conservan los cinco WebP y sus rutas e identificadores originales.

| Juego | Qué hace el estudiante | Cómo aprende y recibe devolución |
|---|---|---|
| Relaciona y aprende | Empareja señas con cantidades en dos columnas de 3, 4 o 5 elementos mezclados. Selecciona ambos extremos con ratón, teclado o toque, o arrastra la seña a la cantidad. | Los extremos comparten un número de conexión. Al comprobar, las parejas correctas quedan fijas y se pueden corregir las demás. La devolución identifica los dedos relevantes y el resultado repasa los significados. |
| Memoria de señas | Voltea cartas para combinar una foto o un diagrama con su palabra y cantidad. Juega con 3, 4 o 5 parejas según el nivel. | Las cartas ocultas muestran solo su número accesible. Una pareja correcta queda visible y marcada. Tras un fallo, es posible observar ambas cartas antes de ocultarlas. El resultado cuenta movimientos y tiempo. |
| Adivina la seña | Observa una fotografía e identifica su significado entre 2, 3 o 4 alternativas cercanas. Juega 3, 4 o 5 rondas. | La foto tiene una descripción de la postura sin glosa previa. Tras responder, aparecen el significado, los rasgos que lo distinguen y una opción para alternar la fotografía y el diagrama. Cada acierto suma 10 puntos y prolonga la racha. |
| Desafío de señas | Memoriza una secuencia de 3, 4 o 5 señas. La oculta y la reconstruye ordenando tarjetas visuales o ejecutando los gestos, uno a uno. | El tablero marca la posición y los aciertos. En visual, conserva el prefijo correcto y permite corregir el resto. En cámara, una clase distinta registra un error y deja abierta la misma posición. Volver a mostrar la secuencia marca la partida como asistida. |
| Reto contrarreloj | Prepara la cámara, espera tres segundos y encadena objetivos de ejecución gestual. En visual, encadena interpretaciones de fotos. Hay rondas de 30, 60, 90 segundos o un recorrido sin reloj con 5, 8 o 12 objetivos. | Presenta un objetivo nuevo tras el acierto, puntúa por aciertos y muestra el combo actual. Los niveles con cámara amplían el conjunto de Uno a Tres, Cuatro o Cinco. Las rondas con reloj terminan al vencer el plazo o al completar la cola de 30, 60 o 90 objetivos. |

Las demostraciones usan las fotografías originales de Uno a Cinco y los diagramas basados en la figura 2, página 72, de la guía del MINEDU. Los dos recursos siguen pendientes de revisión lingüística. Los puntos que muestran cantidades representan el significado matemático. Las ilustraciones de portada se usan en el catálogo. Se dejaron fuera las señas dinámicas para acotar la evaluación a las configuraciones estáticas disponibles.

La cámara reutiliza `PracticeCamera` y `useRecognition` desde `RecognitionPractice`. Al cambiar de objetivo se reinicia la ventana de análisis y se descartan fotogramas capturados antes de la apertura. Tras una decisión, la ejecución siguiente requiere al menos 120 ms entre observaciones nuevas sin manos. Solo la clase confirmada puede avanzar un objetivo. Una seña distinta rompe el combo. El seguimiento insuficiente y los errores técnicos dejan el marcador intacto. El reloj de cámara se pausa si el dispositivo o el detector dejan de estar listos. Salir, abandonar, reiniciar o finalizar libera las pistas y el Worker.

El historial conserva las partidas anteriores. Las nuevas entradas llevan `rules: 2` y registran modalidad, nivel, duración, puntos, aciertos, errores, tiempo, mejor racha, movimientos cuando corresponde y uso de ayuda. Los récords del juego se calculan por configuración. Desafío también muestra récords con y sin ayuda. En Memoria se priorizan menos movimientos y, en caso de empate, menos tiempo. Se mantienen los 20 XP por la primera partida con aciertos de cada identificador. Cambiar de modalidad, repetir o restaurar el historial no vuelve a concederlos. Las partidas abandonadas se descartan.

## Capturas de Chromium

| Juego | Escritorio claro · 1440 × 980 | Móvil oscuro · 390 × 844 |
|---|---|---|
| Relaciona y aprende | [Partida](evidencia-hito-6-8-fase-2/escritorio-light-relaciona-partida.png) · [Resultado](evidencia-hito-6-8-fase-2/escritorio-light-relaciona-resultado.png) | [Partida](evidencia-hito-6-8-fase-2/movil-dark-relaciona-partida.png) · [Resultado](evidencia-hito-6-8-fase-2/movil-dark-relaciona-resultado.png) |
| Memoria de señas | [Partida](evidencia-hito-6-8-fase-2/escritorio-light-memoria-partida.png) · [Resultado](evidencia-hito-6-8-fase-2/escritorio-light-memoria-resultado.png) | [Partida](evidencia-hito-6-8-fase-2/movil-dark-memoria-partida.png) · [Resultado](evidencia-hito-6-8-fase-2/movil-dark-memoria-resultado.png) |
| Adivina la seña | [Partida](evidencia-hito-6-8-fase-2/escritorio-light-adivina-partida.png) · [Resultado](evidencia-hito-6-8-fase-2/escritorio-light-adivina-resultado.png) | [Partida](evidencia-hito-6-8-fase-2/movil-dark-adivina-partida.png) · [Resultado](evidencia-hito-6-8-fase-2/movil-dark-adivina-resultado.png) |
| Desafío de señas | [Partida](evidencia-hito-6-8-fase-2/escritorio-light-senas-partida.png) · [Resultado](evidencia-hito-6-8-fase-2/escritorio-light-senas-resultado.png) | [Partida](evidencia-hito-6-8-fase-2/movil-dark-senas-partida.png) · [Resultado](evidencia-hito-6-8-fase-2/movil-dark-senas-resultado.png) |
| Reto contrarreloj | [Partida](evidencia-hito-6-8-fase-2/escritorio-light-desafio-partida.png) · [Resultado](evidencia-hito-6-8-fase-2/escritorio-light-desafio-resultado.png) | [Partida](evidencia-hito-6-8-fase-2/movil-dark-desafio-partida.png) · [Resultado](evidencia-hito-6-8-fase-2/movil-dark-desafio-resultado.png) |

Las capturas adicionales muestran [Desafío con cámara sintética](evidencia-hito-6-8-fase-2/escritorio-dark-senas-camara-partida.png) y [Reto con cámara sintética](evidencia-hito-6-8-fase-2/escritorio-light-desafio-camara-partida.png) con su [resultado al vencer el plazo](evidencia-hito-6-8-fase-2/escritorio-light-desafio-camara-resultado.png).

## Verificación

| Comprobación | Resultado |
|---|---|
| TypeScript y Vite | Compilación de producción correcta con `npm.cmd run build`. |
| ESLint y Git | `npm.cmd run lint` y `git diff --check` correctos. |
| Aplicación | 248 pruebas aprobadas y una omitida porque requiere el artefacto privado de V1. Incluye ocho pruebas nuevas del estado de las partidas y la restauración de resultados. |
| Motor web | 6 pruebas aprobadas con `node --test ml/tests/web.test.mjs`. |
| Chrome 157 | Los cinco recorridos visuales se completaron en escritorio claro y móvil oscuro. También se abrieron y comprobaron en escritorio oscuro y móvil claro. Se probó conexión por teclado, toque y arrastre, correcciones, tiempo, cambios de modalidad, abandono, persistencia y XP una sola vez por juego. |
| Regresión multimedia en producción | Pasó el recorrido de fotografías y clips originales en escritorio y móvil. El visor de Adivina se comprobó con una descripción accesible sin glosa y sin solicitudes externas. |
| Cámara sintética | Se probó la preparación, la cuenta regresiva, la ausencia de aciertos sin manos, la denegación del permiso, la falta de cámara, el vencimiento y la liberación de recursos al finalizar y abandonar. |
| Grabación educativa | Chromium entregó al Worker una postura del video original de Uno por una pista de captura de lienzo. El detector terminó en «Buscando manos» y el marcador quedó en 0. Esta prueba confirma la entrada de vídeo y la limpieza de recursos. La validación de aciertos con respaldos históricos y el ensayo con una webcam física siguen pendientes. [Captura del ensayo](evidencia-hito-6-8-fase-2/escritorio-dark-desafio-video-educativo.png) |

El recorrido automatizado puede repetirse con el siguiente comando. Un cuarto argumento opcional acepta un respaldo local de capturas revisadas para reinyectar puntos de Uno y Dos. Activa comprobaciones adicionales de clases distintas, rearme y postura sostenida.

```powershell
$env:SENAVERSE_GAME_EVIDENCE = 'docs/evidencia-hito-6-8-fase-2'
node --experimental-strip-types scripts/recognition-lab-browser.mjs 'C:\Program Files\Google\Chrome\Application\chrome.exe' minigames-production
```

## Ensayo con tu cámara

1. Ejecuta `npm.cmd run dev` desde el repositorio y abre la dirección local que muestra Vite. Usa localhost o HTTPS para que el navegador pueda acceder a la cámara.
2. Ve a **Minijuegos → Reto contrarreloj**. Elige **Principiante**, **Cámara experimental** y **30 segundos**. Inicia, activa la cámara y acepta el permiso.
3. Coloca toda la mano en cuadro con luz frontal y usa el diagrama de cada objetivo. Mantén la postura hasta la decisión. Retira la mano del encuadre antes del siguiente gesto. Prueba también una seña distinta y observa si el contador de aciertos se mantiene.
4. En **Desafío de señas**, elige **Principiante** y cámara. Memoriza las tres posturas, oculta la secuencia y reprodúcela en orden. Ensaya el mismo nivel sin cámara y compara los récords. Prueba **Ver ayuda** para comprobar que el resultado se registra aparte.
5. Abandona una partida con la cámara abierta y comprueba que se apaga el indicador del navegador. Para ensayar un fallo, deniega el permiso en una sesión de prueba y vuelve a la modalidad visual.

Para una exposición de cinco minutos, **Desafío de señas en modalidad visual** permite explicar la fase de estudio, ocultar la secuencia e invitar a alguien a reconstruirla. Dedica un minuto a mostrar el orden y dos a jugar y corregir. Usa el tiempo restante para comparar el resultado con ayuda y mostrar la opción de cámara si ya ensayaste con el dispositivo de la exposición.

## Integridad y archivos

El modelo V1 del repositorio y su copia en `dist` tienen SHA-256 `afd2aae852de7bb07f0318c3ed392353d11e1e89816b59265273454c781e83f3`, igual al informe de fase 1. La revisión de Git comprobó que las 21 WebP y los 20 medios originales siguen intactos. El motor en vivo, el clasificador, sus umbrales, el pipeline V2, Dataset Studio, Biblioteca, las lecciones y la doble validación de Situaciones quedan fuera del cambio.

Los respaldos históricos de 355 y 505 tomas y el ZIP de feria no se encontraron en las ubicaciones accesibles durante esta fase. El trabajo no escribe en esas rutas. Los hashes independientes de esos tres archivos corresponden a la [verificación de fase 1](hito-6-8-fase-1-profundizacion-pedagogica.md#integridad-verificada-por-sha-256).

| Área | Archivos |
|---|---|
| Interfaz de partida | `src/pages/MinigameRunPage.tsx`, `src/pages/MinigamesPage.css`, `src/data/minigames.ts` |
| Estado, restauración y récords | `src/data/gameMechanics.ts`, `src/data/minigameRun.ts`, `src/data/progress.ts` |
| Cámara y confirmaciones | `src/components/RecognitionPractice.tsx`, `src/features/sign-recognition/useRecognition.ts`, `src/data/gameGestures.ts` |
| Verificación | `scripts/game-mechanics.test.mjs`, `scripts/hand-detection.test.mjs`, `scripts/fixtures/minigames-browser.mjs`, `scripts/fixtures/media-browser.mjs`, `scripts/recognition-lab-browser.mjs` |
| Entrega | Este informe y `docs/evidencia-hito-6-8-fase-2/` |
