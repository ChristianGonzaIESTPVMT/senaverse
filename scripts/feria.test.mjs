import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fairBrowserArguments, fairManifest, findFairBrowser, parseFairOptions, readFairBuild, serveFairBuild, sha256 } from './servidor-feria.mjs';

const html = '<script type="module" src="/assets/index-abcdefgh.js"></script><link rel="stylesheet" href="/assets/index-abcdefgh.css">';
const required = [
  'favicon.png', 'icons.svg', 'images/logo-senaverse.png', 'fonts/nunito-latin-variable.ttf',
  'models/lsp-v1.json', 'models/hand_landmarker.task', 'mediapipe/wasm/version.json',
  'mediapipe/wasm/vision_wasm_internal.js', 'mediapipe/wasm/vision_wasm_internal.wasm',
  'mediapipe/wasm/vision_wasm_module_internal.js', 'mediapipe/wasm/vision_wasm_module_internal.wasm',
  'assets/index-abcdefgh.js', 'assets/index-abcdefgh.css', 'assets/handDetection.worker-abcdefgh.js',
];

async function fixture(t) {
  const base = await realpath(tmpdir());
  const root = await realpath(await mkdtemp(join(base, 'senaverse-feria-test-')));
  assert.match(relative(base, root), /^senaverse-feria-test-[^/\\]+$/);
  t.after(() => rm(root, { recursive: true, force: true }));
  const files = { 'index.html': html, ...Object.fromEntries(required.map(name => [name, name])) };
  for (const [name, content] of Object.entries(files)) {
    const path = join(root, 'dist', name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  return { root, files };
}

test('la versión de feria comprueba su inventario y el SHA-256 de cada recurso', async t => {
  const { root, files } = await fixture(t);
  await writeFile(join(root, fairManifest), JSON.stringify({ schema: 1, files: Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, sha256(content)]),
  ) }));
  assert.equal((await readFairBuild(root)).size, Object.keys(files).length);
  await writeFile(join(root, 'dist', 'models', 'lsp-v1.json'), 'alterado');
  await assert.rejects(readFairBuild(root), /SHA-256.*lsp-v1/);
});

test('el lanzador identifica una compilación ausente, incompleta o con archivos ajenos', async t => {
  const { root } = await fixture(t);
  await assert.rejects(readFairBuild(join(root, 'ausente')), /Falta dist/);
  const unexpected = join(root, 'dist', 'models', 'dataset.json');
  await writeFile(unexpected, '{}');
  await assert.rejects(readFairBuild(root), /Archivo no esperado.*dataset/);
  await rm(unexpected);
  await rm(join(root, 'dist', 'assets', 'index-abcdefgh.js'));
  await assert.rejects(readFairBuild(root), /incompleto/);
  await rm(join(root, 'dist', 'models', 'hand_landmarker.task'));
  await assert.rejects(readFairBuild(root), /Falta dist\/models\/hand_landmarker\.task/);
});

test('producción sirve recursos y enlaces educativos por loopback y excluye archivos privados', async t => {
  const { root } = await fixture(t);
  const server = await serveFairBuild(await readFairBuild(root), 0);
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const { address, port } = server.address();
  assert.equal(address, '127.0.0.1');
  const origin = `http://${address}:${port}`;
  const deepLink = await fetch(`${origin}/academia/unidad/2/leccion/numeros`, { headers: { Accept: 'text/html' } });
  assert.equal(deepLink.status, 200);
  assert.equal(await deepLink.text(), html);
  const wasm = await fetch(`${origin}/mediapipe/wasm/vision_wasm_internal.wasm`, { method: 'HEAD' });
  assert.equal(wasm.status, 200);
  assert.equal(wasm.headers.get('Content-Type'), 'application/wasm');
  assert.equal(await wasm.text(), '');
  const model = await fetch(`${origin}/models/lsp-v1.json`);
  assert.equal(model.headers.get('Content-Type'), 'application/json');
  assert.equal(await model.text(), 'models/lsp-v1.json');
  for (const path of ['.git/config', 'src/App.tsx', 'ml/datasets/original.json', 'herramientas/dataset',
    'herramientas/reconocimiento', 'academia/archivo.js', '__senaverse/recognition-v1.json', 'VERSION-FERIA.json']) {
    const response = await fetch(`${origin}/${path}`, { headers: { Accept: 'text/html' } });
    assert.equal(response.status, 404, path);
    await response.text();
  }
  const post = await fetch(origin, { method: 'POST' });
  assert.equal(post.status, 405);
  await post.text();
  const alternate = request(origin, { headers: { Host: `localhost:${port}` } });
  const responseEvent = once(alternate, 'response');
  alternate.end();
  const [response] = await responseEvent;
  assert.equal(response.statusCode, 400);
  response.resume();
  await assert.rejects(serveFairBuild(new Map(), port), { code: 'EADDRINUSE' });
});

