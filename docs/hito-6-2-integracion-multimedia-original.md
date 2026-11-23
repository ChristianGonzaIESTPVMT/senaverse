# Hito 6.2 · Integración del multimedia original

SeñaVerse incorpora una fotografía y un video propios para cada una de las diez señas compatibles con V1. La ficha educativa conserva sus instrucciones y la referencia del MINEDU. El visor acredita las fotos y los videos al autor del proyecto y señala que la revisión lingüística sigue pendiente, incluidas las señas Nada y Solo.

## Inventario y correspondencia

Los veinte originales adjuntos estaban en la carpeta `multimedia` indicada por el autor. La ruta `public/media/signs/` se creó para alojar las copias que sirve Vite. Se contrastó la correspondencia usando los nombres originales, las fotos y un fotograma de cada video.

| ID y seña | Fotografía original | Video original | Fotografía local | Video local |
| --- | --- | --- | --- | --- |
| `LSP-001` · Uno | `seña_1.jpeg` | `video_seña_1.mp4` | `lsp-001-uno.jpeg` | `lsp-001-uno.mp4` |
| `LSP-002` · Dos | `seña_2.jpeg` | `video_seña_2.mp4` | `lsp-002-dos.jpeg` | `lsp-002-dos.mp4` |
| `LSP-003` · Tres | `seña_3.jpeg` | `video_seña_3.mp4` | `lsp-003-tres.jpeg` | `lsp-003-tres.mp4` |
| `LSP-004` · Cuatro | `seña_4.jpeg` | `video_seña_4.mp4` | `lsp-004-cuatro.jpeg` | `lsp-004-cuatro.mp4` |
| `LSP-005` · Cinco | `seña_5.jpeg` | `video_seña_5.mp4` | `lsp-005-cinco.jpeg` | `lsp-005-cinco.mp4` |
| `LSP-006` · Sí | `seña_si.jpeg` | `video_seña_si.mp4` | `lsp-006-si.jpeg` | `lsp-006-si.mp4` |
| `LSP-007` · Nada | `seña_nada.jpeg` | `video_seña_nada.mp4` | `lsp-007-nada.jpeg` | `lsp-007-nada.mp4` |
| `LSP-008` · Mucho | `seña_mucho.jpeg` | `video_seña_mucho.mp4` | `lsp-008-mucho.jpeg` | `lsp-008-mucho.mp4` |
| `LSP-009` · Solo | `seña_solo.jpeg` | `video_seña_solo.mp4` | `lsp-009-solo.jpeg` | `lsp-009-solo.mp4` |
| `LSP-010` · Con | `seña_con.jpeg` | `video_seña_con.mp4` | `lsp-010-con.jpeg` | `lsp-010-con.mp4` |

Las diez fotos son JPEG de **1 200 × 1 600**, idénticas byte a byte a los originales. Los diez MP4 conservan su pista H.264 de **848 × 478**. Se copió esa pista sin recodificar, con el índice del MP4 al principio para facilitar el inicio. Las copias de publicación omiten la pista de audio y los metadatos privados del contenedor. Se comprobó por SHA-256 que la pista de video de cada copia coincide con la de su original.

Las fotos ocupan **1 687 890 bytes**. Los videos de publicación ocupan **11 308 872 bytes** en total, frente a **13 266 802 bytes** de los MP4 originales. El build suma **12 996 762 bytes** de multimedia educativa y el reproductor solicita cada video cuando el estudiante pulsa **Cargar video**.

## Integración por módulo

| Módulo | Uso del material |
| --- | --- |
| Biblioteca | Las diez tarjetas muestran la fotografía en miniatura sin recorte. La ficha abre con el nombre, la foto ampliable, el acceso al video, las instrucciones y la lámina del MINEDU. Continúa disponible el acceso a la práctica dirigida. El catálogo conserva 35 fichas, favoritos, búsqueda y filtros. |
| Aprender | Los pasos de observación y práctica reutilizan las fotos y videos de Uno a Cinco, Sí, Nada, Mucho, Solo y Con, también cuando aparecen en el repaso. Las preguntas visuales conservan los cinco diagramas sin nombre de respuesta. |
| Cámara y centro de práctica | El panel de la seña seleccionada muestra su foto y permite cargar el video antes de activar la cámara. Los controles de multimedia y de cámara siguen siendo independientes. |
| Situaciones | El visor aparece en la práctica que sigue a una respuesta cuando la seña tiene material. Mantiene el contexto y la retroalimentación del recorrido. |
| Minijuegos | Desafío de señas reutiliza el visor de práctica. Memoria, Adivina la seña y Reto contrarreloj conservan sus diagramas y sus reglas de respuesta. |

