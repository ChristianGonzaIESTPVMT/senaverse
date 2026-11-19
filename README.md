# SeñaVerse

Prototipo educativo de Lengua de Señas Peruana construido con React, TypeScript y Vite.

## Desarrollo

```sh
npm install
npm run dev
npm run build
```

En PowerShell, si la política de scripts bloquea `npm`, utiliza `npm.cmd`.

La página principal está en `/`. La dirección anterior `/panel` redirige al inicio y la presentación del proyecto sigue disponible en `/presentacion`.

La cámara compartida integra el Hito 1 de MediaPipe Hand Landmarker: detección local de hasta dos manos y sus 21 puntos, sin clasificación de señas ni recompensas. Consulta la [guía de instalación, archivos y pruebas con webcam](docs/hand-landmarker-hito-1.md).

La [optimización del seguimiento](docs/hand-tracking-optimization.md) utiliza inferencia en Worker, captura de fotogramas recientes, continuidad breve y diagnóstico de desarrollo (`/camara/libre?handDebug=1`). Corrige el borrado al caducar resultados y el descarte de bitmaps todavía recientes; separa pérdidas del modelo, resultados tardíos, retención visual y fallos del Worker. El panel exporta contadores JSON por escenario y conserva los perfiles de umbrales aislados. La estabilidad física y el rendimiento de 20–30 FPS siguen pendientes de medición en hardware real.

El Hito 2 incorpora [SeñaVerse Dataset Studio](docs/dataset-studio.md), herramienta interna en `/herramientas/dataset`. Para habilitarla en desarrollo, agrega `VITE_ENABLE_DATA_COLLECTION=true` a `.env.development.local` y reinicia Vite. Recopila únicamente inferencias frescas del detector compartido, con consentimiento, revisión, IndexedDB y respaldo/restauración JSON. Está desactivada por defecto y no añade clasificación ni entrenamiento.

`.env.example` es solo una plantilla y Vite no lo carga. El archivo `.env.development.local` debe estar junto a `package.json`; queda fuera de Git y solo afecta al modo de desarrollo. Ejecuta `npm.cmd run dev` y abre `http://localhost:5173/herramientas/dataset` (o el puerto que anuncie Vite). Con la variable ausente o distinta de `true`, esa ruta está deshabilitada y redirige a Inicio. Consulta la [guía de acceso y diagnóstico](docs/dataset-studio.md).

El [catálogo inicial y protocolo piloto de LSP](docs/lsp-catalog-pilot.md) configura diez entradas estables `LSP-001` a `LSP-010`, con referencia MINEDU (2015), duración individual y revisión lingüística pendiente. Conserva las etiquetas y muestras anteriores sin asignar correspondencias, y separa los ejemplos negativos en una categoría técnica. El piloto físico previsto reúne 24 muestras reales de Uno, Tres, Sí y Mucho; permanece pendiente hasta recopilarlo con dos participantes.

## Cambiar las imágenes del inicio

1. Guarda tus imágenes en `public/images/`.
2. Edita `src/data/homeVisuals.ts` y agrega `src` en la ilustración que quieras reemplazar:

```ts
hero: {
  src: '/images/bienvenida.webp',
  alt: 'Bienvenida a SeñaVerse',
  fit: 'contain',
},
```

Las claves son `brand`, `welcome`, `hero`, `lessons`, `experience`, `progress`, `learning`, `library` y `games`. Los espacios mantienen su tamaño al cambiar el recurso. Usa `contain` para ilustraciones o `cover` para recortar fotografías. Si no defines `src`, se muestra el ícono de respaldo. Las imágenes de estas tarjetas son decorativas porque el texto contiguo ya describe su función.

El inicio, Aprender y Mi progreso comparten las lecciones realmente completadas y la regla existente de 80 XP por lección, sin recompensar repeticiones. La tipografía Nunito está alojada en `public/fonts/` con su licencia OFL.

## Mi progreso

La ruta `/progreso` muestra el avance general y por unidad calculado desde `src/data/curriculum.ts`, lecciones completadas, prácticas verificadas, XP, tres insignias y hasta cuatro actividades recientes. **Ver todos** abre las condiciones y estados de todas las insignias; **Ver historial** muestra el historial paginado. Ambos diálogos admiten teclado y Escape. La página reutiliza la navegación, el avatar y el indicador de XP existentes.

El estado compartido se conserva en `localStorage`, clave `senaverse-student-progress-v1`. Si el almacenamiento está bloqueado, funciona en memoria durante la sesión. No requiere backend ni nuevas dependencias. Un estudiante sin registros comienza en cero.

