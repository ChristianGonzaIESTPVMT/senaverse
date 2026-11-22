import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { createServer } from 'vite';

// Exercise the application's initialization lifecycle without requesting a real webcam.
const runtimeKey = '__senaverseHandLandmarkerTestRuntime';
const tempRoot = await realpath(tmpdir());
const directory = await realpath(await mkdtemp(join(tempRoot, 'senaverse-hand-test-')));
assert.match(relative(tempRoot, directory), /^senaverse-hand-test-[^/\\]+$/);
const server = await createServer({ configFile: false, cacheDir: join(directory, 'ssr'), server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom',
  ssr: { noExternal: ['@mediapipe/tasks-vision'] },
  plugins: [{ name: 'hand-landmarker-test-runtime', enforce: 'pre',
    resolveId(id) {
      if (id === '@mediapipe/tasks-vision') return '\0hand-landmarker-test-runtime';
    },
    load(id) {
      if (id === '\0hand-landmarker-test-runtime') return `
        export const FilesetResolver = { forVisionTasks: (...args) => globalThis.${runtimeKey}.resolveFiles(...args) };
        export const HandLandmarker = { createFromOptions: (...args) => globalThis.${runtimeKey}.create(...args) };
      `;
    },
  }],
});
after(async () => {
  try { await server.close(); }
  finally {
    delete globalThis[runtimeKey]; delete globalThis.__senaverseTestWasmFactory; delete globalThis.ModuleFactory;
    await rm(directory, { recursive: true, force: true, maxRetries: 3 });
  }
});
const { createHandLandmarker, closeHandLandmarker } = await server.ssrLoadModule('/src/features/sign-recognition/handLandmarker.ts');

function configureRuntime(create) {
  const calls = [];
  const files = { wasmLoaderPath: '/mediapipe/wasm/vision_wasm_internal.js', wasmBinaryPath: '/mediapipe/wasm/vision_wasm_internal.wasm' };
  globalThis[runtimeKey] = {
    resolveFiles: async (path, moduleLoader) => { calls.push({ type: 'files', path, moduleLoader }); return moduleLoader ? { ...files, wasmLoaderPath: new URL('./fixtures/wasm-factory.mjs', import.meta.url).href } : files; },
    create: async (input, options) => { calls.push({ type: 'create', input, options }); return create(options); },
  };
  return { calls, files };
}

const controller = () => new AbortController();

test('initialization uses local resources, VIDEO, two hands and GPU first', async () => {
  const detector = { close() {} };
  const { calls, files } = configureRuntime(() => detector);
  const actual = await createHandLandmarker(controller().signal);
  assert.equal(actual.detector, detector);
  assert.equal(actual.delegate, 'GPU');
  assert.equal(calls[0].path, '/mediapipe/wasm');
  const call = calls.find(item => item.type === 'create');
  assert.equal(call.input, files);
  assert.equal(call.options.baseOptions.modelAssetPath, '/models/hand_landmarker.task');
  assert.equal(call.options.baseOptions.delegate, 'GPU');
  assert.equal(call.options.runningMode, 'VIDEO');
  assert.equal(call.options.numHands, 2);
  closeHandLandmarker(actual.detector);
});

test('a GPU initialization failure falls back to CPU with identical thresholds', async () => {
  const detector = { close() {} };
  const { calls } = configureRuntime(options => {
    if (options.baseOptions.delegate === 'GPU') throw new Error('No WebGL');
    return detector;
  });
  const actual = await createHandLandmarker(controller().signal);
  assert.equal(actual.detector, detector);
  assert.equal(actual.delegate, 'CPU');
  const creation = calls.filter(item => item.type === 'create');
  assert.deepEqual(creation.map(item => item.options.baseOptions.delegate), ['GPU', 'CPU']);
  for (const item of creation) for (const key of ['minHandDetectionConfidence', 'minHandPresenceConfidence', 'minTrackingConfidence']) assert.equal(item.options[key], .5);
});

