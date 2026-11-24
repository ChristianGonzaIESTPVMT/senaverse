# SeñaVerse Motion · Auditoría final

Auditoría local del 24 de noviembre de 2026. La integración corresponde a `a5adfe69abd9ef7725a0e4c4273dad8b8291fcbe`. La versión de exposición es **RC1, pendiente de validación física**.

## Integración y recuperación

| Referencia | Estado al cierre |
| --- | --- |
| `main` en `senaverse` | Incluye `a5adfe6`, commit local con las cinco tandas integradas y la resolución de los tres archivos pendientes. El informe se registra en un commit local de documentación posterior. |
| `origin/main` local | `66e7ba6`, donde ya se registraban las tandas 1–3. |
| `senaverse-motion-tanda-4` | HEAD separado en `809c3fa`. Conserva los cambios locales de las cinco tandas y la evidencia original. |
| Estado anterior | `main` tenía el árbol limpio y tres archivos versionados con marcadores de conflicto. La copia aislada tenía 38 archivos de código modificados o nuevos y 122 archivos de documentación y evidencia. |

La integración transfirió 18 archivos de código y conservó las otras 20 coincidencias de la copia aislada respecto a `main`. Se resolvieron los marcadores en `LessonActivity.tsx`, `SituationDialogue.tsx` y `SituationScenePage.tsx`. Se conservaron la etiqueta y descripción accesible de los campos, la selección consolidada de objetivos de cámara, las reglas de doble validación y las réplicas de cada escena, junto con los iconos, las transiciones y las celebraciones. Se verificó la ausencia de marcadores y se ejecutó el build del código integrado. El historial nuevo contiene código y este informe. Los datasets, el modelo privado, los ZIP y la evidencia audiovisual permanecen fuera de los nuevos commits. La referencia remota y la copia aislada se conservaron.

El respaldo local está en la carpeta hermana `senaverse-respaldo-motion-20261124`. `main-previo.bundle` contiene el historial y la punta anterior, `66e7ba6d97f4a0da1e58e3cc6dd89c0511dbdd3b`. `aislada-cambios.zip` incluye los cambios rastreados, los archivos nuevos y la evidencia de la copia aislada. Se verificó la integridad del ZIP y el SHA-256 individual de sus 160 archivos frente al origen. El SHA-256 del ZIP es `15eb369509921c7048ea3de926da5a407b62507b42b95694c1a47f773fb112f1`. `inventario-respaldo.json` conserva las huellas, los estados y los HEAD. La recuperación se puede hacer en una carpeta nueva sin alterar las copias de trabajo.

```powershell
git bundle verify ../senaverse-respaldo-motion-20261124/main-previo.bundle
git clone ../senaverse-respaldo-motion-20261124/main-previo.bundle ../senaverse-recuperacion
```

Para reproducir el árbol de la copia aislada, preparar aparte `809c3fa` y recuperar allí el contenido de `aislada/archivos`. El archivo `patch-tracked.diff` permite revisar el delta rastreado. El manifiesto permite cotejar ambos métodos de recuperación.

## Inventario y auditoría funcional