La migración lee `senaverse-demo-completed-v1` y mantiene los identificadores de lecciones válidos, sin duplicados. Excluye `introduccion` y `abecedario`, que la versión anterior insertaba automáticamente como ejemplos y no permitía volver a completar. Conserva la clave anterior intacta. Los registros anteriores no tienen fecha y se muestran como «fecha no disponible»; no se les asigna una fecha inventada. Las lecciones completadas de nuevo mediante la evaluación sí reciben fecha real.

Las insignias se calculan a partir de los registros: **Primer paso**, una lección completada; **Explorador**, consultar las fichas de tres señas diferentes en Biblioteca; **Constancia**, completar todas las lecciones de dos unidades. Consultar fichas no suma XP ni cuenta como actividad completada. Abrir pantallas o insignias tampoco otorga progreso.

### Integraciones preparadas

`useStudentProgress()` expone `recordActivity(event)` y `consultSign(signId)`. La lógica validada e idempotente está en `src/data/progress.ts`. Aprender registra la finalización solo después de aprobar su actividad y confirmar la lección. Biblioteca registra únicamente la apertura explícita de una ficha.

Para futuras integraciones, llamar `recordActivity` desde el callback que confirma el resultado real:

```ts
recordActivity({ type: 'camera', sessionId, signId, result: { recognized: true, confidence } });
recordActivity({ type: 'situation-scene', situationId, sceneId, result: { recognized: true, confidence } });
recordActivity({ type: 'minigame', runId, gameId, completed: true, score, maxScore });
```

La confianza debe estar entre 0 y 1. Los identificadores de sesión/partida evitan duplicar eventos. Una situación solo se completa al registrar todas sus escenas verificadas. Los resultados de Cámara y minijuegos quedan guardados en cada actividad. No hay reglas de XP para estos módulos todavía, por lo que no otorgan recompensas inventadas.

**Pendiente:** conectar esos callbacks cuando exista reconocimiento real en Cámara y Situaciones, e implementar los minijuegos. La vista previa de cámara, las alternativas comprobadas de Situaciones y las tarjetas «Próximamente» no son actividades completadas y no se importan como resultados.

Comprobaciones: `npm run build`, `npm run lint` y `npm test`. Las 17 pruebas usan el soporte nativo de TypeScript de Node (22.18 o posterior) y cubren migración, almacenamiento inválido, duplicados, cálculos, insignias, validación de las integraciones y renderizado de la página con datos vacíos y reales.

### Archivos de esta implementación

- `src/pages/ProgressPage.tsx`, `src/pages/ProgressPage.css`: pantalla, unidades, estadísticas, insignias, actividad y diálogos.
- `src/data/progress.ts`, `src/components/StudentProgressProvider.tsx`, `src/hooks/progressContext.ts`: validación, migración, persistencia y estado compartido.
- `src/App.tsx`, `src/components/StudentLayout.tsx`: ruta, finalización de lecciones y XP del encabezado.
- `src/pages/AcademyPage.tsx`, `src/pages/LessonPage.tsx`, `src/pages/DashboardPage.tsx`: conexión a completados reales y corrección de las etiquetas demostrativas de progreso.
- `src/pages/LibraryPage.tsx`: seguimiento de fichas consultadas para Explorador.
- `src/data/minigames.ts`, `src/pages/MinigamesPage.tsx`: catálogo compartido para validar las futuras partidas, conservando sus tarjetas actuales.
- `scripts/progress.test.mjs`, `scripts/progress-ui.test.mjs`, `package.json`: pruebas de lógica y renderizado, sin nuevas dependencias.
- `README.md`: comportamiento, reglas, migración e integraciones pendientes.

## Logo oficial y temas

El símbolo oficial se sirve desde `public/images/logo-senaverse.png` (PNG con alfa, 256 × 256, 72 KB). Procede del archivo `logo_señaverse.png` adjunto: se recortó el margen exterior prácticamente transparente y se aisló la silueta de la mano a partir de sus regiones internas translúcidas. La mano se convierte a blanco #FFFFFF opaco, incluyendo los pequeños residuos interiores, conservando el corazón, los espacios entre dedos y todos los píxeles exteriores antes de reducir proporcionalmente. El remuestreo mantiene bordes suaves. `public/favicon.png` es la versión de 64 × 64 del mismo símbolo (8 KB). No se utilizan filtros CSS ni un fondo blanco detrás del logo.

`src/data/homeVisuals.ts` configura el recurso de marca que reutiliza `Brand` en el sidebar, encabezado móvil, presentación, pie y Dataset Studio. Su contenedor queda transparente, sin el recuadro morado anterior. `scripts/prepare-brand-assets.ps1 -SourcePath <archivo.png>` permite volver a preparar ambos tamaños en Windows con System.Drawing, sin instalar dependencias; `-PublicPath` permite indicar el destino.