test('el servidor local entrega fotos y permite saltar a un tramo de video', async t => {
  const { root } = await fixture(t);
  const directory = join(root, 'dist', 'media', 'signs');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'lsp-001-uno.jpeg'), 'photo');
  await writeFile(join(directory, 'lsp-001-uno.mp4'), '0123456789');
  const server = await serveFairBuild(await readFairBuild(root), 0);
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const origin = `http://127.0.0.1:${server.address().port}/media/signs/`;
  const photo = await fetch(origin + 'lsp-001-uno.jpeg');
  assert.equal(photo.headers.get('Content-Type'), 'image/jpeg');
  assert.equal(await photo.text(), 'photo');
  const video = origin + 'lsp-001-uno.mp4';
  const head = await fetch(video, { method: 'HEAD' });
  assert.equal(head.headers.get('Content-Type'), 'video/mp4');
  assert.equal(head.headers.get('Accept-Ranges'), 'bytes');
  for (const [range, contentRange, expected] of [['bytes=2-5', 'bytes 2-5/10', '2345'],
    ['bytes=8-', 'bytes 8-9/10', '89'], ['bytes=-3', 'bytes 7-9/10', '789']]) {
    const response = await fetch(video, { headers: { Range: range } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Range'), contentRange);
    assert.equal(await response.text(), expected);
  }
  const invalid = await fetch(video, { headers: { Range: 'bytes=10-' } });
  assert.equal(invalid.status, 416);
  assert.equal(invalid.headers.get('Content-Range'), 'bytes */10');
  await invalid.text();
  await writeFile(join(directory, 'video-privado.mp4'), 'private');
  await assert.rejects(readFairBuild(root), /Archivo no esperado.*video-privado/);
});

test('el servidor local entrega ilustraciones WebP y rechaza un dataset en su carpeta', async t => {
  const { root } = await fixture(t);
  const asset = 'images/illustrations/cabeceras/cabecera-presentacion.webp';
  const destination = join(root, 'dist', asset);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, 'illustration');
  const server = await serveFairBuild(await readFairBuild(root), 0);
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/${asset}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/webp');
  assert.equal(await response.text(), 'illustration');
  await writeFile(join(dirname(destination), 'dataset.json'), '{}');
  await assert.rejects(readFairBuild(root), /Archivo no esperado.*dataset/);
  await rm(join(dirname(destination), 'dataset.json'));
  await writeFile(join(dirname(destination), 'cabecera-privada.webp'), 'private');
  await assert.rejects(readFairBuild(root), /Archivo no esperado.*cabecera-privada/);
});

test('las opciones aíslan el perfil de exposición y permiten ejecutar un ensayo', () => {
  assert.deepEqual(parseFairOptions([]), { port: 4173, profile: 'feria', browser: 'auto', verify: false, open: true });
  assert.deepEqual(parseFairOptions(['--puerto=4174', '--perfil=ensayo', '--navegador=chrome', '--verificar', '--solo-servidor']),
    { port: 4174, profile: 'ensayo', browser: 'chrome', verify: true, open: false });
  assert.throws(() => parseFairOptions(['--perfil=../personal']), /Opción inválida/);
  assert.throws(() => parseFairOptions(['--puerto=65536']), /puerto debe estar/);
  const executable = join('Apps', 'Google', 'Chrome', 'Application', 'chrome.exe');
  assert.deepEqual(findFairBrowser('auto', { ProgramFiles: 'Apps' }, path => path === executable), { product: 'chrome', executable });
  assert.equal(findFairBrowser('edge', { ProgramFiles: 'Apps' }, path => path === executable), undefined);
  const profile = join('Perfil local', 'SenaVerse', 'Perfiles', 'chrome', 'demo-ensayo');
  assert.deepEqual(fairBrowserArguments(profile, 'http://127.0.0.1:4174/'),
    [`--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--new-window', 'http://127.0.0.1:4174/']);
});