| Tanda | Efectos conservados | Verificación en la candidata |
| --- | --- | --- |
| 1 · Presentación y panel | Entradas, respuesta de tarjetas y botones, ruta de aprendizaje, barra de nivel y valores reales. | Presentación y panel cargaron en ambos temas y los seis anchos. Se comprobaron los accesos, el enlace para saltar al contenido y la actualización de XP desde otro documento. |
| 2 · Aprender y Biblioteca | Entradas de unidades, transiciones entre actividades, retroalimentación, celebración al completar y movimiento del visor y favoritos. | Se completaron las seis unidades y doce lecciones con 960 XP. La evaluación pasó de 5/6 a 6/6 al revisar. Se verificaron 35 fichas, filtros, favoritos, enlaces directos, controles de teclado y los diez videos. Se recorrió la práctica con tomas históricas. |
| 3 · Situaciones | Diálogo, feedback de contexto, comprensión visual y coincidencia gestual, avance y celebración. | Se completaron seis escenarios y quince interacciones sin cámara. Se otorgaron 240 XP y se repitió un escenario sin XP extra. Se comprobaron la doble validación, los errores y los reintentos con reproducción de landmarks y el diálogo consolidado. |
| 4 · Minijuegos | Volteo 3D de Memoria, conexiones SVG de Relaciona, transiciones de Adivina, combos de Contrarreloj, secuencias y ayudas y resultados. | Cinco partidas completas, tres niveles cuando corresponden, arrastre, toque y teclado. Se verificaron ocultación, persistencia de récords, cronómetro, pistas, continuidad de cámara y XP únicos. |
| 5 · Cámara, progreso y perfil | Encuadre y estados reales, barras, insignias nuevas una sola vez y microinteracciones del perfil. | Permiso denegado, cámara ausente u ocupada, búsqueda, resultados del clasificador, pausa, liberación y navegación. Se verificaron nivel, historial, racha de tres días, favoritos, respaldo, reintento de descarga, rehidratación de 100 XP y restablecimiento con progreso. |

Los componentes de presentación y estado de las tandas 1–5 están en 38 archivos de código respecto a `809c3fa`. Las reglas, la persistencia, el modelo, el Worker y los activos del SDK se conservaron. El delta consolidado de las cinco tandas en `src/data`, `src/features`, `ml`, `public`, dependencias y scripts de prueba está vacío. [Tanda 1](senaverse-motion-tanda-1.md) · [Tanda 2](senaverse-motion-tanda-2.md) · [Tanda 3](senaverse-motion-tanda-3.md)

## Comparación acumulada

Se recompilaron tres revisiones con Vite 8.3.7 y los mismos paquetes instalados. **Original** es `636dc11`, la base de trabajo al comenzar Motion. **Consolidada** es `809c3fa`, padre de la primera integración de Motion y control para aislar los efectos de cambios previos en los minijuegos y el currículo. **Motion** es el código de `a5adfe6`. Los tres builds se sirvieron con Vite por loopback. Se usó Chromium 158.0.8127.37 en un equipo con Intel Core i7-12700F y la misma configuración, con perfiles nuevos, caché fría, orden alternado y tráfico externo bloqueado.

Se hicieron tres cargas por versión, ruta y tamaño. Son **162 cargas**. LCP, CLS, trabajo del hilo principal (`TaskDuration`), heap JS e intervalos entre cuadros se midieron hasta aproximadamente 1,05 s desde la navegación. Después se midió una interacción representativa por ruta. La respuesta al clic es el tiempo desde el evento hasta el segundo `requestAnimationFrame`. Es una aproximación a respuesta visual y se reporta por separado de Event Timing, cuyo umbral de captura fue 16 ms. Las medianas describen este entorno de escritorio y su emulación móvil.

| Ruta | LCP escritorio original / consolidada / Motion (ms) | LCP móvil original / consolidada / Motion (ms) |
| --- | ---: | ---: |
| Presentación | 156 / 164 / 172 | 156 / 152 / 172 |
| Panel | 176 / 172 / 180 | 164 / 164 / 180 |
| Aprender | 176 / 180 / 200 | 156 / 168 / 176 |
| Biblioteca | 168 / 164 / 168 | 144 / 152 / 152 |
| Situaciones | 188 / 200 / 212 | 168 / 160 / 164 |
| Minijuegos | 164 / 188 / 176 | 156 / 164 / 172 |
| Cámara | 472 / 460 / 460 | 440 / 452 / 448 |
| Mi progreso | 176 / 180 / 176 | 152 / 156 / 184 |
| Mi perfil | 160 / 180 / 164 | 144 / 152 / 152 |

