# SeñaVerse Motion · Tanda 2

Aprender y Biblioteca adoptan las duraciones, curvas, elevación, foco y barra de progreso de la Tanda 1. Los efectos usan CSS, SVG y React con las dependencias y recursos locales del proyecto.

## Inventario de animaciones

| Superficie | Efecto |
| --- | --- |
| Unidades de Aprender | Las seis tarjetas entran con un desplazamiento de 6 px y un escalón de 45 ms. Las cubiertas WebP se revelan bajo una capa translúcida. Las unidades con lecciones funcionales se elevan hasta 3 px al pasar el cursor. |
| Estado y progreso de unidad | Las etiquetas distinguen material preliminar, disponibilidad, avance y finalización. Las barras de unidad y lección anuncian su valor real mediante `<progress>` y animan el relleno visual hasta 540 ms. Los enlaces de consulta, inicio y continuidad mantienen sus destinos. |
| Pasos y actividades | El título y las alternativas aparecen con una transición corta de opacidad. Las consignas y explicaciones añaden un desplazamiento de 4 px. La navegación por pasos conserva el foco y permite usar los controles desde que aparecen. |
| Respuesta educativa | El borde y la superficie acompañan la selección y la evaluación. Los estados incluyen icono y texto para el acierto y el error, junto con las explicaciones y criterios existentes. |
| Resumen y finalización | Los resultados aparecen en secuencia. Una finalización nueva confirmada por el historial resalta la recompensa y activa un solo destello SVG de 650 ms. El resumen histórico muestra la confirmación guardada. |
| Biblioteca | La entrada de 320 ms se aplica a las tarjetas ya visibles en el primer montaje. El buscador y los filtros actualizan sus resultados al instante. El marcador cambia de relleno según el estado guardado y los avisos anuncian el cambio. |
| Fichas y visor | El contenedor y el fondo entran en 160 ms. Al cerrar, el diálogo se cierra con su gestión nativa de foco y el fondo se desvanece. Los controles y mensajes existentes reciben una transición de opacidad. Las fotos y videos conservan su geometría, velocidad y controles. |

`prefers-reduced-motion` presenta los estados finales de inmediato. El foco visible y las señales estáticas de selección, retroalimentación y recompensa siguen disponibles. La barra nativa se muestra en colores forzados.

## Referencias visuales

Los efectos se escribieron para SeñaVerse a partir de los siguientes comportamientos visuales.

