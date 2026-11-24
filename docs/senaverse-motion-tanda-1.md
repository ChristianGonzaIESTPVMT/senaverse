# SeñaVerse Motion · Tanda 1

La tanda incorpora movimiento en Presentación (`/presentacion`) y en el panel del estudiante (`/` y su acceso `/panel`). La implementación usa CSS, SVG y React con las dependencias del proyecto y los recursos locales.

## Efectos

| Superficie | Comportamiento |
| --- | --- |
| Presentación | La etiqueta, el título, la descripción, los botones y el pie de la cabecera aparecen en secuencia, con pasos de 45 ms. La ilustración se desplaza ligeramente mientras se desvanece una capa translúcida. |
| Tarjeta de números | Un degradado lila, azul y menta recorre una vez el contorno en 850 ms. Una máscara CSS limita el destello al borde. La tarjeta gana profundidad con un tinte suave, una sombra y una inclinación de 1,2° al pasar el cursor. |
| Botones y tarjetas | Los botones de Presentación revelan un brillo direccional en 160 ms. Las flechas responden al cursor y al foco. Las tarjetas se elevan hasta 3 px, con una respuesta de foco en las que contienen enlaces. |
| Ruta de aprendizaje | La tarjeta entra en 400 ms con desplazamiento y una capa que se desvanece por encima del contenido. Sus enlaces y los accesos rápidos aprovechan las transiciones y el foco visible de la base compartida. |
| Panel y progreso | El nivel conserva el `<progress>` nativo y su valor accesible. El relleno visual usa `scaleX` y tarda hasta 540 ms. Los XP y el número de lecciones se muestran con su cifra real desde el primer cuadro de cada actualización. Un cambio efectivo aplica un énfasis de 260 ms a la cifra. |

La base `src/senaverse-motion.css` reúne duraciones, curva, entradas, microinteracciones y estados de foco. Las entradas duran entre 340 y 450 ms por elemento. `prefers-reduced-motion` aplica los valores finales de inmediato y mantiene los estados estáticos de foco y resaltado. En colores forzados se muestra la barra nativa. El resto de la interfaz sigue usando los estilos preexistentes.

## Referencias

Los ejemplos se usaron como referencias visuales. Los efectos se escribieron para SeñaVerse.

| Referencia | Aplicación |
| --- | --- |
| [Blur Fade](https://magicui.design/docs/components/blur-fade) | Entrada escalonada con opacidad y desplazamiento corto. |
| [Magic Card](https://magicui.design/docs/components/magic-card) | Iluminación radial suave y profundidad en la tarjeta de números. |
| [Border Beam](https://magicui.design/docs/components/border-beam) | Un único recorrido del contorno con un degradado y una máscara CSS. |
| [Interactive Hover Button](https://magicui.design/docs/components/interactive-hover-button) | Revelado direccional y desplazamiento de la flecha. |
| [Number Ticker](https://magicui.design/docs/components/number-ticker) | Énfasis al actualizar un valor guardado. |
| [3D Card Effect](https://ui.aceternity.com/components/3d-card-effect) | Perspectiva CSS e inclinación discreta al pasar el cursor. |
| [Animista](https://animista.net/) | Referencia para las entradas verticales cortas y su aceleración. |

## Verificación

- TypeScript validó `tsconfig.app.json` y `tsconfig.node.json`. `npm run lint`, `npm run build` y las 241 pruebas de `npm test` aprobaron.
- Chromium verificó ambas pantallas en dos temas y nueve anchos, de 320 a 1920 px, con 36 combinaciones sin desbordamiento horizontal en el documento ni en los controles revisados. También se verificó la navegación con `Tab` y `Enter`, el foco visible, la elevación de accesos, el movimiento reducido en móvil y escritorio y la barra nativa en colores forzados. Ambas pantallas cargaron con las peticiones restringidas al servidor local.
- La partida de «Relaciona y aprende» en una segunda pestaña llevó el panel de 0 a 20 XP y el avance hacia el siguiente nivel a 25 %. Se comprobó el cambio visual con y sin movimiento reducido, la persistencia al recargar y la ausencia de una segunda animación para el mismo valor.
- Los builds anterior y final contienen las mismas 21 ilustraciones, los 20 archivos multimedia y los recursos de `public/models/`, comprobados por SHA-256. El paquete de feria existente conserva el SHA-256 `d27a54646a9b3f904fa8fdec43d4371b27f11dccdabb65fa6c50248803a76155`.

## Rendimiento antes y después

Se comparó el build de `636dc11` con el build final en Chromium 158.0.8127.37. Se alternaron siete cargas por versión, ruta y tamaño, con contextos nuevos en tema claro y sin historial. La ventana de muestreo comenzó al navegar y duró al menos 1,35 s. Se usan medianas debido a los picos aislados en ambas versiones.

| Ruta y tamaño | LCP antes → después | Tiempo de tareas del hilo principal antes → después | CLS antes → después |
| --- | ---: | ---: | ---: |
| Presentación · 1366 × 768 | 204 → 224 ms | 175 → 253 ms | 0 → 0 |
| Presentación · 390 × 844 | 200 → 220 ms | 174 → 257 ms | 0 → 0 |
| Panel · 1366 × 768 | 224 → 240 ms | 187 → 209 ms | 0 → 0 |
| Panel · 390 × 844 | 192 → 208 ms | 156 → 186 ms | 0 → 0 |

El percentil 95 del intervalo entre cuadros, medido con `requestAnimationFrame`, tuvo una mediana de 5,7 ms en las cuatro combinaciones para ambas versiones. El CSS y el JavaScript principales sumaron aproximadamente 1,8 kB adicionales comprimidos con gzip. Las capas de entrada y el destello aumentaron el tiempo de tareas durante la carga, sobre todo en Presentación.

## Limitaciones

- La comparación de rendimiento cubre dos rutas en Chromium para Windows. El formato móvil se emuló y la medición corresponde a una carga local con caché de navegador limpia.
- El destello usa `mask-composite` y la entrada inicial de la barra usa `@starting-style`. En navegadores sin esas capacidades, la tarjeta conserva su borde y la barra presenta el valor al cargar.

## Evidencia visual

| Pantalla | Escritorio · 1366 × 768 | Móvil · 390 × 844 | Grabación |
| --- | --- | --- | --- |
| Presentación | [Claro](evidencia-senaverse-motion-tanda-1/presentacion-escritorio-claro.png) · [Oscuro](evidencia-senaverse-motion-tanda-1/presentacion-escritorio-oscuro.png) | [Claro](evidencia-senaverse-motion-tanda-1/presentacion-movil-claro.png) · [Oscuro](evidencia-senaverse-motion-tanda-1/presentacion-movil-oscuro.png) | [Entrada, destello y cursor](evidencia-senaverse-motion-tanda-1/presentacion-entrada.webm) |
| Panel | [Claro](evidencia-senaverse-motion-tanda-1/panel-escritorio-claro.png) · [Oscuro](evidencia-senaverse-motion-tanda-1/panel-escritorio-oscuro.png) | [Claro](evidencia-senaverse-motion-tanda-1/panel-movil-claro.png) · [Oscuro](evidencia-senaverse-motion-tanda-1/panel-movil-oscuro.png) | [Ruta y actualización real del progreso](evidencia-senaverse-motion-tanda-1/panel-ruta-y-progreso.webm) |

[Foco de teclado en los accesos rápidos](evidencia-senaverse-motion-tanda-1/panel-foco-teclado-oscuro.png) · [Progreso en móvil con movimiento reducido](evidencia-senaverse-motion-tanda-1/panel-progreso-movil-oscuro.png).
