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