| Referencia | Aplicación |
| --- | --- |
| [Blur Fade](https://magicui.design/docs/components/blur-fade) | Entradas suaves mediante opacidad, desplazamientos pequeños y una capa sobre las cubiertas. |
| [Magic Card](https://magicui.design/docs/components/magic-card) | Profundidad discreta en tarjetas de unidades y fichas. |
| [Confetti](https://magicui.design/docs/components/confetti) | Destello de celebración breve con un trazo SVG propio. |
| [Interactive Hover Button](https://magicui.design/docs/components/interactive-hover-button) | Respuesta de flechas, botones y marcador a la interacción. |
| [Animista](https://animista.net/) | Referencia para entradas verticales, curvas y duraciones de retroalimentación. |

## Archivos de implementación

| Área | Archivos |
| --- | --- |
| Infraestructura | `src/senaverse-motion.css`, `src/components/MotionProgress.tsx` |
| Aprender | `src/pages/AcademyPage.tsx`, `src/pages/AcademyPage.css`, `src/pages/LessonPage.tsx`, `src/components/LessonSequence.tsx`, `src/components/LessonActivity.tsx` |
| Biblioteca y visor | `src/pages/LibraryPage.tsx`, `src/pages/LibraryPage.css`, `src/components/SignMediaViewer.css` |

## Verificación

- TypeScript validó `tsconfig.app.json` y `tsconfig.node.json`. ESLint y el build de producción aprobaron. El primer `npm test` en paralelo registró tiempos de espera del transporte SSR de Vite. El reintento ejecutó el mismo conjunto en serie, con `RAYON_NUM_THREADS=2` y `--test-concurrency=1`, y aprobó **241 de 241**.
- `curriculum-production` recorrió las seis unidades y completó las doce lecciones funcionales. Verificó navegación entre actividades, una evaluación de 5/6 corregida a 6/6, persistencia de 960 XP y práctica guiada de «Con» a partir de una grabación existente.
- `library-production` verificó las 35 fichas, búsqueda y filtros combinados, favoritos, enlaces directos y regreso a la lección. `media-production` decodificó las diez fotografías y reprodujo los diez videos originales, con ampliación por teclado y comprobación de cinco clips en móvil.
- Una prueba adicional bloqueó una solicitud local de video y comprobó el aviso y la recuperación mediante «Volver a intentar». También verificó la entrada a Biblioteca desde otra ruta desplazada y la ausencia de movimiento al pasar el cursor sobre el botón de ampliación con movimiento reducido.
- Las pruebas de movimiento comprobaron una sola celebración con una recompensa nueva de 80 XP, la apertura del resumen guardado y una finalización con crédito histórico. En movimiento reducido se mostró la confirmación de XP y la comprobación registró cero animaciones. `Enter` y `Escape` conservaron el foco en la navegación de unidades y en los diálogos anidados.
- Chromium revisó 36 combinaciones de tema, ancho y ruta, entre 320 y 1920 px. El documento y los controles revisados ajustaron al ancho disponible.
- La comparación por SHA-256 verificó las 21 ilustraciones, los 20 archivos multimedia originales y los recursos de `public/models/` en ambos builds. También se verificaron el dataset histórico local y el ZIP de feria contra sus hashes documentados. Las pruebas de producción siguieron encontrando los cinco minijuegos y las seis situaciones, y el recorrido conservó las reglas de evaluación y recompensa.

## Rendimiento antes y después

Se comparó el build con la Tanda 1 activa con el build final en Chromium 158.0.8127.37. Se alternaron siete cargas limpias por versión, ruta y tamaño, para un total de 84 mediciones en tema claro y sin historial. Se tomó la mediana de cada serie tras observar al menos 1,2 s desde la navegación.

| Ruta y tamaño | LCP antes → después | Tareas del hilo principal antes → después | CLS mediano antes → después |
| --- | ---: | ---: | ---: |
| Aprender · 1366 × 768 | 232 → 232 ms | 148 → 193 ms | 0 → 0 |
| Aprender · 390 × 844 | 204 → 212 ms | 147 → 189 ms | 0 → 0 |
| Lección inicial · 1366 × 768 | 184 → 192 ms | 146 → 151 ms | 0 → 0 |
| Lección inicial · 390 × 844 | 172 → 184 ms | 144 → 157 ms | 0 → 0 |
| Biblioteca · 1366 × 768 | 200 → 208 ms | 163 → 179 ms | 0 → 0 |
| Biblioteca · 390 × 844 | 192 → 188 ms | 159 → 168 ms | 0 → 0 |

El percentil 95 del intervalo entre cuadros registró la misma mediana antes y después en cada combinación, entre 5,6 y 5,7 ms. El CSS y JavaScript principales sumaron alrededor de 1,4 kB adicionales comprimidos con gzip. Las entradas de las seis unidades concentraron el mayor aumento del tiempo de tareas durante la carga.

## Capturas y grabaciones

| Superficie | Escritorio · 1366 × 768 | Móvil · 390 × 844 | Grabación |
| --- | --- | --- | --- |
| Aprender | [Claro](evidencia-senaverse-motion-tanda-2/aprender-escritorio-claro.png) · [Oscuro](evidencia-senaverse-motion-tanda-2/aprender-escritorio-oscuro.png) | [Claro](evidencia-senaverse-motion-tanda-2/aprender-movil-claro.png) · [Oscuro](evidencia-senaverse-motion-tanda-2/aprender-movil-oscuro.png) | [Entrada de unidades y navegación](evidencia-senaverse-motion-tanda-2/aprender-unidades.webm) |
| Lección | [Retroalimentación](evidencia-senaverse-motion-tanda-2/leccion-retroalimentacion.png) · [Recompensa real](evidencia-senaverse-motion-tanda-2/leccion-recompensa.png) | — | [Pasos, respuestas y finalización](evidencia-senaverse-motion-tanda-2/leccion-transiciones.webm) |
| Biblioteca | [Claro](evidencia-senaverse-motion-tanda-2/biblioteca-escritorio-claro.png) · [Oscuro](evidencia-senaverse-motion-tanda-2/biblioteca-escritorio-oscuro.png) · [Ampliación](evidencia-senaverse-motion-tanda-2/biblioteca-ampliacion.png) | [Claro](evidencia-senaverse-motion-tanda-2/biblioteca-movil-claro.png) · [Oscuro](evidencia-senaverse-motion-tanda-2/biblioteca-movil-oscuro.png) | [Favoritos, apertura, ampliación y cierre](evidencia-senaverse-motion-tanda-2/biblioteca-transiciones.webm) |

## Limitaciones

- Chromium para Windows cubrió escritorio y vistas móviles emuladas. Las mediciones describen la carga local y la prueba de reconocimiento usa una grabación con cámara sintética.
- La transición del fondo al cerrar usa `transition-behavior: allow-discrete` y `@starting-style`. En navegadores sin estas herramientas, el diálogo conserva su apertura, cierre y foco nativos. En móvil, la entrada de tarjetas de Biblioteca se aplica cuando la primera fila ya está dentro del área visible al abrir la ruta.