El botón de sol/luna del encabezado cambia inmediatamente entre claro y oscuro. Las rutas con encabezado propio (presentación y Dataset Studio) reutilizan el mismo `ThemeToggle`, con un único selector por pantalla. El control tiene nombre accesible, estado presionado, foco visible y tamaño de 42 px.

La preferencia se guarda como `light` o `dark` en `localStorage`, clave **`senaverse-theme-v1`**, independiente del perfil, progreso e IndexedDB. El valor inicial es claro. Un script pequeño en el `<head>` de `index.html` valida la preferencia y aplica `data-theme` al elemento raíz antes de iniciar React; el fondo inicial y `color-scheme` se establecen también en el encabezado para evitar un destello de otro tema. Si el almacenamiento está bloqueado, se conserva el funcionamiento durante la sesión.

`src/data/theme.ts` aplica el tema global y sincroniza controles y pestañas. `ThemeToggle` utiliza `useSyncExternalStore`; no depende del perfil ni del progreso. `src/themes.css` centraliza superficies, tarjetas, bordes, texto, acentos, hover, foco y estados de éxito, advertencia, error e información. Los estilos existentes conservan sus colores claros mediante `light-dark(colorOriginal, tokenSemántico)`, y el modo oscuro utiliza esa paleta común. Requiere soporte de CSS `light-dark()` y `color-mix()`.

La adaptación incluye Inicio, presentación, Aprender, lecciones y evaluaciones, Biblioteca y fichas, Cámara y prácticas, Situaciones y resultados, Minijuegos, Mi progreso y sus diálogos, Mi perfil y Dataset Studio habilitado. Las ilustraciones mantienen sus colores. El video, canvas, puntos de manos, inferencia, Workers, captura y almacenamiento IndexedDB conservan su lógica.

En **Mi perfil**, la tarjeta principal tiene un degradado lavanda adaptable, avatar con aro, cifras destacadas y divisores integrados. Información personal añade iconos, separadores y campos con fondo suave y foco claro; Configuración mejora las filas y estados hover. Conserva los tres bloques y las mismas acciones de edición, exportación y restablecimiento.

`scripts/theme.test.mjs` comprueba selección, arranque previo a React, persistencia al recargar, almacenamiento bloqueado, sincronización, aislamiento y contraste de los tokens. `scripts/theme-ui.test.mjs` verifica el logo y favicon con alfa, el control accesible, encabezados independientes y uso de la paleta en las superficies de cada sección. La prueba de restablecimiento del perfil también conserva la preferencia oscura. Se mantienen las pruebas de progreso y MediaPipe.

## Mi perfil

La ruta `/perfil` se abre desde el avatar del encabezado existente. Conserva el layout y muestra tres bloques: resumen del estudiante, información personal y configuración. Las dos tarjetas inferiores se apilan en pantallas pequeñas.

El nombre visible es obligatorio (máximo 40 caracteres) y la biografía es opcional (máximo 180). Al guardar se eliminan espacios al inicio y al final y se unifican espacios repetidos y saltos de línea. **Cancelar** descarta la edición. El selector ofrece seis avatares con iconos locales de Lucide y una alternativa compacta para subir una foto. El nombre y el avatar se comparten con el encabezado y se sincronizan entre pestañas.

`StudentProfileProvider` recupera y valida el perfil al iniciar y guarda los cambios en `localStorage`, clave `senaverse-student-profile-v1`, con `{ version: 1, displayName, bio, avatarId }`. Los datos dañados, versiones desconocidas, campos inválidos y avatares ajenos al catálogo recuperan valores iniciales seguros. Si el navegador bloquea el almacenamiento, la aplicación continúa en memoria y avisa que los cambios durarán solo durante la sesión.

El resumen lee `useStudentProgress()` y `summarizeProgress()`, igual que **Mi progreso**: XP, lecciones realmente completadas y número de insignias obtenidas. Consultar o editar el perfil no registra actividades ni concede recompensas. No se cambia la lógica de progreso.

**Exportar mis datos** descarga JSON con `schemaVersion: 2`, fecha, información personal validada, avatar, registros de progreso y resumen calculado por el sistema existente. Si hay foto, `profile.avatar` contiene `kind: 'photo'`, MIME, dimensiones y `dataUrl` Base64 de la imagen procesada y validada (máximo 192 KB antes de Base64); no contiene únicamente una referencia interna. Sin foto contiene `kind: 'preset'` e identificador. El respaldo es portátil para consulta y futuras herramientas; **no existe importación/restauración de estos archivos en la interfaz**. Si falta o está dañada la foto, la exportación avisa y permite reemplazarla o eliminarla antes de continuar. No se lee Dataset Studio ni muestras de entrenamiento.