test('failure of both delegates preserves GPU and CPU evidence instead of a generic initialization error', async () => {
  configureRuntime(options => { throw new Error(options.baseOptions.delegate === 'GPU' ? 'GPU context unavailable' : 'CPU WASM unavailable'); });
  await assert.rejects(createHandLandmarker(controller().signal), error => /GPU: GPU context unavailable/.test(error.message) && /CPU: CPU WASM unavailable/.test(error.message));
});

test('initializations remain serialized across rapid remounts', async () => {
  let resolveFirst;
  let enteredFirst;
  const entered = new Promise(resolve => { enteredFirst = resolve; });
  let created = 0;
  const { calls } = configureRuntime(() => ++created === 1 ? new Promise(resolve => { resolveFirst = resolve; enteredFirst(); }) : { close() {} });
  const first = createHandLandmarker(controller().signal);
  const second = createHandLandmarker(controller().signal);
  await entered;
  assert.equal(calls.filter(item => item.type === 'create').length, 1);
  resolveFirst({ close() {} });
  closeHandLandmarker((await first).detector);
  closeHandLandmarker((await second).detector);
  assert.equal(calls.filter(item => item.type === 'create').length, 2);
});

test('aborted loading closes a late model and does not initialize a CPU fallback', async () => {
  let resolveModel, closed = 0;
  let enteredModel;
  const entered = new Promise(resolve => { enteredModel = resolve; });
  const { calls } = configureRuntime(() => new Promise(resolve => { resolveModel = resolve; enteredModel(); }));
  const abort = controller();
  const loading = createHandLandmarker(abort.signal);
  await entered;
  abort.abort();
  resolveModel({ close() { closed += 1; } });
  await assert.rejects(loading, { name: 'AbortError' });
  assert.equal(closed, 1);
  assert.equal(calls.filter(item => item.type === 'create').length, 1);
});

test('queued aborted requests do not initialize any model, and failures leave retries usable', async () => {
  const { calls } = configureRuntime(() => { throw new Error('Missing model'); });
  const aborted = controller(); aborted.abort();
  await assert.rejects(createHandLandmarker(aborted.signal), { name: 'AbortError' });
  assert.equal(calls.length, 0);
  await assert.rejects(createHandLandmarker(controller().signal), /Missing model/);
  const detector = { close() {} };
  configureRuntime(() => detector);
  assert.equal((await createHandLandmarker(controller().signal)).detector, detector);
});

test('module-worker loader restores its cached WASM factory before CPU fallback', async () => {
  const factory = () => {};
  globalThis.__senaverseTestWasmFactory = factory;
  const detector = { close() {} };
  const { calls } = configureRuntime(options => {
    assert.equal(globalThis.ModuleFactory, factory);
    globalThis.ModuleFactory = undefined;
    if (options.baseOptions.delegate === 'GPU') throw new Error('GPU unavailable');
    return detector;
  });
  const actual = await createHandLandmarker(controller().signal, { moduleLoader: true, profile: 'tracking-040' });
  assert.equal(actual.delegate, 'CPU');
  assert.equal(actual.detector, detector);
  assert.equal(calls[0].moduleLoader, true);
  assert.ok(calls.filter(item => item.type === 'create').every(item => item.options.minTrackingConfidence === .4));
});

test('the actual Worker handler sends the initialization phase and underlying failure to the interface', async () => {
  const previousSelf = globalThis.self;
  const previousCanvas = globalThis.OffscreenCanvas;
  let receive;
  const response = new Promise(resolve => { receive = resolve; });
  const scope = { onmessage: null, postMessage: message => receive(message), close() {} };
  globalThis.self = scope;
  globalThis.OffscreenCanvas = class {};
  configureRuntime(() => { throw new Error('model graph failed'); });
  try {
    await server.ssrLoadModule('/src/features/sign-recognition/handDetection.worker.ts?initialization-failure');
    scope.onmessage({ data: { type: 'init', profile: 'baseline', assets: { model: '/models/hand_landmarker.task', wasm: '/mediapipe/wasm' } } });
    const failure = await response;
    assert.equal(failure.type, 'error');
    assert.equal(failure.phase, 'initialization');
    assert.match(failure.message, /GPU: model graph failed; CPU: model graph failed/);
  } finally {
    if (previousSelf === undefined) delete globalThis.self; else globalThis.self = previousSelf;
    if (previousCanvas === undefined) delete globalThis.OffscreenCanvas; else globalThis.OffscreenCanvas = previousCanvas;
  }
});

