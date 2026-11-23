# Hito 6.3 · Auditoría para la feria

## Resumen ejecutivo

SeñaVerse es **apta para una demostración educativa local** de los recorridos verificados. La demostración en vivo del reconocimiento queda condicionada a probar la webcam, la iluminación y los permisos en el equipo de exposición. Aprender y Situaciones pueden recorrerse por completo con los ejercicios sin cámara.

La auditoría corrigió dos problemas de estado que podían afectar lo que el estudiante registra y un problema visual que invadía las instrucciones de algunas fichas. Las pruebas comparan la implementación con el estado de partida `dc159ce`. El currículum conserva 12 lecciones funcionales, 57 actividades, 15 interacciones en Situaciones, cinco minijuegos y 1 300 XP disponibles por primeras finalizaciones. El modelo V1 y el dataset histórico se verificaron por contenido.

## Estado inicial e inventario

Se revisaron los informes de [Cámara](hito-5-1-camara.md), [Aprender](hito-5-2-aprender.md), [Biblioteca](hito-5-3-biblioteca.md), [Situaciones](hito-5-4-situaciones.md), [Minijuegos](hito-5-5-minijuegos.md), [progreso](hito-5-6-progreso.md), [currículo](hito-6-1-curriculo.md), [multimedia](hito-6-2-recursos-multimedia.md) y [diagnóstico de V1](recognition-lab-hito-4-3.md). El punto de partida registraba 238 pruebas automatizadas superadas.

| Área | Arquitectura y alcance |
| --- | --- |
| Inicio y Presentación | `/` consulta registros reales y muestra reanudación, recomendaciones, XP, racha, historial y logros. `/panel` redirige a Inicio. `/presentacion` es una presentación pública con accesos a la academia y al panel. |
| Aprender | `/academia` resuelve seis unidades, 12 planes y siete lecturas preliminares. Los pasos, las correcciones, las evaluaciones y las repeticiones de evaluación se registran en el progreso por ID. Los 12 planes funcionales pueden aportar 960 XP. |
| Biblioteca | `/biblioteca` y `?sena=` usan un catálogo de 35 fichas, 24 con láminas documentadas y cinco diagramas locales. Hay búsqueda normalizada, filtros, favoritos y retorno validado al paso de origen. |
| Cámara | `/camara` y `/camara/libre` permiten selección, modo libre y dirigido, activación manual, landmarks opcionales y referencias. `/camara/desafio` dirige al minijuego correspondiente. El Worker de MediaPipe detecta las manos y la V1 clasifica resultados frescos con confirmación temporal. |
| Situaciones | `/simulador`, rutas de escena y resumen. Seis situaciones visibles, 15 interacciones y 240 XP. Tres rutas antiguas conservan sus respuestas históricas. La comprensión del contexto y las prácticas se registran por separado. |
| Minijuegos | `/minijuegos` y cinco rutas de partida. Hay puntuación, dificultad, récords y 100 XP por primeras partidas válidas con aciertos. El Reto contrarreloj permite jugar sin límite y Desafío conserva un punto de reanudación. |
| Mi progreso y Mi perfil | `/progreso` y `/perfil` consultan los mismos registros. El progreso y el perfil se guardan por separado en `localStorage`. Las fotos locales se guardan en IndexedDB. Se conservan los créditos históricos, sus migraciones y la exportación de respaldo. |
| Audiovisuales | Las dos fuentes oficiales se consultan mediante enlaces por página. El visor comparte los cinco diagramas y admite video, ampliación y secuencias. El catálogo sigue con cero videos demostrativos y las fichas pendientes mantienen su estado. |
| Herramientas internas | Dataset Studio y Laboratorio se cargan en desarrollo con sus indicadores explícitos. Vite separa esas rutas y bloquea archivos privados. El build distribuye solo el modelo educativo y los recursos necesarios de MediaPipe. |
| Dependencias | React, React DOM, React Router, Lucide y MediaPipe en ejecución. TypeScript, Vite, ESLint y los adaptadores de prueba se usan en desarrollo. El árbol instalado deduplica React y React DOM. |

La auditoría de contenido comprobó opciones únicas, respuestas válidas, IDs estables, explicación después de enviar, alternativas sin cámara y enlaces a Biblioteca. En Situaciones, practicar la seña seleccionada tras una respuesta contextual incorrecta es una decisión del Hito 5.4. El resumen conserva el error contextual y la práctica como datos distintos. En los juegos visuales se usan posturas sin rótulo y las alternativas aparecen en controles separados.

## Hallazgos, evidencia y correcciones

