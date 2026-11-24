# Renovación visual de SeñaVerse

El paquete entregado contiene **21 ilustraciones WebP** y ocupa **2 088 486 bytes**. Los nombres, las dimensiones y el tamaño en bytes se contrastaron con `LEEME-ilustraciones.md` e `inventario-ilustraciones.json`. Las 21 copias de producción coincidieron con sus originales por SHA-256.

## Inventario integrado

Todas las rutas de esta tabla son relativas a `public/images/illustrations/`.

| ID | Recurso | Archivo | Dimensiones | Pantalla o uso |
|---|---|---|---|---|
| A1 | Primeros pasos | `aprender/unidad-01-primeros-pasos.webp` | 1200 × 600 | Tarjeta y cabecera de la unidad 1 |
| A2 | Números básicos | `aprender/unidad-02-numeros.webp` | 1200 × 600 | Tarjeta y cabecera de la unidad 2 |
| A3 | Saludos y cortesía | `aprender/unidad-03-saludos.webp` | 1200 × 600 | Tarjeta y cabecera de la unidad 3 |
| A4 | Expresiones cotidianas | `aprender/unidad-04-expresiones.webp` | 1200 × 600 | Tarjeta y cabecera de la unidad 4 |
| A5 | Personas, familia y entorno | `aprender/unidad-05-entorno.webp` | 1200 × 600 | Tarjeta y cabecera de la unidad 5 |
| A6 | Aplicación y evaluación | `aprender/unidad-06-evaluacion.webp` | 1200 × 600 | Tarjeta y cabecera de la unidad 6 |
| B1 | Comprando en una tienda | `situaciones/situacion-01-tienda.webp` | 1200 × 1200 | Tarjeta e interacciones. En la pregunta sobre el producto, aparece al comprobar |
| B2 | Pidiendo comida | `situaciones/situacion-02-comida.webp` | 1200 × 1200 | Tarjeta y después de comprobar la respuesta |
| B3 | Respondiendo preguntas | `situaciones/situacion-03-preguntas.webp` | 1200 × 1200 | Tarjeta e interacciones |
| B4 | Organizando una actividad | `situaciones/situacion-04-actividad.webp` | 1200 × 1200 | Tarjeta y después de comprobar la respuesta |
| B5 | Comprando útiles escolares | `situaciones/situacion-05-utiles.webp` | 1200 × 1200 | Tarjeta e interacciones |
| B6 | Eligiendo una cantidad | `situaciones/situacion-06-cantidad.webp` | 1200 × 1200 | Tarjeta y después de comprobar la respuesta |
| C1 | Memoria de señas | `minijuegos/juego-01-memoria.webp` | 960 × 640 | Tarjeta de acceso |
| C2 | Adivina la seña | `minijuegos/juego-02-adivina.webp` | 960 × 640 | Tarjeta de acceso |
| C3 | Reto contrarreloj | `minijuegos/juego-03-contrarreloj.webp` | 960 × 640 | Tarjeta de acceso |
| C4 | Desafío de señas | `minijuegos/juego-04-desafio-senas.webp` | 960 × 640 | Tarjeta de acceso |
| C5 | Relaciona y aprende | `minijuegos/juego-05-relaciona.webp` | 960 × 640 | Tarjeta de acceso |
| D1 | Presentación de SeñaVerse | `cabeceras/cabecera-presentacion.webp` | 1280 × 720 | Tarjeta visual de Presentación |
| D2 | Tu ruta de aprendizaje | `cabeceras/cabecera-ruta-aprendizaje.webp` | 600 × 600 | Banner del panel del estudiante |
| D3 | Centro de práctica | `cabeceras/cabecera-centro-practica.webp` | 640 × 480 | Cabecera de Cámara, fuera del visor |
| D4 | Comunicación visual | `recursos/recurso-comunicacion-visual.webp` | 960 × 720 | Lectura «Prepara el espacio» con sus dos referencias del MINEDU |

## Cambios de diseño