test('worker handler enforces increasing timestamps, closes bitmaps and disposes its detector', async () => {
  const previousSelf = globalThis.self;
  const previousCanvas = globalThis.OffscreenCanvas;
  let closeCount = 0, bitmapCloses = 0, workerClosed = 0, signalReady;
  const ready = new Promise(resolve => { signalReady = resolve; });
  const messages = [];
  const scope = { onmessage: null, postMessage(message) { messages.push(message); if (message.type === 'ready') signalReady(); }, close() { workerClosed++; } };
  globalThis.self = scope;
  globalThis.OffscreenCanvas = class { constructor(width, height) { this.width = width; this.height = height; } };
  configureRuntime(() => ({ close() { closeCount++; }, detectForVideo: () => ({ landmarks: [], worldLandmarks: [], handedness: [], handednesses: [] }) }));
  try {
    await server.ssrLoadModule('/src/features/sign-recognition/handDetection.worker.ts');
    scope.onmessage({ data: { type: 'init', profile: 'baseline', assets: { model: '/models/hand_landmarker.task', wasm: '/mediapipe/wasm' } } });
    await ready;
    const frame = () => ({ close() { bitmapCloses++; } });
    scope.onmessage({ data: { type: 'frame', id: 1, timestamp: 10, frame: frame() } });
    scope.onmessage({ data: { type: 'frame', id: 2, timestamp: 10, frame: frame() } });
    assert.equal(messages.filter(message => message.type === 'result').length, 1);
    assert.equal(messages.filter(message => message.type === 'error').length, 1);
    assert.equal(bitmapCloses, 2);
    scope.onmessage({ data: { type: 'dispose' } });
    assert.equal(closeCount, 1);
    assert.equal(workerClosed, 1);
    assert.equal(messages.at(-1).type, 'disposed');
  } finally {
    if (previousSelf === undefined) delete globalThis.self; else globalThis.self = previousSelf;
    if (previousCanvas === undefined) delete globalThis.OffscreenCanvas; else globalThis.OffscreenCanvas = previousCanvas;
  }
});

test('the application and local model/WASM load over HTTP under a production subpath', async () => {
  const app = await createServer({ base: '/senaverse/', cacheDir: join(directory, 'http'), optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '127.0.0.1', port: 0, hmr: false, ws: false } });
  try {
    await app.listen();
    const origin = `http://127.0.0.1:${app.httpServer.address().port}`;
    const page = await fetch(`${origin}/senaverse/camara/libre`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /src="\/senaverse\/src\/main.tsx"/);
    const component = await fetch(`${origin}/senaverse/src/components/PracticeCamera.tsx`);
    assert.equal(component.status, 200);
    assert.match(await component.text(), /useHandDetection/);
    const model = await fetch(`${origin}/senaverse/models/hand_landmarker.task`, { method: 'HEAD' });
    assert.equal(model.status, 200);
    assert.equal(Number(model.headers.get('content-length')), 7819105);
    const classifier = await fetch(`${origin}/senaverse/models/lsp-v1.json`);
    assert.equal(classifier.status, 200);
    assert.equal((await classifier.json()).outputDimensions, 10);
    const wasm = await fetch(`${origin}/senaverse/mediapipe/wasm/vision_wasm_internal.wasm`, { method: 'HEAD' });
    assert.equal(wasm.status, 200);
    assert.match(wasm.headers.get('content-type'), /application\/wasm/);
    const loader = await fetch(`${origin}/senaverse/mediapipe/wasm/vision_wasm_internal.js`, { method: 'HEAD' });
    assert.equal(loader.status, 200);
    assert.match(loader.headers.get('content-type'), /javascript/);
  } finally { await app.close(); }
});
