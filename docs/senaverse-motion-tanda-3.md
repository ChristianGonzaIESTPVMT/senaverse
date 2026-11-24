# SeñaVerse Motion · Tanda 3

Situaciones aplica la base de movimiento de SeñaVerse al catálogo, las conversaciones y sus resultados. La implementación usa CSS, SVG y React con los recursos y dependencias locales del proyecto.

## Inventario de movimiento

| Superficie | Efecto |
| --- | --- |
| Catálogo | Las seis tarjetas entran con un desplazamiento de 6 px y un escalón de 45 ms. Una capa translúcida revela las ilustraciones con su encuadre original. El cursor y el foco cambian el borde y la superficie y elevan la tarjeta hasta 3 px. |
| Entrada al escenario | Título, contexto, progreso y primera intervención entran de forma coordinada. Las ilustraciones se revelan cuando la interacción ya permite mostrarlas. |
| Conversación | El primer mensaje y la reacción usan desplazamientos cortos y una entrada de 260 ms. Se anima el bloque que entra y las intervenciones se pueden leer desde que aparecen. |
| Alternativas | Las opciones resaltan el foco y el estado elegido. El icono de acierto o error aparece tras la comprobación. En la modalidad visual se anima la consigna y el control, de forma independiente de las fotos y videos. |
| Doble validación | El contexto y la evidencia se presentan en tarjetas separadas. Los iconos distinguen contexto, comprensión visual, coincidencia, seña diferente, gesto desconocido y seguimiento insuficiente. Cada resultado usa la observación registrada en su propio intento. |
| Cámara | La entrada del panel y la aparición de una seña confirmada usan un fundido de 180 ms. El borde del estado acompaña la confirmación y el intento conserva su ciclo de vida existente. |
| Progreso | El valor del `<progress>` y el texto se actualizan con el avance real. El relleno cambia mediante `scaleX` en 540 ms. Los historiales restaurados aparecen con su valor actual desde el primer cuadro. |
| Resumen | Las métricas y los resultados por interacción aparecen en secuencia. La primera recompensa registrada tras pulsar «Finalizar situación» activa un destello SVG de 650 ms y resalta el XP existente. |

Con `prefers-reduced-motion`, las opciones, la retroalimentación y la distinción entre evidencias conservan sus estados estáticos. En colores forzados se muestra la barra de progreso nativa.

## Referencias

Los efectos se escribieron para SeñaVerse con estas referencias de comportamiento visual.