| Medida acumulada | Original | Consolidada | Motion |
| --- | ---: | ---: | ---: |
| LCP mediano | 168 ms | 168 ms | 176 ms |
| CLS mediano | 0 | 0 | 0 |
| Hilo principal mediano | 127,01 ms | 128,24 ms | 150,59 ms |
| Tareas largas de 50 ms o más | 0 | 0 | 0 |
| Respuesta aproximada al clic | 10,15 ms | 9,90 ms | 10,30 ms |
| Event Timing mediano de eventos observados | 16 ms (19) | 16 ms (17) | 16 ms (24) |
| p95 mediano del intervalo entre cuadros | 5,7 ms | 5,7 ms | 5,7 ms |
| Heap JS mediano | 4,79 MB | 4,80 MB | 4,83 MB |
| JavaScript + CSS, sin comprimir | 929.977 B | 950.160 B | 990.023 B |
| JS principal gzip | 118.858 B | 128.811 B | 123.531 B |
| CSS principal gzip | 30.809 B | 32.004 B | 36.409 B |
| Build completo | 54.256.883 B | 54.276.984 B | 54.317.015 B |

Biblioteca tuvo medianas de CLS por vista inferiores a 0,005 y el mayor CLS mediano por vista fue el de Cámara de escritorio, aproximadamente 0,024 en las tres versiones. El aumento mayor de trabajo por vista frente al control consolidado apareció en Situaciones móvil (129,00 → 186,81 ms), seguido por Aprender de escritorio (130,53 → 176,08 ms) y Mi progreso móvil (124,98 → 170,00 ms). Presentación móvil mostró una respuesta aproximada al clic de 12,8 → 35,6 ms en esa muestra. Si el ensayo en hardware menos potente muestra saltos, los primeros efectos que se pueden simplificar son las entradas escalonadas de tarjetas en esos catálogos y el velo inicial de Presentación. En Chromium local, el intervalo entre cuadros se mantuvo y el incremento consistió en trabajo acumulado. Los registros por navegación y el desglose completo están en `auditoria-load.json` y `tablas-load.json` del respaldo.

## Reconocimiento y tiempo de entrega

Se ejecutaron ensayos de diagnóstico en desarrollo con el dispositivo sintético sin manos de Chromium y el panel existente `?handDebug=1`. El control comparable era `809c3fa`. Se observó con instrumentación de navegador el canal de fotogramas y mensajes, usando el mismo SDK y Worker. Estas mediciones incluyen el arranque del detector. Los contadores del panel se publican por intervalos y pueden quedar adelantados o atrasados respecto al corte de los contadores del navegador.

El navegador contó callbacks de video, bitmaps completados, fotogramas enviados y resultados publicados al canal. Una publicación se observa cuando llega al navegador, por lo que la producción interna previa a `postMessage` queda fuera de esa cifra. El diagnóstico distingue observaciones aceptadas, descartes por edad, orden o pausa y fotogramas que el motor saltó, sustituyó o descartó antes de inferir. El límite se mantuvo en 120 ms desde la solicitud del bitmap. No se midió la exposición física del sensor.

| Módulo | Bitmaps enviados B → M | Resultados en el canal B → M | Aceptadas según diagnóstico B → M | Fotogramas descartados B → M | Resultados descartados por edad B → M |
| --- | ---: | ---: | ---: | ---: | ---: |
| Centro de práctica | 65 → 61 | 65 → 60 | 56 → 59 | 91 → 16 | 1 → 1 |
| Aprender | 55 → 67 | 55 → 67 | 48 → 60 | 22 → 10 | 1 → 1 |
| Situaciones | 68 → 55 | 68 → 55 | 62 → 50 | 8 → 20 | 1 → 1 |
| Desafío de señas | 67 → 54 | 66 → 54 | 61 → 49 | 9 → 21 | 1 → 1 |
| Reto contrarreloj | 59 → 68 | 59 → 68 | 55 → 62 | 14 → 7 | 1 → 1 |