**Restablecer perfil** pide confirmación, elimina el Blob de la foto y restaura nombre «Estudiante», biografía vacía y avatar «Saludo». Conserva XP, lecciones, insignias, preferencia de tema y Dataset Studio.

### Fotografías locales

`AvatarPicker` incorpora vista previa circular, zoom de 1× a 3× y encuadre horizontal/vertical mediante controles de rango accesibles. Se valida el contenido de JPG/JPEG, PNG y WebP mediante firma binaria y decodificación real del navegador, con límites de 5 MB, 24 megapíxeles y 12000 píxeles por lado. Cancelar descarta el recorte; cambiar a un avatar prediseñado elimina la foto anterior. «Eliminar foto» recupera el avatar prediseñado de respaldo.

`profilePhoto.ts` calcula una región cuadrada y usa canvas nativo de 256 × 256, suavizado de alta calidad y codificación WebP a calidad 0,9. Si WebP no está disponible, utiliza JPEG para imágenes opacas o PNG para conservar transparencia. La imagen se vuelve a codificar, sin conservar el archivo original ni sus metadatos EXIF, y se limita a 192 KB. No se instalan librerías de recorte.

`profilePhotoStore.ts` guarda el Blob en la base **`senaverse-profile-photos`**, almacén `photos`, completamente separada del dataset. El perfil v1 conserva el formato anterior y añade solo `photoId` cuando se usa una foto; `avatarId` sigue siendo el respaldo. Los perfiles anteriores se leen sin migración destructiva. Las referencias inválidas o remotas se descartan. Si IndexedDB está bloqueado, se muestra un error al guardar la foto; si el Blob falta o no se puede decodificar, se muestra el avatar prediseñado.

`StudentProfileProvider` distribuye una única URL local de Blob al encabezado y a Mi perfil. Las URLs se revocan al cambiar la foto o desmontar; los ImageBitmap se cierran y las selecciones pendientes se descartan al cancelar. Una escritura fallida de la referencia revierte el Blob nuevo; reemplazar o eliminar borra el anterior. El arranque elimina huérfanos antiguos de esta base, con un margen de cinco minutos que protege escrituras en curso de otras pestañas. La persistencia es exclusiva del navegador/dispositivo, sin sincronización entre dispositivos, servidores, MediaPipe ni entrenamiento.

Archivos de fotografías: `src/components/AvatarPicker.tsx/.css`, `StudentAvatar.tsx/.css`, `StudentProfileProvider.tsx`, `src/hooks/profileContext.ts`, `src/data/profile.ts`, `profilePhoto.ts`, `profilePhotoStore.ts`, `profileBackup.ts`, `src/pages/ProfilePage.tsx` y la integración del encabezado en `StudentLayout.tsx`. Las pruebas están en `scripts/profile-photo.test.mjs` y `profile-ui.test.mjs`; `brand-pixels.test.mjs` verifica píxeles blancos opacos, huecos, degradados y transparencia exterior en logo y favicon.

Archivos añadidos: `src/pages/ProfilePage.tsx` y `.css`, `src/data/profile.ts`, `src/hooks/profileContext.ts`, `src/components/StudentProfileProvider.tsx`, `src/components/StudentAvatar.tsx` y `.css`, y `scripts/profile.test.mjs` y `scripts/profile-ui.test.mjs`. Se integran mediante `src/App.tsx` y `src/components/StudentLayout.tsx`; el montaje de las pruebas de progreso usa también el proveedor del perfil.

Pruebas: `npm test`, `npm run lint` y `npm run build`. Los casos de perfil cubren validación, recuperación de almacenamiento corrupto o bloqueado, persistencia al montar de nuevo, avatares, valores reales compartidos con el encabezado, exportación versionada sin datos ajenos y restablecimiento sin modificar otras claves.

## Biblioteca de señas

La ruta `/biblioteca` incluye búsqueda sin distinción de tildes, filtros por categoría, seis tarjetas por página y marcadores guardados en este navegador. En **Más → Guardadas** se consultan las palabras marcadas.

El catálogo de muestra y los recursos se configuran en `src/data/library.ts`. Puedes añadir estos campos a cada entrada:

```ts
thumbnailSrc: '/images/biblioteca/hola.webp',
videoSrc: '/videos/biblioteca/hola.mp4',
captionsSrc: '/videos/biblioteca/hola.es.vtt', // Subtítulos opcionales.
```

Guarda los archivos en las carpetas correspondientes dentro de `public/`. Las tarjetas usan ilustraciones decorativas mientras no haya imágenes. **Ver seña** abre una ficha; cuando incorporas `videoSrc`, muestra el reproductor. Hasta entonces, indica que el video estará disponible próximamente. Añade demostraciones de LSP revisadas para el contenido educativo.

---

## Notas de la plantilla de Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
