# Ampliación multimedia educativa de SeñaVerse

Integración local del 25 de noviembre de 2026 en `desarrollo/multimedia-educativa`, a partir de `99d10cd`. Biblioteca pasa de 35 a **36 fichas educativas**. **35** tienen fotografía y video local. Las diez fichas con reconocimiento experimental siguen usando V1.

La solicitud de integración venía en el texto adjunto. Dentro del ZIP, `inventario.csv` aporta el mapeo, los estados y los SHA-256 de origen. El apéndice de `LEEME.txt` confirma la actualización de etiquetas para Ayuda, No, Adiós y Gracias. La identificación en el inventario y la confirmación del usuario se registran como estados distintos. La revisión lingüística especializada queda pendiente para el material incorporado.

## Inventario e integridad

| Recurso | Recibido | Incorporado al build local |
| --- | ---: | ---: |
| Fotos originales | 25 JPEG | 25 JPEG optimizados |
| Miniaturas | 0 | 25 WebP derivados de las fotografías |
| Videos principales | 25 MP4 | 25 MP4 optimizados |
| Videos alternativos | 4 MP4 | 0 |
| Archivos de control | `inventario.csv` y `LEEME.txt` | Inventario resumido en este informe |

Se verificaron el CRC del ZIP y los 54 SHA-256 del inventario. Se cotejó cada foto con cuatro fotogramas de su video y se conservaron los originales en el ZIP de origen. La selección respeta las etiquetas recibidas. Los encuadres permiten ver la postura y las fases relevantes. En los gestos compuestos, la foto muestra un instante y el video aporta el recorrido. La foto de Agua coincide visualmente con el clip suministrado y ambos se registraron bajo la misma ficha.

| Alternativa en el ZIP | Evaluación y decisión |
| --- | --- |
| `Tomas_alternativas/Saludos_y_expresiones/hola-toma-02.mp4` | El encuadre muestra la mano a la altura de la frente. La principal coincide con la foto y permite observar su salida del saludo. Se guarda la alternativa en el ZIP. |
| `Tomas_alternativas/Numeros/cero-toma-02.mp4` | Mantiene visible la forma redonda durante un intervalo más largo. La principal recorre entrada, pausa y retorno al reposo con claridad. Se guarda la alternativa en el ZIP. |
| `Tomas_alternativas/Numeros/cero-toma-03.mp4` | Encuadre frontal y postura visible con una pausa más corta. Se conserva como alternativa de consulta. |
| `Tomas_alternativas/Numeros/posible-cero-toma-04.mp4` | La postura central se ve más aplanada. Se conserva en el ZIP con la identificación por confirmar. |

## Correspondencia de archivos y fichas

La columna del ZIP identifica el nombre base del par `.jpeg` / `.mp4` dentro del archivo recibido. La columna local usa el nombre base dentro de `public/media/signs/`; sus tres derivados son `.jpeg`, `-mini.webp` y `.mp4`. El sufijo numérico del archivo organiza los recursos y la columna **Ficha** corresponde al ID educativo. El reconocimiento se decide por el catálogo de V1. Los diez archivos JPEG y los diez MP4 anteriores siguen en sus rutas originales.