- **Presentación.** `HomePage` muestra una ilustración 16:9. El título, la descripción y el enlace son HTML. Los dos beneficios van debajo de la tarjeta y se acomodan en varias líneas cuando hace falta.
- **Panel del estudiante y Cámara.** `DashboardPage` y `CameraPage` usan las nuevas cabeceras con tamaños adaptados a pantallas estrechas. La ilustración de Cámara vive en la cabecera, antes del espacio de video en directo.
- **Aprender.** `AcademyPage` reutiliza `UnitIllustration` con una portada 2:1 por unidad. El texto de las métricas puede ajustarse a su tarjeta. `LessonSequence` muestra el recurso D4 con texto alternativo en la lectura introductoria sobre atención visual e iluminación.
- **Situaciones.** `SituationContent` resuelve la ilustración a partir de `illustrationSrc`. El encuadre completo mantiene visibles las caras y los objetos. Las escenas de comida, de organización de una actividad y de cantidades, así como la pregunta sobre el producto de la tienda, muestran el arte después de comprobar la alternativa. Sus objetos o personajes podrían sugerir una respuesta.
- **Minijuegos.** `MinigamesPage` usa portadas 3:2 con una altura máxima menor en móvil. Los elementos usados para identificar señas durante las partidas siguen usando sus recursos educativos.
- **Mi progreso.** Los diez logros tienen un símbolo SVG propio. El candado y el texto indican el estado de cada logro. Los marcos de las ilustraciones y los fondos de las insignias se ajustan al tema sin filtrar los WebP.

`Illustration` reserva las dimensiones intrínsecas y aplica carga diferida salvo a las imágenes principales de Presentación y del panel. Los catálogos contienen las rutas por unidad, situación, juego y lección. El servidor de feria acepta explícitamente los 21 WebP y los sirve con `image/webp`.

## Capturas de Chromium

Las capturas se tomaron del build final servido localmente. La de Comunicación visual enfoca la lectura y la de Presentación en móvil enfoca la tarjeta y sus dos etiquetas.

| Tamaño y tema | Capturas |
|---|---|
| Escritorio claro, 1366 × 768 | [Presentación](evidencia-renovacion-visual/1366x768-light-presentacion.png) · [Panel](evidencia-renovacion-visual/1366x768-light-inicio.png) · [Aprender](evidencia-renovacion-visual/1366x768-light-aprender.png) · [Comunicación visual](evidencia-renovacion-visual/1366x768-light-lectura.png) |
| Escritorio oscuro, 1920 × 1080 | [Situaciones](evidencia-renovacion-visual/1920x1080-dark-situaciones.png) · [Interacción de tienda](evidencia-renovacion-visual/1920x1080-dark-escena.png) · [Minijuegos](evidencia-renovacion-visual/1920x1080-dark-minijuegos.png) |
| Móvil claro, 390 × 844 | [Detalle de Presentación](evidencia-renovacion-visual/390x844-light-presentacion-detalle.png) · [Minijuegos](evidencia-renovacion-visual/390x844-light-minijuegos.png) |
| Móvil oscuro, 390 × 844 | [Centro de práctica](evidencia-renovacion-visual/390x844-dark-camara.png) · [Situaciones](evidencia-renovacion-visual/390x844-dark-situaciones.png) · [Insignias](evidencia-renovacion-visual/390x844-dark-insignias.png) |

## Verificación