**B** identifica el control consolidado y **M** la integración. Todos los bitmaps completados fueron enviados en estos cortes. En el tiempo previo a inferir, la métrica de capturas caducadas dio cero en las diez sesiones. Los fotogramas descartados incluyen los sustituidos, saltados y los límites de frecuencia, además de las caducidades. Cada sesión mantuvo un stream y un Worker, y ambos se liberaron al desactivar. Se observó un resultado tardío por módulo y versión al arrancar. En Centro, la primera respuesta de la muestra de control tardó 4.247 ms en desarrollo con carga inicial. Esa sesión duró 8,5 s frente a 5,0 s de la integrada, de modo que sus totales acumulados tienen distinta duración. Los otros pares duraron aproximadamente 4 s.

Se repitió Centro en tres pares de ventanas de 2,2 s con el detector ya activo y el panel sincronizado. Hubo 132 entregas en el control y 129 en Motion. La mediana de latencia fue 12,3 → 11,2 ms y el máximo 29,7 → 25,8 ms. En estas ventanas hubo cero entregas tardías y cero nuevos descartes por edad en ambos builds. Esta comprobación complementa la muestra de arranque, donde sí se registraron descartes.

Las confirmaciones se comprobaron aparte con landmarks históricos reinyectados en el canal y V1 activo. Centro reconoció «Con», una coincidencia dirigida, una seña diferente y un control desconocido. Aprender verificó «Con» y las validaciones de Números básicos. Situaciones verificó combinaciones de contexto, coincidencia, pérdida de seguimiento y continuidad del diálogo. Desafío mantuvo la cámara al volver de una pista y confirmó tres objetivos (10, 20 y 30 puntos en el tablero, con una recompensa de 20 XP). Contrarreloj confirmó dos objetivos con trazas. En otro ensayo, una reproducción del video educativo a través de una pista sintética produjo 10 puntos, con 82 de 83 resultados dentro de la ventana en el fotograma repetido del 55 %. Esa prueba y el control sin manos corresponden a fuentes distintas. La webcam física, el sensor y la consistencia con usuarios reales quedan pendientes.

## Red local y privacidad