| Ficha | Base en el ZIP | Base local | Referencia |
| --- | --- | --- | --- |
| `cero` | `Numeros/cero` | `lsp-011-cero` | MINEDU p. 73 |
| `seis` | `Numeros/seis` | `lsp-012-seis` | MINEDU p. 73 |
| `siete` | `Numeros/siete` | `lsp-013-siete` | MINEDU p. 73 |
| `ocho` | `Numeros/ocho` | `lsp-014-ocho` | MINEDU p. 73 |
| `nueve` | `Numeros/nueve` | `lsp-015-nueve` | MINEDU p. 73 |
| `diez` | `Numeros/diez` | `lsp-016-diez` | MINEDU p. 74 |
| `hola` | `Saludos_y_expresiones/hola` | `lsp-017-hola` | Mención en MINEDU p. 46 |
| `gracias` | `Saludos_y_expresiones/gracias` | `lsp-018-gracias` | Mención en MINEDU p. 46 |
| `adios` | `Saludos_y_expresiones/adios` | `lsp-019-adios` | PUCP, «Chau», referencia relacionada |
| `no` | `Comunicacion_cotidiana/no` | `lsp-020-no` | PUCP, entrada «No» |
| `agua` | `Alimentos_y_bebidas/agua` | `lsp-021-agua` | MINEDU p. 129 |
| `comida` | Pendiente | Reserva 022 | Ficha educativa previa |
| `ayuda` | `Comunicacion_cotidiana/ayuda` | `lsp-023-ayuda` | MINEDU p. 156, «Ayudar», referencia relacionada |
| `buenos-dias` | `Saludos_y_expresiones/buenos-dias` | `lsp-024-buenos-dias` | MINEDU p. 46 |
| `buenas-noches` | `Saludos_y_expresiones/buenas-noches` | `lsp-025-buenas-noches` | MINEDU p. 46 |
| `disculpa` | `Saludos_y_expresiones/disculpa` | `lsp-026-disculpa` | MINEDU p. 47, «Disculpar – disculpa» |
| `familia` | `Familia/familia` | `lsp-027-familia` | MINEDU p. 79 |
| `mama` | `Familia/mama` | `lsp-028-mama` | MINEDU p. 79 |
| `papa` | `Familia/papa` | `lsp-029-papa` | MINEDU p. 79 |
| `hermano` | `Familia/hermano` | `lsp-030-hermano` | MINEDU p. 80 |
| `casa` | `Entorno/casa` | `lsp-031-casa` | MINEDU p. 254 |
| `colegio` | `Entorno/colegio` | `lsp-032-colegio` | MINEDU p. 285 |
| `feliz` | `Emociones/feliz` | `lsp-033-feliz` | MINEDU p. 187 |
| `triste` | `Emociones/triste` | `lsp-034-triste` | MINEDU p. 194 |
| `sorpresa` | `Emociones/sorpresa` | `lsp-035-sorpresa` | MINEDU p. 193, «Sorprendido», referencia relacionada |
| `carne` | `Alimentos_y_bebidas/carne` | `lsp-036-carne` | MINEDU p. 107 |