- **Pruebas de Node.** La ejecución final en serie aprobó 226/226 pruebas, tanto en el directorio de trabajo como en una copia local aislada. Los primeros intentos tuvieron tiempos de espera en la carga de módulos SSR de Vite. Los reintentos aprobaron con `node --experimental-strip-types --test --test-concurrency=1 scripts/*.test.mjs` y `RAYON_NUM_THREADS=2`.
- **TypeScript, ESLint y Vite.** Pasaron la comprobación de tipos, lint y build. El servidor local verificó 72 archivos de producción, incluidos los 21 WebP. La prueba de feria también rechazó un JSON y un WebP ajenos al inventario.
- **Auditoría visual.** Chromium 158 comprobó 224 combinaciones de 16 vistas, dos temas y los anchos de 320, 360, 390, 768, 1024, 1366 y 1920 px. La auditoría del build final registró 0 errores HTTP, 0 errores de consola, 0 peticiones externas y 0 desbordamientos en los controles, diagramas y métricas comprobados. Verificó la relación de aspecto, las dimensiones reservadas, los archivos asociados y los diez SVG distintos de logros.
- **Recorrido del estudiante.** El recorrido funcional del build final verificó los accesos, los estados guardados entre documentos, la advertencia de referencia externa sin conexión y las 15 interacciones de las seis situaciones con alternativa sin cámara. Comprobó los 240 XP y que repetir un escenario no vuelve a concederlos. Las suites de Situaciones y Mi progreso también aprobaron el reintento aislado, que cubrió la práctica con grabaciones, la reanudación, los favoritos, la racha y la liberación de cámara.
- **Aprender, Biblioteca y minijuegos.** La suite de Aprender recorrió 6 unidades y 12 lecciones, comprobó la mejora de 5/6 a 6/6 en una evaluación, la persistencia de 960 XP del recorrido y la coincidencia guiada de «Con» con una grabación. Biblioteca verificó sus 35 fichas, filtros y enlaces a práctica. Minijuegos verificó los cinco juegos, los temporizadores, los récords y la práctica con una grabación.
- **Multimedia.** La prueba de producción verificó diez fotos y diez clips desde sus fichas. Los clips se repartieron en cinco pruebas de escritorio y cinco a 390 px. También se comprobó el visor, el progreso y la liberación de cámara con un perfil de Chromium aislado.
- **Reconocimiento V1.** La ejecución aislada de `student-production` aprobó en el build final. Comprobó MediaPipe sin manos, una sola reserva de cámara, los estados de permiso denegado y dispositivo no disponible, la confirmación dirigida de «Con» con landmarks de una grabación existente, el rechazo de la toma del ensayo y la liberación de recursos al desactivar la cámara o navegar.

La auditoría usó Chromium en Windows, con tamaños de pantalla emulados. Las comprobaciones del reconocedor utilizaron webcam sintética y, donde se indica, reproducciones de landmarks de grabaciones históricas. Quedan pendientes pruebas con cámara física y una revisión en otros motores de navegador.

## Integridad

`git diff` confirmó la conservación de los modelos, los directorios de entrenamiento, los componentes de seguimiento, Dataset Studio, la lógica de progreso y el multimedia original. Producción contiene las diez fotografías JPEG y los diez videos MP4. El ZIP de feria existente coincide con su archivo SHA-256.

| Archivo protegido | SHA-256 |
|---|---|
| Modelo V1 | `afd2aae852de7bb07f0318c3ed392353d11e1e89816b59265273454c781e83f3` |
| Dataset original de 355 grabaciones | `d8943f55f630f1eef9cdd011fbde632820a019d3887e560aada480324d9941f3` |
| Respaldo externo de 505 grabaciones | `4861455229fdbe3fdb818f48e7ab5a0b818d1e306f5a15d32af018ef45476cdc` |
| Paquete de feria 6.6 existente | `d27a54646a9b3f904fa8fdec43d4371b27f11dccdabb65fa6c50248803a76155` |

## Archivos de la integración

- Los catálogos en `src/data/` son `illustrations.ts`, `curriculum.ts`, `situations.ts`, `minigames.ts`, `basicLessons.ts` y `lessonPlan.ts`.
- Los componentes en `src/components/` son `Illustration.tsx`, `LessonSequence.tsx` y `SituationContent.tsx`.
- Las pantallas están en `src/pages/{HomePage,DashboardPage,AcademyPage,CameraPage,MinigamesPage,ProgressPage,SituationScenePage}.tsx`.
- Los estilos están en `src/App.css` y `src/pages/{Presentation,DashboardPage,AcademyPage,CameraPage,MinigamesPage,ProgressPage,SituationsPage}.css`.
- El servidor local y las pruebas están en `scripts/servidor-feria.mjs`, `scripts/{feria,illustrations}.test.mjs`, `scripts/recognition-lab-browser.mjs` y `scripts/fixtures/{fair-audit-browser,media-browser}.mjs`.
- Los WebP se encuentran en `public/images/illustrations/`. Los dos documentos del paquete están en la raíz y las capturas en `docs/evidencia-renovacion-visual/`.
