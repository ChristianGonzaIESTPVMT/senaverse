# Hito 6.2 · Recursos visuales y multimedia

## Auditoría inicial

| Módulo | Recursos y presentación antes del hito |
| --- | --- |
| Aprender | Seis unidades con ilustraciones decorativas reutilizadas y doce lecciones. Hay láminas externas del MINEDU, cinco diagramas propios de Uno a Cinco y dos preguntas que reutilizan los de Uno y Tres. La lección Números básicos enlaza a la lámina y a las fichas. Las lecciones preliminares muestran un marcador audiovisual con icono de reproducción. |
| Biblioteca | 35 fichas. 24 enlazan a dos PDF oficiales. Los cinco diagramas numéricos se dibujan en un lienzo de 360 × 440 píxeles. Ninguna ficha apunta a una imagen recortada, a un archivo de video o a una pista de subtítulos. Las vistas de ficha tenían ramas separadas para imagen, diagrama y video, sin ampliación. |
| Cámara | Diez clases compatibles. El panel combina instrucciones de ejecución y enlaces a las fuentes, mientras que el flujo de video de la webcam y los landmarks son recursos de práctica en tiempo real. El componente de demostración separado carece de consumidores. |
| Situaciones | Seis ilustraciones contextuales de escuela, conversación, tienda, biblioteca, alimentos y números. Se componen con iconos y CSS. La práctica muestra instrucciones y enlaces, y el escenario conserva su progreso al consultar Biblioteca. |
| Minijuegos | Cinco portadas decorativas. Memoria, Adivina la seña y Reto contrarreloj usan los diagramas numéricos sin respuestas escritas. Desafío usa la práctica dirigida y Relaciona y aprende usa descripciones. |
| Inicio | Logo local y ocho ilustraciones de respaldo basadas en los iconos del sistema visual. El saludo decorativo no representa una demostración de LSP. El mismo componente de ilustración se comparte con Aprender, Situaciones y Minijuegos. |

El inventario del Hito 6.1 identifica 24 entradas de vocabulario sin video demostrativo incorporado. Varias estaban enlazadas solo al PDF general. La guía pesa 102,6 MiB según el repositorio y la lámina numérica concentra muchos números en una página. Ambos formatos obligaban a cambiar de pestaña y ampliar el PDF para consultar detalles en una pantalla pequeña. Aprender, Biblioteca, Cámara y la práctica contextual implementaban por separado la presentación de las referencias.

## Visor y catálogo compartidos

`src/data/educationalMedia.ts` define solicitudes de lámina, diagramas, imágenes individuales, secuencias y videos. Cada ficha de `src/data/library.ts` publica un único objeto `media` con identificadores estables, seña, ubicación local o externa, alternativa accesible, institución o autor, página, condiciones de uso y estados separados de disponibilidad y validación. Las láminas incluyen un localizador de figura. Los cinco diagramas se dibujan a 360 × 440 píxeles en el navegador con el componente existente.

`SignMediaViewer` presenta instrucciones, medios y referencias. El diálogo de ampliación se abre a petición del estudiante, admite Escape y devuelve el foco sin navegar. Aprender muestra cinco diagramas dentro de Números básicos, y conserva un enlace por lámina en cada paso de estudio. Biblioteca muestra la referencia en la ficha y una miniatura donde hay una imagen individual. Cámara muestra la referencia educativa en un panel distinto de los landmarks. Situaciones y Desafío de señas reutilizan ese panel. Los juegos y las evaluaciones visuales usan la vista sin rótulos y filtran recursos con `getQuizVisual`.

Para incorporar un material autorizado se añade una entrada en `assets` de la ficha correspondiente. El catálogo admite una imagen individual o una secuencia ordenada y un video. Cada fotograma de una secuencia registra dimensiones y texto alternativo. El video admite un archivo local o una URL HTTPS directa, además de subtítulos WebVTT locales si corresponden. El reproductor se monta tras **Cargar video**, ofrece controles nativos de reproducción, pausa y pantalla completa según el navegador, y añade velocidad de 0,5× a 1× y repetición. Ante un error muestra un estado de carga fallida y permite volver a intentar. El catálogo marca los videos actuales como pendientes y el visor carece de controles de reproducción para esas fichas.

El arte contextual de los seis escenarios se reutiliza. Las cinco portadas de minijuegos usan iconos locales coherentes con Situaciones. La ilustración principal de Inicio y Aprender reutiliza el libro del sistema visual. Los elementos decorativos quedan fuera de la enseñanza y de la evaluación de posturas.

## Recursos efectivamente disponibles