Las láminas se enlazan en la fuente oficial. El cotejo de las páginas 107, 156 y 193 confirmó las entradas impresas «Carne», «Ayudar» y «Sorprendido». Queda pendiente localizar una lámina individual inequívoca de Hola y Gracias en la guía y una página individual de No y Adiós. El enlace «Chau» se ofrece como referencia de despedida con la correspondencia de variantes pendiente. [Guía del MINEDU, 2015](https://repositorio.minedu.gob.pe/handle/20.500.12799/5545) · [Diccionario LSP al Español de la PUCP](https://diccionariolsp.pucp.edu.pe/search-by-text).

## Derivados y cobertura

Las fotografías se redimensionaron a 1280 × 720 y las miniaturas a 512 × 288, ambas con encuadre completo y `object-fit: contain`. Los MP4 de 848 × 478 conservan los fotogramas y su duración. La conversión a H.264 con `faststart` elimina el canal de audio de las copias educativas para conservar el foco en el gesto y evitar posibles pistas habladas durante las preguntas. Los videos originales preservan ese canal. La decodificación de los 25 principales confirmó el mismo número de cuadros y la misma marca temporal final del video. La operación mantuvo lateralidad, ritmo y expresión. El conjunto incorporado ocupa 21 225 061 bytes, incluidos los WebP, frente a 35 738 258 bytes de los 25 pares principales tal como se recibieron.

Algunas tomas ya tenían flechas o marcas de movimiento en el archivo recibido. Se conservaron. Para las preguntas, los títulos y etiquetas accesibles se construyen a partir de una descripción del gesto. El nombre de archivo no se muestra como texto ni como etiqueta del reproductor.

| Cobertura | Antes | Después |
| --- | ---: | ---: |
| Fichas educativas | 35 | 36 |
| Fichas con foto local | 10 | 35 |
| Fichas con video local | 10 | 35 |
| Fichas con referencia documental | 24 | 35 |
| Clases habilitadas por V1 | 10 | 10 |

### Biblioteca y Centro de práctica

Biblioteca usa miniaturas en la cuadrícula y foto ampliable en la ficha. Los indicadores separan el aprendizaje visual, el video y la cámara. El visor compartido presenta la explicación, referencias, estado de identificación y revisión lingüística, favoritos y enlaces a las lecciones. El buscador y los filtros mantienen los IDs guardados. El reproductor crea el elemento de video solo al solicitarlo y libera su fuente al desmontarse. La consulta directa de una ficha como `/camara/libre?sena=agua` muestra su material visual sin abrir el detector. Las prácticas con cámara siguen reservadas a Uno, Dos, Tres, Cuatro, Cinco, Sí, Nada, Mucho, Solo y Con.

### Aprender

Se recorrieron las seis unidades y sus doce lecciones. Introducción y Comunicación visual conservan la lectura y el orden de preparación. Números básicos, Solo y Con y Expresiones cotidianas reutilizan el visor bajo demanda. Expresiones cotidianas añade No como contraste visual. Cero y Del seis al diez incorporan identificación con imágenes y movimiento. Saludos básicos compara los dos saludos de la guía en video y presenta Hola y Adiós. Cortesía muestra Disculpa y Gracias. Familia y personas añade Hermano y combina fotos y clip en la evaluación. Comunidad y lugares contrasta la foto de Casa con la trayectoria de Colegio. Evaluación integradora suma demostraciones de Ayuda y Agua para repasar. Se preservaron los IDs de las preguntas, las claves de respuesta, el progreso y las recompensas. Las evaluaciones muestran descripciones del gesto, opciones neutrales cuando se elige una demostración, y las explicaciones y enlaces al corregir.

### Situaciones

Las seis situaciones conservan sus quince interacciones. Tienda usa las nuevas demostraciones de Hola, Agua y Gracias en las prácticas visuales. No y Adiós aparecen como alternativas ya existentes y Ayuda se usa como contraste en el contexto del producto. Preguntas enfrenta Sí y No y muestra Cero frente a Uno. Las alternativas contextuales presentan fotos cuando todas cuentan con ellas. El paso de demostración evita favorecer opciones por la ausencia de una foto. Pidiendo comida, Organizando una actividad, Comprando útiles y Eligiendo una cantidad conservan el orden de resolución y reutilizan las fotografías o el reproductor bajo demanda. La validación contextual y la gestual conservan sus condiciones y los límites del reconocimiento en señas dinámicas.

### Minijuegos

La configuración **Uno a Cinco** conserva el vocabulario y los récords anteriores. El vocabulario ampliado tiene su propio récord por nivel y modalidad. El primer premio de XP sigue siendo por juego.

| Juego | Incorporación visual |
| --- | --- |
| Memoria de señas | Empareja fotografías de Cero a Diez con palabras y cantidades mediante el volteo original. |
| Adivina la seña | Presenta fotos de las 35 fichas con medios y clips bajo demanda. Prioriza distractores de la misma categoría y da la explicación al responder. |
| Relaciona y aprende | Asocia fotografías de Cero a Diez con cantidades, incluidas las diez unidades y el cero, con las conexiones SVG existentes. |
| Desafío de señas | Añade las fotografías a las secuencias visuales y limita el abanico de opciones a cinco por partida. La secuencia con cámara conserva sus clases. |
| Reto contrarreloj | Añade fotografías de Cero a Diez a la variante visual y conserva la cuenta regresiva, el cronómetro, los combos y las puntuaciones. |

### Alcance y pendientes

Comida conserva su ID y estado pendiente de material propio. Carne tiene una ficha adicional para su significado específico. Una revisión de LSP deberá confirmar las variantes, su expresión y las correspondencias con las glosas antes de tratarlas como validadas. La entrega es local, sin publicación de los videos ni de las capturas de evidencia. El consentimiento para cualquier publicación debe corresponder al alcance de esa distribución.

Se conservaron las cinco tandas de Motion, las 21 ilustraciones originales, la cámara, los recursos históricos, Dataset Studio, los datos archivados y el pipeline V2. El ZIP RC1 original permanece en `dist-feria/` con SHA-256 `96d11dfc137e69c055df489e2e6c16f55561359e198919682c42370cce5569e0`. La integración local todavía no tiene commit ni push.

La insignia **Explorador de señas** conserva las 24 fichas que ya contaban como evidencia y el umbral de diez. Las fichas nuevas aparecen en el historial de consultas sin alterar retroactivamente la fecha de obtención de esa insignia.

## Rendimiento y accesibilidad

Comparación local en Chromium 158, en el mismo equipo. Biblioteca se recorrió tres veces por versión a 1440 px. El ensayo de cámara usó el objetivo Uno y el Worker real con una cámara virtual sin manos. La medición de latencia abarca el envío del fotograma al Worker y la recepción de su respuesta. Se midieron ocho segundos en régimen. La memoria corresponde al heap JS de Chromium en ese instante.

| Medición | Antes | Después |
| --- | ---: | ---: |
| Build completo | 51,8 MiB | 72,1 MiB |
| Archivos del build | 76 | 151 |
| JavaScript sin comprimir en `assets` | 755,2 KiB | 764,8 KiB |
| Llegada a Biblioteca con fotos decodificadas, mediana | 237 ms | 226 ms |
| Primera página de Biblioteca, recursos de foto | 1 / 180 KiB | 6 / 269 KiB |
| Primera página, solicitudes de video | 0 | 0 |
| Desplazamiento de diseño acumulado observado, máximo | 0,0025 | 0,0263 |
| Heap de Biblioteca tras la primera carga | 4,05 MiB | 4,15 MiB |
| Heap con cámara activa | 12,64 MiB | 12,85 MiB |
| Respuestas del Worker en régimen | 160 | 160 |
| Latencia en régimen, mediana / máxima | 15,7 / 30,9 ms | 7,9 / 29,0 ms |
| Respuestas que superaron 120 ms en régimen | 0 | 0 |

Al inicio se descartó una respuesta tardía en cada versión. El ensayo se ejecutó en serie y el inicio dependió del estado de caché. El recorrido comprobó la liberación del Worker y del video al salir de sus vistas. La decodificación, el fotograma de inicio y los controles de velocidad y pausa se comprobaron en Chromium. Faltan mediciones con webcam física y en motores distintos de Chromium.

Con DNS externo bloqueado, la navegación, las imágenes, los clips y la cámara funcionaron con recursos locales. Los recorridos multimedia y la comparación no observaron solicitudes externas nuevas. Se mantiene la limitación del intento de telemetría documentado en la RC1, cuyo flujo se conserva. Las referencias web requieren conexión al abrirlas. [Aviso de privacidad de MediaPipe Tasks Vision](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md#privacy-notice).

## Pruebas y capturas

- Build, TypeScript y ESLint. Los binarios del Worker y MediaPipe coincidieron por SHA-256 entre builds. También se verificaron el modelo V1, los diez JPEG y diez MP4 originales y las 21 ilustraciones de contexto.
- Aprobaron 251 pruebas de aplicación, 6 del motor web y 17 de Python. Cubren persistencia, recompensas, insignias, configuraciones de récord y compatibilidad de cámara. Las pruebas de navegador se ejecutaron con perfiles aislados y cámara virtual en los ensayos con detector.
- El recorrido multimedia en Chromium abrió las 36 fichas, decodificó 35 fotografías, reprodujo los 35 MP4 y comprobó que el reproductor espera una acción. Recorrió las doce lecciones, las seis situaciones con quince interacciones, y las cinco variantes visuales ampliadas. También verificó el foco al cerrar el visor, navegación por teclado, favoritos, escritorio y móvil de 390 px, temas claro y oscuro y movimiento reducido.
- Las pruebas específicas de Biblioteca, currículo, la lección de Números básicos, Situaciones y Mi progreso comprobaron la persistencia, la reanudación y las recompensas. En el repaso de una evaluación, pueden reproducirse los videos con las respuestas bloqueadas. Algunos recorridos complementarios de reproducción de trazas y medios agotaron el tiempo de DevTools en esta máquina. La comprobación de los clips y las variantes visuales figura en el recorrido de Chromium de la tabla.

Las capturas conservan los recursos educativos visibles y están fuera del repositorio, en `C:/Users/user/Documents/GitHub/senaverse-media-evidencia`. [Descargar las capturas](../../senaverse-media-evidencia/capturas-ampliacion-multimedia.zip).

| Pantalla | Capturas |
| --- | --- |
| Biblioteca | [Escritorio](../../senaverse-media-evidencia/01-biblioteca-escritorio.png), [video de Agua](../../senaverse-media-evidencia/02-biblioteca-video-agua.png), [ficha Carne](../../senaverse-media-evidencia/03-ficha-carne.png), [móvil oscuro](../../senaverse-media-evidencia/04-biblioteca-oscuro-movil.png) |
| Aprender | [Cero](../../senaverse-media-evidencia/aprender-cero.png), [Números básicos](../../senaverse-media-evidencia/aprender-numeros.png), [del seis al diez](../../senaverse-media-evidencia/aprender-seis-a-diez.png), [evaluación con video](../../senaverse-media-evidencia/aprender-evaluacion-diez.png), [saludos](../../senaverse-media-evidencia/aprender-saludos.png), [cortesía](../../senaverse-media-evidencia/aprender-cortesia.png), [expresiones](../../senaverse-media-evidencia/aprender-expresiones.png), [Solo y Con](../../senaverse-media-evidencia/aprender-elecciones-y-compania.png), [familia](../../senaverse-media-evidencia/aprender-familia.png), [comunidad](../../senaverse-media-evidencia/aprender-comunidad.png), [evaluación integradora](../../senaverse-media-evidencia/aprender-repaso-cotidiano.png), [repaso móvil oscuro](../../senaverse-media-evidencia/aprender-repaso-movil-oscuro.png) |
| Situaciones | [Saludo en tienda](../../senaverse-media-evidencia/situacion-tienda-llegada.png), [práctica de Agua](../../senaverse-media-evidencia/situacion-tienda-ejercicio-agua.png), [agradecimiento](../../senaverse-media-evidencia/situacion-tienda-fin-de-compra.png), [confirmación](../../senaverse-media-evidencia/situacion-preguntas-confirmacion.png), [préstamos](../../senaverse-media-evidencia/situacion-preguntas-prestamos.png), [comedor](../../senaverse-media-evidencia/situacion-comida.png), [actividad](../../senaverse-media-evidencia/situacion-actividad.png), [útiles](../../senaverse-media-evidencia/situacion-utiles.png), [cantidades](../../senaverse-media-evidencia/situacion-cantidad.png) |
| Minijuegos | [Memoria](../../senaverse-media-evidencia/minijuego-memoria.png), [Adivina](../../senaverse-media-evidencia/minijuego-adivina.png), [Relaciona](../../senaverse-media-evidencia/minijuego-relaciona.png), [Relaciona en móvil](../../senaverse-media-evidencia/minijuego-relaciona-movil.png), [Desafío de señas](../../senaverse-media-evidencia/minijuego-senas.png), [Contrarreloj](../../senaverse-media-evidencia/minijuego-desafio.png) |
| Cámara | [Consulta visual de Agua](../../senaverse-media-evidencia/camara-consulta-visual-agua.png), [práctica V1 de Uno](../../senaverse-media-evidencia/camara-v1-uno.png) |
| Datos de verificación | [Recorrido de Chromium](../../senaverse-media-evidencia/browser.json), [variantes visuales y ajuste móvil](../../senaverse-media-evidencia/browser-layouts.json), [medición antes y después](../../senaverse-media-evidencia/rendimiento.json) |