| ID | Hallazgo y evidencia | Resultado |
| --- | --- | --- |
| P0 | La revisión de los recorridos y de la distribución de producción no encontró fallos críticos reproducibles. | Sin correcciones P0. |
| P1-01 | En la práctica dirigida, `confirmedMatch` quedaba latente después de desactivar la cámara o confirmar otra seña. El botón de guardado dependía de ese valor anterior. | El guardado requiere una sesión activa. Se limpia la coincidencia al detener la cámara, recargar el detector o confirmar una seña diferente. Se conservan los umbrales y el comportamiento del clasificador. |
| P1-02 | El proveedor de progreso escribía su estado inicial y los cambios con un efecto que partía de la copia de una sola pestaña. Una consulta posterior desde una vista desactualizada podía reemplazar un avance guardado por otro documento. Los fallos de almacenamiento se silenciaban. | Las escrituras consultan primero el registro actual y las vistas se sincronizan cuando llega un evento de almacenamiento. Si una escritura falla, la sesión conserva el progreso en memoria y muestra un aviso. La prueba usa otro documento del mismo origen y un fallo de cuota controlado. |
| P2-01 | El lienzo de Uno superaba la altura asignada a la miniatura. La captura inicial de Biblioteca a 360 × 800 muestra el dibujo sobre el botón y las instrucciones. También se aprecia en Cámara a 1920 × 1080. | Se limita el tamaño del lienzo a su contenedor sin alterar el dibujo. La nueva matriz mide el desbordamiento vertical además del horizontal. |
| P2-02 | En tema oscuro, las portadas pastel de Minijuegos heredaban un trazo claro y perdían contraste. | Se usa el violeta oscuro de la paleta sobre el fondo pastel en ambos temas. Se conserva el mismo icono. |
| P2-03 | Abrir una lámina con el navegador desconectado llevaba a un error externo sin un aviso previo en la ficha. | El enlace identifica que la fuente es externa y avisa cuando el navegador detecta desconexión. El recurso local permanece accesible. |
| P2-04 | La presentación empleaba un icono de reproducción para una sección ilustrativa sin video disponible. El menú hablaba de videos como parte del recorrido. | La presentación describe los diagramas disponibles y el menú menciona la práctica que ya funciona. |
| P3-01 | Las limitaciones de V1 con lateralidad, Nada, el giro de Solo y gestos desconocidos proceden del modelo y de su historial de capturas. | Pendientes de comprobación física, revisión y futura validación del modelo. |
| P3-02 | Hay 24 referencias externas y ningún video LSP autorizado integrado. No se mide automáticamente si un servidor externo concreto está caído cuando el navegador sigue en línea. | Conservar material local para la feria. Mantener las prioridades de grabación y autorización del [Hito 6.2](hito-6-2-recursos-multimedia.md). |
| P3-03 | Solo Desafío reanuda partidas activas. Las demás partidas guardan los resultados al finalizar. La sincronización local corrige las vistas con copias desactualizadas, con una ventana de carrera residual si dos documentos escriben exactamente a la vez. | Documentar este límite y usar una pestaña durante la feria. Las pruebas de reanudación cubren Aprender, Situaciones y Desafío. |
| P3-04 | `ComingSoonPage` y algunos auxiliares antiguos de navegación carecen de consumidores en las rutas actuales. | Limpieza posterior. Las rutas antiguas efectivamente usadas siguen redirigiendo a sus destinos válidos. |
| P3-05 | La auditoría del árbol de desarrollo reportó nueve avisos moderados asociados a `minimatch` en ESLint y TypeScript ESLint. La auditoría de producción reportó cero. La simulación de npm propone 16 actualizaciones, un paquete transitivo adicional y un salto mayor de `minimatch`. | Programar una actualización de herramientas separada de la versión de feria y repetir la auditoría. [Aviso oficial de GitHub](https://github.com/advisories/GHSA-g3hv-75wg-m249) |

## Revisión visual y accesibilidad

La matriz de Chromium inspeccionó 14 pantallas y estados en seis resoluciones y dos temas. Se revisaron Inicio, Aprender, unidad, lección, Biblioteca, ficha, Cámara, Situaciones, escena, Minijuegos, preparación de partida, Mi progreso, Mi perfil y Presentación. Además se capturaron el visor aumentado, el tablero en juego, una actividad y el menú móvil. La medida de desbordamiento compara los límites de los controles y del lienzo con su contenedor. Los **168 casos finales** terminaron sin desbordamientos detectados y sin errores de consola registrados. Se tomaron 30 capturas finales y se conservaron las muestras de la tabla.

| Resolución | Revisión |
| --- | --- |
| 360 × 800 | Teléfono estrecho, navegación inferior, tarjetas, ficha y cámara. |
| 390 × 844 | Teléfono, ampliación, menú, tablero y actividad. |
| 768 × 1024 | Tableta vertical con ambos temas. |
| 1024 × 768 | Escritorio estrecho con navegación lateral. |
| 1366 × 768 | Recorrido principal de escritorio y capturas en tema claro. |
| 1920 × 1080 | Recorrido principal de escritorio y capturas en tema oscuro. |

| Evidencia visual | Contenido |
| --- | --- |
| [Antes de la corrección](evidencia-hito-6-3/antes-movil-oscuro.jpg) | Biblioteca a 360 px con el diagrama sobre el botón y las instrucciones. |
| [Escritorio a 1366 × 768](evidencia-hito-6-3/escritorio-claro.jpg) | Ocho módulos en claro. |
| [Escritorio a 1920 × 1080](evidencia-hito-6-3/escritorio-oscuro.jpg) | Ocho módulos en oscuro. |
| [Móvil a 360 × 800](evidencia-hito-6-3/movil-oscuro.jpg) | Inicio, ficha corregida, cámara, progreso y perfil. |
| [Interacciones a 390 × 844](evidencia-hito-6-3/interacciones-390.jpg) | Menú, tablero, estudio y diálogo de ampliación. |

Se comprobó con teclado el enlace de salto, la navegación y el cierre con Escape, así como la devolución del foco en Biblioteca y el visor. Las opciones muestran texto junto a la retroalimentación por color. Las posturas propias tienen descripción y los controles del visor y de la cámara están etiquetados. El texto secundario representativo sobre tarjeta obtiene 7,99:1 en claro y 7,94:1 en oscuro. El indicador de foco sobre esas tarjetas obtiene 4,54:1 y 9,75:1, respectivamente. El trazo de portadas sobre fondos pastel pasó de 1,93–2,07:1 a 5,93–6,35:1 en muestras de la paleta. La evaluación se limita a estas comprobaciones y las interacciones indicadas.

## Seguridad, privacidad y acceso externo

- El modelo de producción coincide byte por byte con el modelo público y conserva sus diez clases. El SHA-256 del dataset de 355 grabaciones coincide con su manifiesto histórico. Los directorios privados y las fuentes del reconocedor no presentan cambios respecto de `dc159ce`.
- Dataset Studio y Laboratorio conservan su acceso condicionado en desarrollo. Se comprobó la distribución con y sin indicadores de desarrollo mediante las pruebas de acceso. Las rutas de herramientas desaparecen de producción, y el archivo de modelo interno y la exportación privada no se sirven. Vite excluye archivos `.env`, claves, repositorio y carpetas de entrenamiento. La inspección de las rutas del build contó cero archivos privados coincidentes.
- Chromium bloqueó destinos externos y registró las solicitudes de la aplicación. Los diagramas, fuentes tipográficas, MediaPipe, WASM y el modelo se cargaron desde el servidor local según la ruta. La cámara solo se abrió tras una acción. Las pruebas de navegación y detención observaron que las pistas y Workers se liberaron. En la reproducción histórica, los datos de la toma se inyectaron en la sesión de pruebas por el protocolo local de Chromium.
- Se verificó en los servidores del MINEDU la firma PDF de la guía (HTTP 200) y de la cartilla (HTTP 206). La consulta de las láminas requiere conexión externa. La prueba de desconexión mostró el aviso y conservó el diagrama local. [Guía del MINEDU](https://repositorio.minedu.gob.pe/handle/20.500.12799/5545), [figura 2 de la cartilla](https://formacionenservicio.minedu.gob.pe/sifods/centro-recurso/2022/Lineas-de-formacion-priorizadas/Mejora-de-Aprendizajes/Atencion-a-la-diversidad/Cartilla/orientaciones-discapacidad-auditiva.pdf#page=14)

## Rendimiento

Mediciones en Windows, Intel Core i7-12700F, 31,8 GiB de RAM, Node 26.13.1 y Chromium 157. Chromium se ejecutó en modo sin ventana contra Vite Preview por loopback. Los tiempos de preparación incluyen la espera de la prueba y reflejan esta máquina. El equipo de feria sigue pendiente de medición.

El build ocupa 39 158 771 bytes en 31 archivos. Las variantes WASM representan 29 331 454 bytes. JavaScript suma 1 401 996 bytes en disco y el archivo JavaScript de entrada comprimido con gzip ocupa 132 049 bytes. El CSS de entrada comprimido ocupa 32 160 bytes. Las páginas del estudiante cargan sin inicializar MediaPipe. La descarga de sus binarios y la activación del Worker comienzan al pedir la cámara. Se conservan las variantes WASM de compatibilidad.

| Carga con caché desactivada, tres aperturas por ruta | Mediana hasta la vista lista | Rango observado | Transferencia por apertura |
| --- | ---: | ---: | ---: |
| Inicio | 133 ms | 120–145 ms | 539 568–547 583 B |
| Aprender | 152 ms | 124–539 ms | 539 568 B |
| Práctica libre, cámara apagada | 459 ms | 380–466 ms | 558 283–578 920 B |

La matriz registró 1 906 solicitudes, todas locales, y cero solicitudes de WASM, del detector o de su Worker con la cámara inactiva. En `student-production`, activar el dispositivo de prueba tomó 2 115 ms hasta el primer resultado del Worker. El montón JavaScript de la página fue de 4,15 MB antes, 4,51 MB durante la cámara y 6,29 MB tras navegar a Aprender. Son instantáneas sin recolección forzada en pantallas distintas. Las pistas terminaron y el Worker se cerró en la prueba.

| Medición de reproducción local de las capturas históricas | Observaciones | Mediana | P95 |
| --- | ---: | ---: | ---: |
| Clasificación de una ventana preparada | 2 213 | 0,287 ms | 0,593 ms |
| Captura del fotograma a decisión, según las marcas de tiempo de la reproducción | 2 213 | 9,695 ms | 12,670 ms |
| Inicio de la toma a primera confirmación coincidente con su etiqueta | 175 | 1 667,736 ms | 1 703,470 ms |

La última fila solo describe tomas con confirmación coincidente en este recorrido. La reproducción incluye datos históricos y mide el efecto de recopilar una ventana temporal y confirmar. Se reporta aparte de la clasificación y de la inicialización de MediaPipe. La medición de memoria de Chromium corresponde al montón JavaScript de la página. La memoria del Worker, GPU y sistema requiere otra medición.

## Archivos modificados

| Área | Archivos |
| --- | --- |
| Progreso, navegación y avisos | `src/components/StudentProgressProvider.tsx`, `src/hooks/progressContext.ts`, `src/components/StudentLayout.tsx`, `src/pages/HomePage.tsx` |
| Cámara y recursos | `src/components/RecognitionPractice.tsx`, `src/components/ExternalReference.tsx`, `src/components/SignMediaViewer.tsx`, `src/components/SignMediaViewer.css`, `src/pages/LibraryPage.tsx` |
| Minijuegos | `src/pages/MinigameRunPage.tsx`, `src/pages/MinigamesPage.css` |
| Verificación | `scripts/recognition-lab-browser.mjs`, `scripts/fixtures/fair-audit-browser.mjs`, `scripts/fixtures/lesson-browser.mjs`, `scripts/fair-audit-metrics.mjs` |
| Entrega | Este informe y las cinco láminas de capturas de `docs/evidencia-hito-6-3/`. |

## Resultados de pruebas

Pasaron **238 pruebas automatizadas**. `npm.cmd test` superó 219, el lector web de ML 6 y el entorno de Python 13. TypeScript, ESLint y el build terminaron con salida 0. Los tests del registro compartido comprobaron los 1 300 XP del contenido funcional y la conservación de recompensas históricas. Los siguientes 11 recorridos de Chromium se completaron por separado.

| Recorrido | Resultado observado |
| --- | --- |
| `audit-production` | 168 casos de disposición y tema. Cero desbordamientos, errores de consola y solicitudes externas detectados. |
| `audit-functional` | Perfil nuevo, cinco accesos correctos en Inicio, salto con teclado, sincronización desde otro documento, aviso por escritura bloqueada y aviso de referencia externa al desconectar. Recorrido completo de las seis situaciones, 15 interacciones y 240 XP. Repetir la última situación mantuvo la recompensa original. |
| `curriculum-production` | Se completaron las 12 lecciones y sus 57 actividades y se registraron 960 XP. La evaluación integradora pasó de 5/6 a 6/6, retenida después de recargar. Se comprobó el retorno desde Biblioteca y el enlace histórico. Una captura de Con se usó en una prueba dirigida aparte. |
| `lesson-production` | Se verificó la desaparición del guardado tras apagar la cámara y tras confirmar Dos después de Uno en práctica dirigida. También se comprobó un negativo, guardado explícito, reanudación, alternativa, resultado 4/5 y liberación de recursos. |
| `student-production` | Cámara manual, recuperación de modelo ausente, permiso denegado, dispositivo ausente, dispositivo no legible u ocupado, solicitud pendiente, exclusión mutua, cero manos, landmarks, Con en modo libre y dirigido, objetivo diferente, gesto negativo y liberación. |
| `library-production` | 35 fichas, búsqueda, filtros combinados, favoritos migrados, persistencia, teclado y ficha, vuelta a la lección, destino dirigido a Cámara y modo oscuro móvil. |
| `media-production` | Cinco diagramas disponibles con conexiones externas bloqueadas, ampliación con teclado y foco restaurado, conservación del paso y continuidad de cámara durante la consulta. |
| `situation-production` | Vuelta desde Biblioteca, Cero sin cámara, reanudación, resumen separado de contexto y coincidencias, 40 XP únicos y liberación de cámara. |
| `minigames-production` | Cinco juegos completos, 100 XP, repetición sin duplicación, dificultades, opciones con reloj y sin reloj, racha, teclado, récords, cámara y temporizadores liberados. |
| `progress-production` | Perfil inicial e histórico, actividad sin fecha, racha, favoritos y avatar, continuación de lección y situación y guardado manual de coincidencia sin XP adicional. |
| `lab` en desarrollo | Modelo ausente y recuperación, selector V1/V2 con V2 pendiente, modo dirigido, arranque de MediaPipe, reinicio y limpieza al salir de la ruta. La primera lectura de FPS del panel fue 2,89 con el dispositivo de prueba y refleja el arranque de esa sesión. |

Las pruebas de cámara en navegador usaron el dispositivo de prueba de Chromium para permisos y ciclo de vida. Las pruebas de clasificación reprodujeron landmarks de tomas históricas. La prueba en el equipo de exposición requiere una webcam real.

## Reproducción de las comprobaciones

```powershell
npm.cmd exec -- tsc -b --pretty false
npm.cmd run lint
npm.cmd run build
npm.cmd test
node --test ml/tests/web.test.mjs
& .\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v

$fairChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$fairOutput = Join-Path $env:TEMP 'senaverse-auditoria'
$fairDataset = 'ml/datasets/senaverse-dataset-dataset-json.json'
node scripts/recognition-lab-browser.mjs $fairChrome audit-production $fairOutput
node scripts/recognition-lab-browser.mjs $fairChrome audit-functional
node scripts/recognition-lab-browser.mjs $fairChrome curriculum-production $fairDataset
node scripts/recognition-lab-browser.mjs $fairChrome student-production $fairDataset
node scripts/fair-audit-metrics.mjs $fairDataset
```

## Pruebas físicas y lista para la feria

- [ ] Ejecutar el build desde un servidor local con la versión de Chromium prevista. Verificar el modelo `public/models/lsp-v1.json`, `hand_landmarker.task`, los archivos `public/mediapipe/wasm`, la tipografía, el logo y los diagramas.
- [ ] Ensayar a la resolución del equipo de exposición, revisar tema claro y oscuro y comprobar las rutas principales con internet desconectado.
- [ ] Probar en el equipo real permisos, cámara ocupada, activación manual, conexión y reconexión, iluminación y distancia, y salida a otro módulo.
- [ ] Ensayar reconocimiento libre y dirigido con manos derecha e izquierda. Incluir Nada, Solo, gestos fuera del catálogo y ausencia de manos. Registrar errores observados y tiempo hasta una confirmación.
- [ ] Practicar un recorrido sin cámara y preparar los diagramas locales como apoyo. Mantener una copia autorizada de las referencias o acceso externo si se desean abrir las láminas.
- [ ] Usar una pestaña para la feria y un perfil local de demostración. Si se usa un perfil existente, exportar su respaldo antes de la presentación.
- [ ] Explicar la diferencia entre avance académico, coincidencia experimental y revisión lingüística.

El Hito 4.3 registró menor robustez de la izquierda, trayectorias históricas inconcluyentes en Nada, confirmación de un índice inmóvil para Solo y cuatro confirmaciones en siete negativos reservados. Las pruebas de este hito reutilizaron capturas y un dispositivo de prueba. La aprobación del equipo físico sigue pendiente. [Diagnóstico del Hito 4.3](recognition-lab-hito-4-3.md)

## Siguientes hitos

Completar la prueba física y preparar un guion de exposición con y sin cámara. Registrar los problemas que se reproduzcan en el equipo real. Después, priorizar la revisión lingüística y los videos autorizados según el Hito 6.2. Abrir en una fase separada la validación de datos, el rechazo de gestos fuera del catálogo, la lateralidad y el movimiento para la V2. Revisar dependencias de desarrollo y accesibilidad ampliada en una ventana de mantenimiento posterior a la feria.