| Recurso | Cantidad | Disponibilidad |
| --- | ---: | --- |
| Referencias individuales ampliables de LSP | 5 | Diagramas propios de Uno a Cinco incluidos en la aplicación |
| Recortes o imágenes individuales extraídas de fuentes de terceros | 0 | Pendientes de permiso específico |
| Láminas oficiales enlazadas | 24 fichas, 8 páginas distintas, 2 PDF | Consulta externa y voluntaria |
| Secuencias ilustradas dentro del visor | 0 | Hay secuencias consultables en la guía para ambos saludos y Familia |
| Videos demostrativos de LSP | 0 | Pendientes las 35 fichas |
| PDFs, imágenes de señas o videos añadidos como archivos al build | 0 | Los diagramas propios se incluyen como código |

El metadato `dc.rights.uri` de la guía de 2015 registra **CC BY-NC-ND 2.5 Perú** y la página de créditos indica derechos reservados. Se enlazan la obra original y sus páginas exactas. Los recortes de viñetas quedan pendientes de permiso específico. Para la figura 2 de la cartilla no se pudo confirmar una licencia específica de redistribución de recortes. La propia figura acredita su adaptación de la guía. [Registro completo del MINEDU](https://repositorio.minedu.gob.pe/handle/20.500.12799/5545?show=full), [metadatos del registro en ALICIA](https://alicia.concytec.gob.pe/vufind/index.php/Record/MIIN_a99ba3532e88df544c391ae31f16f5e5/Details), [condiciones CC BY-NC-ND 2.5 Perú](https://creativecommons.org/licenses/by-nc-nd/2.5/pe/), [cartilla del MINEDU, figura 2](https://formacionenservicio.minedu.gob.pe/sifods/centro-recurso/2022/Lineas-de-formacion-priorizadas/Mejora-de-Aprendizajes/Atencion-a-la-diversidad/Cartilla/orientaciones-discapacidad-auditiva.pdf#page=14)

Se revisó el Diccionario LSP de la PUCP como referencia potencial. La publicación institucional identifica videos realizados con personas de la comunidad sorda y remite a la consulta en línea. La consulta directa devolvió HTTP 403 en este entorno y no se pudo confirmar una URL de video autorizada por ficha. [Publicación de la PUCP sobre su diccionario](https://puntoedu.pucp.edu.pe/investigaciones/investigacion/primer-diccionario-virtual-bilingue-de-lengua-de-senas-peruana-a-espanol/)

## Inventario por seña y prioridades

La columna de movimiento describe lo que se observa en el recurso estudiado. **1** indica grabación prioritaria por la dificultad de interpretar el movimiento en la lámina, **2** indica ampliación del currículo actual, y **3** requiere localizar la demostración exacta y revisarla antes de integrarla. Los clips y las instrucciones de todas las fichas requieren revisión con personas competentes en LSP.

| Seña | Video | Referencia ilustrada | Postura o movimiento | Prioridad |
| --- | --- | --- | --- | ---: |
| Uno · LSP-001 | Pendiente | Diagrama local y cartilla p. impresa 72, PDF p. 14 | Postura | 2 |
| Dos · LSP-002 | Pendiente | Diagrama local y cartilla p. 72/14 | Postura | 2 |
| Tres · LSP-003 | Pendiente | Diagrama local y cartilla p. 72/14 | Postura | 2 |
| Cuatro · LSP-004 | Pendiente | Diagrama local y cartilla p. 72/14 | Postura | 2 |
| Cinco · LSP-005 | Pendiente | Diagrama local y cartilla p. 72/14 | Postura | 2 |
| Sí · LSP-006 | Pendiente | Guía p. 134, centro a la derecha | Movimiento de muñeca | 1 |
| Nada · LSP-007 | Pendiente | Guía p. 134, arriba a la derecha | Desplazamiento con una mano, además de referencia facial en la viñeta | 1 |
| Mucho · LSP-008 | Pendiente | Guía p. 134, arriba a la izquierda | Movimiento de dedos de ambas manos | 1 |
| Solo · LSP-009 | Pendiente | Guía p. 135, arriba a la izquierda | Giro | 1 |
| Con · LSP-010 | Pendiente | Guía p. 135, abajo a la izquierda | Acercamiento de ambas manos | 1 |
| Cero | Pendiente | Cartilla p. 72/14 | Postura | 2 |
| Seis | Pendiente | Cartilla p. 72/14 | Postura ilustrada | 2 |
| Siete | Pendiente | Cartilla p. 72/14 | Postura ilustrada | 2 |
| Ocho | Pendiente | Cartilla p. 72/14 | Postura ilustrada | 2 |
| Nueve | Pendiente | Cartilla p. 72/14 | Postura ilustrada | 2 |
| Diez | Pendiente | Cartilla p. 72/14 | Postura con flecha de movimiento | 1 |
| Buenos días | Pendiente | Guía p. 46, secuencia inferior | Dos ilustraciones con flechas | 1 |
| Buenas noches | Pendiente | Guía p. 46, secuencia superior | Dos ilustraciones con flechas | 1 |
| Disculpa | Pendiente | Guía p. 47, arriba a la derecha | Desplazamiento de las manos | 2 |
| Familia | Pendiente | Guía p. 79, centro a la izquierda | Dos ilustraciones, movimiento semicircular | 1 |
| Mamá | Pendiente | Guía p. 79, centro a la derecha | Movimiento lateral | 2 |
| Papá | Pendiente | Guía p. 79, abajo a la izquierda | Movimiento lateral | 2 |
| Casa | Pendiente | Guía p. 254, arriba a la izquierda | Contacto de las yemas | 2 |
| Colegio | Pendiente | Guía p. 285, arriba a la izquierda | Movimiento circular según la guía | 2 |
| Hola | Pendiente | Pendiente de incorporar | Pendiente de revisión | 3 |
| Adiós | Pendiente | Pendiente de incorporar | Pendiente de revisión | 3 |
| Gracias | Pendiente | Pendiente de incorporar | Pendiente de revisión | 3 |
| No | Pendiente | Pendiente de incorporar | Pendiente de revisión | 3 |
| Hermano | Pendiente | Pendiente de incorporar | Pendiente de revisión | 3 |
| Feliz | Pendiente | Pendiente de incorporar | Pendiente de revisión | 3 |
| Triste | Pendiente | Pendiente de incorporar | Pendiente de revisión | 3 |
| Sorpresa | Pendiente | Pendiente de incorporar | Pendiente de revisión | 3 |
| Agua | Pendiente | Pendiente de incorporar | Pendiente de revisión | 3 |
| Comida | Pendiente | Pendiente de incorporar | Pendiente de revisión | 3 |
| Ayuda | Pendiente | Pendiente de incorporar | Pendiente de revisión | 3 |

Las fichas enlazadas guardan el número de página que se revisó en la fuente. Los cinco diagramas propios cubren posturas. Para las dinámicas, las fichas incluyen instrucciones y apuntan a flechas, rostro o secuencia según la viñeta. Solo y Nada mantienen las limitaciones del modelo experimental descritas en el Hito 6.1. [Guía ilustrada del MINEDU](https://repositorio.minedu.gob.pe/handle/20.500.12799/5545), [figura numérica en la cartilla](https://formacionenservicio.minedu.gob.pe/sifods/centro-recurso/2022/Lineas-de-formacion-priorizadas/Mejora-de-Aprendizajes/Atencion-a-la-diversidad/Cartilla/orientaciones-discapacidad-auditiva.pdf#page=14)

El inventario de Hito 6.1 también deja pendientes los clips de alfabeto y dactilología, las transiciones al deletrear un nombre, una presentación natural en LSP, la demostración específica de Por favor y los ejemplos de frases en situaciones cotidianas. Se necesitan grabaciones completas, procedencia y permisos por clip, y revisión con usuarios competentes de LSP antes de añadir ejercicios de producción.

## Rendimiento y dependencias externas

Los diagramas comparten un componente y sus trazados se ejecutan localmente. Las miniaturas de Biblioteca se montan para la página visible. El contenido ampliado del diálogo se monta al abrirlo. Las futuras imágenes usan dimensiones intrínsecas, carga diferida y decodificación asíncrona. Los videos se solicitan tras una acción explícita. No se añadieron paquetes ni transferencias binarias educativas al build. La prueba de producción bloqueó la resolución de sitios externos y comprobó navegación, diagramas, modelo y Worker de cámara con **cero solicitudes externas** durante el recorrido local. La consulta de la guía, la cartilla y futuras fuentes externas requiere internet. La prueba usó un servidor HTTP local y Chromium en este equipo.

## Verificación técnica

- TypeScript, ESLint y el build de producción terminaron correctamente.
- Pasaron **238 pruebas automatizadas**: 219 de `npm.cmd test`, 6 de `node --test ml/tests/web.test.mjs` y 13 de `python -m unittest discover -s ml/tests -v` desde el entorno de ML. Los recorridos de Chromium se ejecutaron por separado.
- `media-development` y `media-production` comprobaron los cinco diagramas, la ampliación en tema oscuro a 390 px, Escape y restauración de foco en Biblioteca, conservación del paso en Aprender y seguimiento de cámara mientras se abre el visor. El caso de Solo muestra el enlace a la flecha de giro. Adivina la seña conserva un dibujo sin rótulo de respuesta. Las seis ilustraciones contextuales y las cinco portadas cargaron localmente. Las pruebas del catálogo verificaron 24 enlaces con página exacta.
- El visor reprodujo, pausó, ralentizó y repitió un archivo WebM geométrico generado dentro de la prueba aislada en desarrollo. Una secuencia de dos figuras permitió comprobar el texto alternativo y la ampliación. Un 404 verificó el manejo de recursos ausentes. El catálogo público contiene cero videos y el build excluye los archivos de prueba.
- En producción también pasaron Biblioteca, las 12 lecciones del currículo, Números básicos, Situaciones, Minijuegos y el panel de progreso. Los recorridos cubrieron retorno a la actividad, reanudación, alternativas a cámara, coincidencias con capturas históricas, liberación de recursos y recompensas por primera finalización.
- El SHA-256 del dataset de 355 muestras coincide con su manifiesto original. El modelo público y la copia de producción son idénticos. El build carece del directorio privado `ml` y de archivos PDF, MP4, WebM y WebVTT. Se mantuvieron las recompensas y el formato del progreso.

## Archivos del hito

| Área | Archivos |
| --- | --- |
| Catálogo y modelo de datos | `src/data/educationalMedia.ts`, `src/data/library.ts`, `src/data/curriculum.ts`, `src/data/minigames.ts`, `src/data/studentOverview.ts`, `src/data/homeVisuals.ts` |
| Visor y componentes | `src/components/SignMediaViewer.tsx`, `src/components/SignMediaViewer.css`, `src/components/LessonSequence.tsx`, `src/components/LessonActivity.tsx`, `src/components/DirectedLessonPractice.tsx`, `src/components/GuidedSignPractice.tsx`, `src/components/RecognitionPractice.tsx`, `src/components/PracticeContent.tsx`, `src/components/SituationContent.tsx`, `src/components/HomeVisual.tsx` |
| Pantallas y estilos | `src/pages/LibraryPage.tsx`, `src/pages/LibraryPage.css`, `src/pages/LessonPage.tsx`, `src/pages/AcademyPage.css`, `src/pages/CameraPage.css`, `src/pages/MinigameRunPage.tsx`, `src/pages/MinigamesPage.tsx`, `src/pages/MinigamesPage.css` |
| Pruebas | `scripts/educational-media.test.mjs`, `scripts/fixtures/media-browser.mjs`, `scripts/fixtures/media-player-fixture.tsx`, `scripts/recognition-lab-browser.mjs` |

## Verificación manual

1. Inicia `npm.cmd run dev`. En Aprender, abre Números básicos, comienza la lección y amplía el diagrama de Uno. Cierra con Escape y comprueba que vuelves al botón y a la misma actividad. El enlace superior abre la figura completa.
2. En Biblioteca, abre Uno. Usa Tab para llegar a **Ampliar imagen** y pulsa Enter. Cierra primero la ampliación y luego la ficha. Abre Nada y revisa el localizador y la p. 134. Abre Hola para comprobar el estado pendiente.
3. En Cámara, elige Uno y activa manualmente la webcam. Abre y cierra la ampliación. Comprueba el flujo de cámara y el control separado de landmarks. Selecciona Solo para consultar el dibujo con la flecha de giro en la guía.
4. En Situaciones, comprueba la ilustración del entorno y la referencia de la práctica. En Adivina la seña, verifica que la imagen presenta una postura y las opciones aparecen en controles separados.
5. Ejecuta `npm.cmd run build` y `npm.cmd run preview`. Con el servidor local accesible, repite los pasos en tema claro y oscuro y con una ventana móvil. Desconecta el acceso externo si quieres verificar que los diagramas y la aplicación cargan desde el servidor local.

Para repetir las pruebas del visor en Chromium:

```powershell
$mediaChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/recognition-lab-browser.mjs $mediaChrome media-development
npm.cmd run build
node scripts/recognition-lab-browser.mjs $mediaChrome media-production
```

## Propuesta para el Hito 6.3

Auditar los recorridos de persona nueva y perfil histórico desde Inicio hasta Aprender, Biblioteca, Cámara, Situaciones, Minijuegos, Mi progreso y Perfil. Verificar navegación por teclado, legibilidad, foco, pantallas de permisos, pérdida de conexión, estados de carga, errores y recuperación de progreso. Repetir en el equipo de feria con la webcam física y registrar tiempos de primera carga y latencia observada. Revisar el contenido y los casos de Nada y Solo con personas competentes en LSP. Priorizar grabaciones autorizadas con manos, rostro y torso visibles, una ficha de procedencia y permisos por clip, subtítulos o descripción accesible y evidencia de revisión antes de incorporar el material.
