import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { createElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { createServer, loadEnv } from 'vite';

const flagName = 'VITE_ENABLE_DATA_COLLECTION';
const route = '/herramientas/dataset';
const studentPages = [
  ['/', /¡Bienvenido a/], ['/academia', /Mi ruta de aprendizaje/],
  ['/biblioteca', /Biblioteca de señas/], ['/camara', /Centro de práctica/],
  ['/camara/libre', /<video/], ['/simulador', /Simulador de situaciones/],
  ['/progreso', /<h1>Mi progreso<\/h1>/], ['/perfil', /<h1>Mi perfil<\/h1>/],
];

async function withEnvironment(work) {
  const directory = await mkdtemp(join(tmpdir(), 'senaverse-dataset-access-'));
  const original = process.env[flagName];
  delete process.env[flagName];
  try { return await work(directory); }
  finally {
    if (original === undefined) delete process.env[flagName]; else process.env[flagName] = original;
    // Only remove the known files created in this unique fixture directory.
    for (const file of ['.env.example', '.env.development.local']) await unlink(join(directory, file)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await rmdir(directory);
  }
}

/** Exercise the real BrowserRouter route selection with an isolated URL/history during SSR.
 * No browser, effects, webcam, user storage, or IndexedDB are involved in this helper. */
async function renderAppAt(App, pathname) {
  const originals = new Map(['document', 'window', 'localStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const location = new URL(pathname, 'http://localhost:5173');
  const history = { state: { idx: 0 }, replaceState(state) { this.state = state; } };
  const browserWindow = { location, history };
  const document = { defaultView: browserWindow };
  browserWindow.document = document;
  for (const [key, value] of Object.entries({ document, window: browserWindow, localStorage: { getItem: () => null } })) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  try {
    return await new Promise((resolve, reject) => {
      const output = new PassThrough();
      const chunks = [];
      output.on('data', chunk => chunks.push(chunk));
      output.on('error', reject);
      output.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      const rendering = renderToPipeableStream(createElement(App), {
        onAllReady() { rendering.pipe(output); }, onShellError: reject, onError: reject,
      });
    });
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
}

async function withApp(directory, work) {
  const server = await createServer({
    envDir: directory,
    // Avoid sharing the SSR-test optimizer cache with the other test processes.
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '127.0.0.1', port: 0, hmr: false, ws: false },
  });
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    const { default: App } = await server.ssrLoadModule('/src/App.tsx');
    return await work({ server, origin, App });
  } finally { await server.close(); }
}

test('Vite ignores .env.example, reads development.local, isolates production and respects explicit false', async () => {
  await withEnvironment(async directory => {
    await writeFile(join(directory, '.env.example'), `${flagName}=true\n`);
    assert.equal(loadEnv('development', directory, flagName)[flagName], undefined);
    await writeFile(join(directory, '.env.development.local'), `${flagName}=true\n`);
    assert.equal(loadEnv('development', directory, flagName)[flagName], 'true');
    assert.equal(loadEnv('production', directory, flagName)[flagName], undefined);
    process.env[flagName] = 'false';
    assert.equal(loadEnv('development', directory, flagName)[flagName], 'false');
    delete process.env[flagName];
    await writeFile(join(directory, '.env.development.local'), `${flagName}=false\n`);
    assert.equal(loadEnv('development', directory, flagName)[flagName], 'false');
  });
});

test('enabled development flag serves direct/repeated requests and the actual App selects Dataset Studio', async () => {
  await withEnvironment(async directory => {
    await writeFile(join(directory, '.env.development.local'), `${flagName}=true\n`);
    await withApp(directory, async ({ server, origin, App }) => {
      assert.equal(server.config.env[flagName], 'true');
      for (let attempt = 0; attempt < 2; attempt++) {
        const page = await fetch(`${origin}${route}`);
        assert.equal(page.status, 200);
        assert.equal(page.redirected, false);
        assert.equal(page.headers.get('location'), null);
        assert.match(await page.text(), /src="\/src\/main.tsx"/);
        const html = await renderAppAt(App, route);
        assert.match(html, /<h1>SeñaVerse Dataset Studio<\/h1>/);
        assert.match(html, /Abriendo el dataset local/);
        assert.doesNotMatch(html, /app-sidebar|¡Bienvenido a/);
      }
      const appModule = await fetch(`${origin}/src/App.tsx`);
      assert.equal(appModule.status, 200);
      assert.match(await appModule.text(), /"VITE_ENABLE_DATA_COLLECTION"\s*:\s*"true"/);
      for (const [path, content] of studentPages) {
        const html = await renderAppAt(App, path);
        assert.match(html, content, path);
        assert.doesNotMatch(html, /href="\/herramientas\/dataset"/, path);
      }
    });
  });
});

test('false or absent runtime flags leave Dataset Studio unregistered and keep student routes functional', async () => {
  for (const flag of ['false', undefined]) {
    await withEnvironment(async directory => {
      await writeFile(join(directory, '.env.example'), `${flagName}=true\n`);
      if (flag !== undefined) await writeFile(join(directory, '.env.development.local'), `${flagName}=${flag}\n`);
      await withApp(directory, async ({ server, App }) => {
        assert.equal(server.config.env[flagName], flag);
        // Navigate renders no markup in SSR; in the client, the existing wildcard redirects to '/'.
        assert.equal(await renderAppAt(App, route), '');
        for (const [path, content] of studentPages) assert.match(await renderAppAt(App, path), content, `${flag}: ${path}`);
      });
    });
  }
});