Con DNS externo bloqueado y el navegador abortando HTTPS fuera de loopback, se recorrieron los módulos y las rutas con cámara. Se observó en el control y en Motion un **POST** a `https://odml.pa.googleapis.com/v1/log`. En la candidata, los ejemplos registrados tenían tipo `application/x-protobuf` y tamaños de 121, 139 o 141 bytes. El aviso oficial distingue el procesamiento de entradas en el dispositivo de las métricas de rendimiento y uso que MediaPipe Tasks envía a Google. La auditoría observó el intento de envío y su bloqueo. El método, el tipo y el tamaño por sí solos dejan pendiente la caracterización del contenido exacto y de posibles campos personales. [Aviso oficial de privacidad de MediaPipe Tasks Vision](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md#privacy-notice)

Las láminas externas del MINEDU muestran su limitación de conexión. Las fotografías, los videos, las fuentes, las ilustraciones, V1 y el WASM se sirven localmente. Las rutas públicas devolvieron 404 para Dataset Studio, el laboratorio, el endpoint privado del modelo y los archivos privados comprobados. En los recorridos visuales sin activar reconocimiento, el fixture de feria verificó que V1 y el Worker no se descargaron.

## Accesibilidad, pantallas y pruebas

- Chromium recorrió **224 casos de la auditoría de feria** y **108 combinaciones adicionales** de nueve rutas, seis anchos y dos temas. Los anchos fueron 320, 390, 768, 1024, 1366 y 1920 px. El contenido medido y los controles comprobados cupieron en el ancho disponible.
- El perfil con movimiento reducido registró cero animaciones activas durante la comprobación de entrada en las nueve rutas. Las animaciones Motion usan iteraciones finitas. Se comprobó el foco por teclado, el retorno al cerrar el selector de avatar, el visor multimedia y la operación táctil de los minijuegos.
- En 110 muestras de texto y controles con fondo sólido, la menor relación de contraste fue **5,08:1**. La suite de temas verificó la legibilidad de las dos paletas y el contraste de foco y barras. El muestreo visual se hizo en Chromium, con emulación de móvil. Quedan pendientes teléfonos físicos, evaluación con tecnologías de asistencia físicas y un ensayo con la webcam de exposición.

| Prueba | Aprobadas | Fallidas | Omitidas |
| --- | ---: | ---: | ---: |
| TypeScript, configuraciones de aplicación y Node | 2 | 0 | 0 |
| ESLint | 1 | 0 | 0 |
| Build integrado | 1 | 0 | 0 |
| Suite de aplicación Node | 249 | 0 | 0 |
| Suite del motor web | 6 | 0 | 0 |
| Suites de Python ML y V2 | 17 | 0 | 0 |
| Recorridos versionados de Chromium en la candidata | 7 | 3 | 0 |

Los recorridos aprobados fueron `audit-production`, `audit-functional`, `curriculum-production`, `library-production`, `minigames-production`, `progress-production` y `student-production`. `situation-production`, `media-production` y `lesson-production` completaron sus comprobaciones funcionales y fallaron en la aserción final que exige cero solicitudes externas. En cada caso la única solicitud externa observada fue la de telemetría descrita arriba. Se conservaron el SDK, las pruebas y sus aserciones. Un control de multimedia adicional sobre `809c3fa` también observó el endpoint de telemetría y se detuvo antes de la aserción de red por la expresión regular de la descripción aleatoria de Adivina. En la candidata esa expresión sí se cumplió en el recorrido de la tabla. Las comprobaciones complementarias de diseño, reconocimiento por módulo, secuencia con tomas históricas y rutas privadas aprobaron. Se volvió a comprobar que una insignia obtenida al consultar tres fichas se celebra una vez, que la recarga y la rehidratación no la repiten, y que dos partidas de Memoria producen una sola recompensa de 20 XP. Las 15 configuraciones por nivel y la alineación del SVG con toque, teclado y cambio de orientación también aprobaron. El detalle se conserva como `fixtures-all-4206.json`, `auditoria-layouts.json`, `auditoria-recognition.json`, `auditoria-recognition-stable.json` y `desafio-reproduccion.json` en el respaldo.

```powershell
npm exec -- tsc --noEmit -p tsconfig.app.json
npm exec -- tsc --noEmit -p tsconfig.node.json
npm run lint
$env:RAYON_NUM_THREADS = '2'
npm run pretest
node --experimental-strip-types --test --test-concurrency=1 scripts/*.test.mjs
node --test ml/tests/web.test.mjs
& '.\ml\.venv\Scripts\python.exe' -m unittest discover -s ml/tests -v
npm run build -- --outDir ../senaverse-respaldo-motion-20261124/build-integrado
node --experimental-strip-types ../senaverse-respaldo-motion-20261124/fixtures-auditoria.mjs all 4206
```

El último comando usa el lanzador CDP local con el backend predeterminado de Chrome, las aserciones versionadas, la candidata sirviendo en `4206` y el dataset histórico presente solo en el equipo de pruebas. Las pruebas de aplicación incluyeron el caso que requiere el artefacto V1 privado. Se conservaron Dataset Studio y V2 en el repositorio. Las herramientas internas quedan fuera de la distribución pública.

### Exportación de respaldos

Mi perfil permite exportar JSON y restablecer los datos personales conservando progreso. Se indujo un error de descarga y se verificó el reintento desde la misma pantalla. La restauración se comprobó técnicamente al rehidratar el almacenamiento de un perfil de prueba con su propio JSON. **La interfaz del estudiante carece de un importador de respaldos**.

## Integridad SHA-256

| Recurso | Resultado |
| --- | --- |
| V1 público | `afd2aae852de7bb07f0318c3ed392353d11e1e89816b59265273454c781e83f3`. Coincide con el manifiesto histórico, los builds y la candidata. |
| Artefacto V1 privado | `055e31bf081e18a68081648e3948713fb86825afc6890bee7333d5cb3364c5a6`. Igual en ambas copias y reservado a pruebas locales. |
| Dataset histórico de 355 tomas | `d8943f55f630f1eef9cdd011fbde632820a019d3887e560aada480324d9941f3`. Coincide con el registro histórico. |
| Dataset de 505 tomas | Sin archivo coincidente en las ubicaciones revisadas. Se conserva la referencia histórica `4861455229fdbe3fdb818f48e7ab5a0b818d1e306f5a15d32af018ef45476cdc`. |
| Otro respaldo disponible | Se inventariaron 352 tomas y se registró `dad541d889a0f74323b6b748eb05e378ad48a6b19a0e86b1b02b25543ff7d90d`. Su autenticidad histórica queda pendiente de un manifiesto de referencia. |
| Fotos, videos, ilustraciones y SDK | Coincidieron 10 fotos, 10 videos, 21 WebP, 3 archivos en modelos y 5 recursos WASM al cotejar los tres builds y la candidata. El bundle del Worker y el SDK son idénticos. |
| ZIP de feria anterior | `d27a54646a9b3f904fa8fdec43d4371b27f11dccdabb65fa6c50248803a76155`. Conservado y verificado tras copiar la candidata. |

Los hashes por activo están en `integridad-auditoria.json` del respaldo. No se localizaron bloques individuales adicionales para cotejar. [Referencia histórica de integridad](hito-6-8-fase-1-profundizacion-pedagogica.md#integridad-verificada-por-sha-256)

## Candidata de exposición e inicio

El ZIP se guardó en `dist-feria/SenaVerse-feria-motion-rc1-a5adfe6.zip` con su archivo `.sha256` al lado. Su SHA-256 es `96d11dfc137e69c055df489e2e6c16f55561359e198919682c42370cce5569e0`. El paquete se generó con el empaquetador de feria existente, en una carpeta independiente. Se volvió a extraer desde el ZIP, se validaron los **76 recursos de producción** del manifiesto y se arrancó el servidor local desde esa extracción. Los recorridos de navegador usaron ese servidor. El inventario permite solo activos educativos, dependencias locales de ejecución, el lanzador, el servidor y sus instrucciones.

En Windows, extraer todo el ZIP en una carpeta nueva. Con Node.js 22 o posterior y Chrome o Edge instalados, ejecutar desde esa carpeta:

```powershell
& '.\INICIAR_SEÑAVERSE.bat' --verificar
& '.\INICIAR_SEÑAVERSE.bat' --perfil=ensayo
```

El lanzador abre la aplicación en `http://127.0.0.1:4173/` y deja el perfil de ensayo separado del habitual. La alternativa manual es `node scripts/servidor-feria.mjs --solo-servidor`. Mantener el mismo navegador, perfil y puerto permite conservar el progreso del ensayo.

### Recorrido de cinco minutos

| Tiempo | Acción |
| --- | --- |
| 0:00–0:40 | Abrir Presentación, entrar al panel y mostrar la ruta de aprendizaje. |
| 0:40–1:40 | Abrir Aprender → Números básicos. Reproducir una referencia local y responder una actividad. |
| 1:40–2:20 | En Biblioteca, abrir la ficha Dos, usar el visor y marcarla como favorita. |
| 2:20–3:25 | En Situaciones → Comprando útiles escolares → Cuadernos por curso, elegir una respuesta y resolver la verificación visual. Mostrar por separado el contexto y el ejercicio. Incluir cámara solo si se ha ensayado físicamente. |
| 3:25–4:25 | Jugar Memoria o Relaciona en el nivel básico y mostrar el resultado. |
| 4:25–5:00 | Abrir Mi progreso para mostrar XP, historial e insignias. Cerrar en Mi perfil con el avatar del ensayo. |
