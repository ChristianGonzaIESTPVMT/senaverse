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

El inicio usa el progreso demostrativo existente, guardado en el navegador, y calcula 80 XP ilustrativos por lección completada. La tipografía Nunito está alojada en `public/fonts/` con su licencia OFL.

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