| Referencia | Aplicación |
| --- | --- |
| [Animated List](https://magicui.design/docs/components/animated-list) | Entrada secuencial de intervenciones y resultados. |
| [Blur Fade](https://magicui.design/docs/components/blur-fade) | Revelado de ilustraciones con una capa translúcida y entradas de texto con opacidad. |
| [Interactive Hover Button](https://magicui.design/docs/components/interactive-hover-button) | Respuesta breve de acciones y flechas al cursor y al foco. |
| [Magic Card](https://magicui.design/docs/components/magic-card) | Profundidad ligera al interactuar con una tarjeta del catálogo. |
| [Animista](https://animista.net/) | Referencia para desplazamientos, curvas y tiempos de entrada. |

El destello sigue el patrón de confirmación con SVG de la tanda de Aprender. Una señal temporal en memoria vincula la acción de finalizar con el registro de XP confirmado, de modo que el historial por sí solo muestra el resumen guardado.

## Archivos de implementación

| Área | Archivos |
| --- | --- |
| Catálogo y estilos | `src/pages/SituationsPage.tsx`, `src/pages/SituationsPage.css` |
| Escenario y diálogo | `src/pages/SituationScenePage.tsx`, `src/components/SituationDialogue.tsx` |
| Resumen | `src/pages/SituationResultsPage.tsx`, `src/components/situationFinishMotion.ts` |
| Infraestructura | `src/components/MotionProgress.tsx`, `src/senaverse-motion.css` |

## Verificación

- TypeScript validó las configuraciones de aplicación y Node. ESLint, el build de producción y las **241 pruebas automatizadas** aprobaron. La suite de Node se ejecutó en serie con `RAYON_NUM_THREADS=2` y `--test-concurrency=1`.
- `audit-functional` recorrió las seis situaciones y sus 15 interacciones sin cámara. Confirmó 240 XP persistidos, seis recompensas únicas y 0 XP adicionales al repetir. Verificó la aparición de las ilustraciones en el punto previsto y la ausencia de arranques de cámara en ese recorrido.
- Chromium verificó 48 combinaciones de catálogo, diálogo, escenario y resumen, con tema claro y oscuro y anchos entre 320 y 1920 px. El recorrido por teclado probó selección, cambio de alternativa, foco y progreso. También se comprobó el movimiento reducido y la ausencia de celebración al restaurar y repetir una situación ya recompensada.
- Con cámara sintética y reproducción de landmarks de grabaciones existentes, `checkSituations` recorrió aciertos, discrepancias, gesto desconocido y seguimiento insuficiente. Comprobó los reintentos, la invalidación de la observación al perder la mano, la persistencia del intento y la liberación de cámara y Worker. La prueba verificó que la continuación aparece únicamente con las dos validaciones aprobadas en el mismo intento.
- El lanzador habitual, con SwiftShader, agotó el tiempo de espera de «Tres» o «Dos» durante la reproducción. La misma espera se reprodujo en el build anterior. Con el backend gráfico predeterminado de Chromium se completaron las comprobaciones funcionales del mismo `checkSituations`. Quedó fallando su última aserción, que exige cero solicitudes externas.
- Se compararon por SHA-256 44 archivos estáticos de los dos builds, incluidas las 21 ilustraciones, el multimedia y los modelos. El Worker de detección y el bundle de MediaPipe también coincidieron byte a byte. Se verificaron el dataset histórico local y el ZIP de feria contra sus hashes documentados.

## Rendimiento antes y después

Se comparó el build con la Tanda 2 activa con el build final en Chromium 158.0.8127.37. Se alternaron siete cargas por versión, ruta y tamaño para un total de 84, con contextos nuevos y recursos locales. Se registraron las medianas tras observar al menos 1,2 s desde la navegación.

| Ruta y tamaño | LCP antes → después | Tareas del hilo principal antes → después | CLS mediano antes → después |
| --- | ---: | ---: | ---: |
| Catálogo · 1366 × 768 | 244 → 260 ms | 165 → 211 ms | 0 → 0 |
| Catálogo · 390 × 844 | 236 → 236 ms | 158 → 208 ms | 0 → 0 |
| Diálogo · 1366 × 768 | 472 → 476 ms | 157 → 178 ms | 0,00754 → 0,00754 |
| Diálogo · 390 × 844 | 464 → 484 ms | 159 → 179 ms | 0 → 0 |
| Resumen · 1366 × 768 | 192 → 188 ms | 152 → 178 ms | 0 → 0 |
| Resumen · 390 × 844 | 180 → 196 ms | 148 → 170 ms | 0 → 0 |

La mediana del percentil 95 entre cuadros se mantuvo entre 5,6 y 5,7 ms. El catálogo concentró el mayor aumento de trabajo durante la carga. El CSS y el JavaScript principales sumaron unos 1,2 kB comprimidos con gzip.

La prueba con webcam sintética sin manos usó cinco pares de ventanas de dos segundos con el Worker activo y los destinos remotos bloqueados. En cada muestra se mantuvo una solicitud de cámara, un Worker, una pista viva y el mismo elemento de video. La instrumentación de React registró cero renderizados del componente de reconocimiento durante esas ventanas en ambos builds.

| Métrica con cámara activa | Mediana antes → después |
| --- | ---: |
| Resultados entregados por el Worker en 2 s | 40 → 40 |
| Duración de inferencia reportada por el Worker | 8,5 → 8,3 ms |
| Tareas del hilo principal en 2 s | 124 → 115 ms |
| Percentil 95 entre cuadros | 5,6 → 5,6 ms |

## Evidencia visual

| Superficie | Capturas y grabaciones |
| --- | --- |
| Catálogo | [Seis tarjetas](evidencia-senaverse-motion-tanda-3/catalogo-seis-situaciones.png) · [Escritorio claro](evidencia-senaverse-motion-tanda-3/catalogo-escritorio-claro.png) · [Escritorio oscuro](evidencia-senaverse-motion-tanda-3/catalogo-escritorio-oscuro.png) · [Móvil claro](evidencia-senaverse-motion-tanda-3/catalogo-movil-claro.png) · [Móvil oscuro](evidencia-senaverse-motion-tanda-3/catalogo-movil-oscuro.png) |
| Cámara sintética con grabaciones | [Seguimiento insuficiente](evidencia-senaverse-motion-tanda-3/01-seguimiento-insuficiente.png) · [Contexto incorrecto y coincidencia](evidencia-senaverse-motion-tanda-3/02-contexto-incorrecto-coincidencia.png) · [Ambas incorrectas](evidencia-senaverse-motion-tanda-3/03-ambas-incorrectas.png) · [Contexto correcto y seña diferente](evidencia-senaverse-motion-tanda-3/04-contexto-correcto-sena-diferente.png) · [Gesto desconocido](evidencia-senaverse-motion-tanda-3/05-gesto-desconocido.png) · [Ambas correctas](evidencia-senaverse-motion-tanda-3/06-ambas-correctas.png) |
| Evidencia visual | [Comprensión visual en móvil oscuro](evidencia-senaverse-motion-tanda-3/07-comprension-visual-movil-oscuro.png) · [Evidencia correcta y contexto incorrecto](evidencia-senaverse-motion-tanda-3/08-visual-correcta-contexto-incorrecto.png) · [Contexto correcto y evidencia incorrecta](evidencia-senaverse-motion-tanda-3/09-contexto-correcto-visual-incorrecta.png) · [Alternativa sin reconocimiento](evidencia-senaverse-motion-tanda-3/10-alternativa-sin-reconocimiento.png) |
| Conversación y final | [Conversación completa de dos interacciones](evidencia-senaverse-motion-tanda-3/conversacion-completa.webm) · [Transiciones y reintentos](evidencia-senaverse-motion-tanda-3/transiciones-de-validacion.webm) · [Resumen con recompensa](evidencia-senaverse-motion-tanda-3/resumen-recompensa.png) |

## Limitaciones

- Las pruebas de cámara usan Chromium con webcam sintética. Las ramas gestuales se prueban reproduciendo landmarks de grabaciones existentes por el canal de prueba. La validación con cámara física queda pendiente.
- Los tamaños móviles y el movimiento reducido se emularon en Chromium para Windows. Las cifras de rendimiento describen el entorno local de prueba.
- El SDK de MediaPipe 1.2.3 ya incluye un cliente de telemetría que intenta acceder a `odml.pa.googleapis.com`. Una prueba adicional observó un intento al desactivar la cámara en cada build. Con ese destino bloqueado, ambos builds procesaron imágenes y liberaron la pista de video correctamente. El criterio estricto de cero intentos de conexión externa queda pendiente dentro del alcance del SDK. [Aviso de privacidad de MediaPipe Tasks](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/tasks/web/vision#privacy-notice).