## Visor y servicio local

La foto se presenta en un recuadro del tema activo con la proporción vertical completa. **Ampliar imagen** abre un diálogo que se cierra con Escape y devuelve el foco. El video se muestra en un recuadro horizontal y usa la foto como póster. El reproductor nativo ofrece reproducción, pausa, barra de progreso, repetición y velocidades **0,5×, 0,75× y 1×**. Se monta al pulsar **Cargar video**, con `preload="metadata"` y `playsInline`. Si falla, ofrece reintentar y remite a la referencia educativa.

`src/data/library.ts` relaciona cada ID con las rutas locales, la autoría, el texto alternativo y el estado de revisión. Las fichas con fuente oficial y sin archivos propios conservan la presentación existente. El servidor local reconoce JPEG y MP4, y sirve tramos del video para avanzar por la barra de progreso. El ZIP de exposición que ya existía se conserva como una copia aparte.

## Verificación

TypeScript, ESLint y `npm.cmd run build` finalizaron correctamente. Pasaron **243 pruebas automatizadas** (224 de la aplicación, 6 del lector web y 13 del pipeline Python con sus datos de prueba). El build contiene **51 archivos**, incluidos los 20 recursos audiovisuales con los mismos hashes que sus copias en `public/`. El servidor local respondió HTTP 200 con los tipos `image/jpeg` y `video/mp4` en las 20 rutas y devolvió HTTP 206 al solicitar un tramo de cada MP4.

En Chromium se decodificaron las diez fotos y se reprodujeron **Uno, Dos, Tres, Cuatro, Cinco, Sí, Nada, Mucho, Solo y Con**. Los cinco primeros se probaron en escritorio y los otros cinco en una ventana emulada de 390 px. Se comprobó avance, pausa, búsqueda de un tramo cerca del final y, en ambos tamaños, repetición y los tres ajustes de velocidad. Abrir Biblioteca mantuvo los videos sin solicitudes. La ampliación preservó la relación 3:4 de la foto en tema oscuro y devolvió el foco al cerrar. La demostración de Cámara pudo cargarse antes de solicitar el dispositivo y la consulta de una imagen conservó el Worker activo. Las referencias externas quedaron disponibles como enlaces de consulta.

| Recorrido Chromium | Resultado observado |
| --- | --- |
| Multimedia en desarrollo y producción | Las diez fotos y los diez videos cargaron desde el servidor local. El recorrido de desarrollo comprobó también un archivo ausente deliberado, su mensaje y el reintento. |
| Biblioteca | 35 fichas, filtros combinados, favoritos, apertura directa, tema oscuro móvil y retorno a la lección. |
| Currículo | Las 12 lecciones se completaron con 960 XP en un perfil de prueba. El puntaje de la evaluación integradora se conservó al recargar. |
| Cámara | Modelo V1 local, práctica dirigida con una toma histórica de Con, rechazo, manejo de permisos y liberación de cámara y Worker. |
| Situaciones | Seis situaciones accesibles. Se comprobó la ficha de Uno en la práctica, el retorno desde Biblioteca y los 40 XP registrados una vez. |
| Minijuegos | Los cinco juegos conservaron sus reglas. Desafío de señas mostró la foto y el acceso al video. Los recorridos registraron 100 XP y verificaron la liberación de cámara y temporizadores. |
| Auditoría funcional y visual | Se completaron las 15 interacciones de Situaciones sin cámara y se conservaron sus 240 XP. La matriz de 168 combinaciones de pantalla y tema terminó sin desbordamientos ni errores detectados, con 1 963 solicitudes locales y cero solicitudes externas. |

Los hashes de los veinte originales adjuntos, los datasets de 355 y 505 tomas, el modelo V1 y el ZIP anterior de feria coincidieron antes y después de la integración. Se conservó el código de reconocimiento, Dataset Studio, V2, XP y progreso. El dispositivo de prueba de Chromium y la emulación de ancho permiten probar la interfaz. La revisión lingüística externa y la reproducción en teléfonos físicos siguen pendientes.
