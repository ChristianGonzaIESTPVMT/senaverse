import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import { CAMERA_VIDEO_CONSTRAINTS, HAND_LANDMARKER_OPTIONS, MAX_DETECTION_FPS, getHandLandmarkerAssets, getHandLandmarkerOptions } from '../src/features/sign-recognition/config.ts';
import { HandTrackingContinuity } from '../src/features/sign-recognition/trackingContinuity.ts';
import { HandPerformanceMetrics } from '../src/features/sign-recognition/performanceMetrics.ts';
import { connectHandWorker, getProcessingSize } from '../src/features/sign-recognition/inferenceBackend.ts';
import { createHandFrameScheduler } from '../src/features/sign-recognition/detectionSession.ts';
import { HAND_CONNECTIONS, drawHandLandmarks, getCoverGeometry } from '../src/features/sign-recognition/drawHandLandmarks.ts';
import { startHandDetection } from '../src/features/sign-recognition/detectionSession.ts';
import { handDetectionMessage } from '../src/features/sign-recognition/types.ts';

const flush = () => new Promise(resolve => setImmediate(resolve));
const result = count => ({ landmarks: Array.from({ length: count }, () => Array.from({ length: 21 }, (_, i) => ({ x: .2 + i / 100, y: .3 + i / 100, z: 0 }))), worldLandmarks: [], handedness: [], handednesses: [] });

function canvasFixture() {
  const calls = [];
  const context = {};
  for (const method of ['save', 'restore', 'setTransform', 'clearRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'arc', 'fill']) context[method] = (...args) => calls.push({ method, args });
  const bounds = { width: 640, height: 480 };
  const canvas = { width: 0, height: 0, getContext: () => context, getBoundingClientRect: () => bounds };
  return { canvas, bounds, calls };
}

const activeSessions = [];
afterEach(() => { for (const session of activeSessions.splice(0)) session.stop(); });

function sessionFixture(createBackend, extras = {}) {
  const drawing = canvasFixture();
  const video = { videoWidth: 1280, videoHeight: 720, readyState: 4, paused: false, currentTime: 0 };
  const callbacks = new Map();
  const states = [], results = [], detections = [];
  let closed = 0, id = 0, time = 0, nextResult = result(0);
  const backend = { kind: 'worker', delegate: 'GPU', infer: async (input, timestamp) => { detections.push({ input, timestamp }); input.close(); return { result: nextResult, inferenceMs: 10 }; }, close: () => { closed += 1; } };
  const session = startHandDetection({ video, canvas: drawing.canvas, onState: value => states.push(value), onResult: value => results.push(value),
    createBackend: createBackend ?? (() => Promise.resolve(backend)),
    captureFrame: async () => ({ width: 640, height: 360, close() {}, mediaTime: video.currentTime }),
    scheduler: { request: callback => { callbacks.set(++id, callback); return id; }, cancel: frame => callbacks.delete(frame), now: () => time },
    ...extras,
  });
  activeSessions.push(session);
  function tick(timestamp, currentTime = video.currentTime) {
    time = timestamp;
    video.currentTime = currentTime;
    const [frame, callback] = callbacks.entries().next().value;
    callbacks.delete(frame);
    callback(timestamp, { mediaTime: currentTime });
  }
  return { ...drawing, video, states, results, detections, callbacks, session, backend, tick, setTime: value => { time = value; }, closed: () => closed, setResult: value => { nextResult = value; } };
}

test('configuration uses VIDEO, two hands and the requested unchanged thresholds', () => {
  assert.deepEqual(HAND_LANDMARKER_OPTIONS, { runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5 });
  assert.equal(MAX_DETECTION_FPS, 30);
  assert.deepEqual(getHandLandmarkerAssets('/senaverse/'), { model: '/senaverse/models/hand_landmarker.task', wasm: '/senaverse/mediapipe/wasm' });
  assert.equal(getHandLandmarkerAssets('/').model, '/models/hand_landmarker.task');
  assert.equal(getHandLandmarkerAssets('/subpath').wasm, '/subpath/mediapipe/wasm');
});

test('all detection messages distinguish loading, searching, one/two hands, loss and detector error', () => {
  assert.equal(handDetectionMessage({ status: 'idle', handCount: 0 }), 'Activa tu cámara para detectar tus manos');
  assert.equal(handDetectionMessage({ status: 'loading', handCount: 0 }), 'Inicializando detector de manos...');
  assert.equal(handDetectionMessage({ status: 'searching', handCount: 0 }), 'Buscando manos...');
  assert.equal(handDetectionMessage({ status: 'detected', handCount: 1 }), '1 mano detectada');
  assert.equal(handDetectionMessage({ status: 'detected', handCount: 2 }), '2 manos detectadas');
  assert.equal(handDetectionMessage({ status: 'lost', handCount: 0 }), 'Seguimiento temporalmente perdido');
  assert.equal(handDetectionMessage({ status: 'out-of-frame', handCount: 0 }), 'No hay manos visibles en el encuadre');
  assert.match(handDetectionMessage({ status: 'error', handCount: 0 }), /No se pudo inicializar el detector/);
});

test('cover geometry follows the video crop without mirroring model coordinates', () => {
  const cover = getCoverGeometry(640, 480, 1280, 720);
  assert.equal(cover.height, 480);
  assert.ok(Math.abs(cover.width - 853.3333333333333) < .001);
  assert.ok(Math.abs(cover.x + 106.66666666666663) < .001);
  assert.equal(cover.y, 0);
  assert.equal(cover.x + cover.width * .5, 320);
  const portrait = getCoverGeometry(320, 240, 720, 1280);
  assert.equal(portrait.width, 320);
  assert.ok(portrait.y < 0);
});

test('drawing renders 21 points and all wrist/finger connections per hand and resizes', () => {
  const fixture = canvasFixture();
  const video = { videoWidth: 1280, videoHeight: 720 };
  drawHandLandmarks(fixture.canvas, video, result(2));
  assert.equal(fixture.calls.filter(call => call.method === 'arc').length, 42);
  assert.equal(fixture.calls.filter(call => call.method === 'lineTo').length, HAND_CONNECTIONS.length * 2);
  assert.equal(HAND_CONNECTIONS.length, 21);
  assert.ok(HAND_CONNECTIONS.some(([start, end]) => start === 0 && end === 17));
  const firstPoint = fixture.calls.find(call => call.method === 'arc').args;
  const cover = getCoverGeometry(640, 480, 1280, 720);
  assert.ok(Math.abs(firstPoint[0] - (cover.x + cover.width * .2)) < .001);
  fixture.bounds.width = 320; fixture.bounds.height = 240;
  drawHandLandmarks(fixture.canvas, video, result(1));
  assert.equal(fixture.canvas.width, 320);
  assert.equal(fixture.canvas.height, 240);
});

test('an empty detection clears previous landmarks and draws no points', () => {
  const fixture = canvasFixture();
  drawHandLandmarks(fixture.canvas, { videoWidth: 1280, videoHeight: 720 }, result(0));
  assert.ok(fixture.calls.some(call => call.method === 'clearRect'));
  assert.equal(fixture.calls.filter(call => call.method === 'arc').length, 0);
});

test('detection transitions through one hand, two hands and lost hands on new frames', async () => {
  const fixture = sessionFixture();
  await flush();
  assert.deepEqual(fixture.states.map(value => value.status), ['loading', 'searching']);
  fixture.setResult(result(1)); fixture.tick(0);
  await flush();
  assert.deepEqual(fixture.states.at(-1), { status: 'detected', handCount: 1 });
  fixture.setResult(result(2)); fixture.tick(50, .05);
  await flush();
  assert.deepEqual(fixture.states.at(-1), { status: 'detected', handCount: 2 });
  fixture.setResult(result(0)); fixture.tick(100, .1);
  await flush();
  assert.deepEqual(fixture.states.at(-1), { status: 'lost', handCount: 0 });
  fixture.session.stop();
});

test('frames are not processed twice, paused video is skipped and frequency is limited', async () => {
  const fixture = sessionFixture();
  await flush();
  fixture.tick(0);
  await flush();
  fixture.tick(50); // Same frame, despite sufficient time.
  await flush();
  fixture.tick(60, .06);
  await flush();
  fixture.tick(65, .065); // New frame, but too soon.
  assert.equal(fixture.detections.length, 2);
  assert.equal(fixture.detections[0].input.mediaTime, 0);
  fixture.video.paused = true;
  fixture.tick(150, .15);
  assert.equal(fixture.detections.length, 2);
  fixture.session.stop();
});

test('stop cancels animation, closes exactly once, clears the canvas and results', async () => {
  const fixture = sessionFixture();
  await flush();
  fixture.tick(0);
  await flush();
  assert.equal(fixture.callbacks.size, 1);
  fixture.session.stop(); fixture.session.stop();
  assert.equal(fixture.callbacks.size, 0);
  assert.equal(fixture.closed(), 1);
  assert.equal(fixture.results.at(-1), null);
  assert.ok(fixture.calls.some(call => call.method === 'clearRect'));
});

test('cancelling during initialization closes late instances without starting a loop', async () => {
  let resolveDetector, signal;
  const fixture = sessionFixture(value => { signal = value; return new Promise(resolve => { resolveDetector = resolve; }); });
  fixture.session.stop();
  assert.equal(signal.aborted, true);
  resolveDetector(fixture.backend);
  await flush();
  assert.equal(fixture.closed(), 1);
  assert.equal(fixture.callbacks.size, 0);
  assert.deepEqual(fixture.states.map(value => value.status), ['loading']);
});

test('initialization failures report detector errors without scheduling inference', async () => {
  const fixture = sessionFixture(() => Promise.reject(new Error('Missing model')));
  await flush();
  assert.equal(fixture.states.at(-1).status, 'error');
  assert.equal(fixture.callbacks.size, 0);
  fixture.session.stop();
});

test('inference errors close resources and stop the animation loop', async () => {
  const fixture = sessionFixture();
  await flush();
  fixture.backend.infer = async () => { throw new Error('WebGL context lost'); };
  fixture.tick(0);
  await flush();
  assert.equal(fixture.states.at(-1).status, 'error');
  assert.equal(fixture.closed(), 1);
  assert.equal(fixture.callbacks.size, 0);
});

test('official pinned model and matching local WASM files are present', async () => {
  const model = await readFile(new URL('../public/models/hand_landmarker.task', import.meta.url));
  assert.equal(model.byteLength, 7819105);
  assert.equal(createHash('sha256').update(model).digest('hex'), 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1');
  const marker = JSON.parse(await readFile(new URL('../public/mediapipe/wasm/version.json', import.meta.url), 'utf8'));
  const dependency = JSON.parse(await readFile(new URL('../node_modules/@mediapipe/tasks-vision/package.json', import.meta.url), 'utf8'));
  assert.equal(marker.version, dependency.version);
  const wasm = await readFile(new URL('../public/mediapipe/wasm/vision_wasm_internal.wasm', import.meta.url));
  assert.deepEqual([...wasm.subarray(0, 4)], [0, 97, 115, 109]);
});

test('shared video and overlay use identical CSS mirrors; all three views reuse PracticeCamera', async () => {
  const css = await readFile(new URL('../src/pages/CameraPage.css', import.meta.url), 'utf8');
  assert.match(css, /\.practice-camera-preview video \{[^}]*object-fit: cover;[^}]*transform: scaleX\(-1\)/);
  assert.match(css, /\.practice-hand-overlay \{[^}]*transform: scaleX\(-1\)/);
  for (const path of ['pages/FreePracticePage.tsx', 'pages/SignChallengePage.tsx', 'components/SituationPracticeStep.tsx']) {
    assert.match(await readFile(new URL(`../src/${path}`, import.meta.url), 'utf8'), /<PracticeCamera/);
  }
});

test('threshold trials change only one value and keep the unverified baseline selected by default', () => {
  for (const [profile, changed, expected] of [['presence-045', 'minHandPresenceConfidence', .45], ['tracking-040', 'minTrackingConfidence', .4], ['tracking-035', 'minTrackingConfidence', .35]]) {
    const options = getHandLandmarkerOptions(profile);
    const differences = Object.keys(options).filter(key => options[key] !== HAND_LANDMARKER_OPTIONS[key]);
    assert.deepEqual(differences, [changed]);
    assert.equal(options[changed], expected);
    assert.equal(options.minHandDetectionConfidence, .5);
    assert.equal(options.numHands, 2);
  }
  assert.deepEqual(getHandLandmarkerOptions(), HAND_LANDMARKER_OPTIONS);
});

test('camera requests are ideals, and processing preserves aspect ratio within 640 x 480', () => {
  assert.deepEqual(CAMERA_VIDEO_CONSTRAINTS.width, { ideal: 640 });
  assert.deepEqual(CAMERA_VIDEO_CONSTRAINTS.height, { ideal: 480 });
  assert.deepEqual(CAMERA_VIDEO_CONSTRAINTS.frameRate, { ideal: 30 });
  assert.deepEqual(getProcessingSize(1280, 720), { width: 640, height: 360 });
  assert.deepEqual(getProcessingSize(640, 480), { width: 640, height: 480 });
  assert.deepEqual(getProcessingSize(720, 1280), { width: 270, height: 480 });
});

test('video frame callbacks are preferred and cancelled with the corresponding API', () => {
  let requested, cancelled;
  const video = { requestVideoFrameCallback: callback => { requested = callback; return 19; }, cancelVideoFrameCallback: id => { cancelled = id; } };
  const scheduler = createHandFrameScheduler(video);
  let frame;
  const id = scheduler.request((time, metadata) => { frame = { time, metadata }; });
  requested(100, { mediaTime: .1, presentedFrames: 3 });
  assert.equal(scheduler.source, 'video-callback');
  assert.equal(frame.metadata.mediaTime, .1);
  scheduler.cancel(id);
  assert.equal(cancelled, 19);
});

test('a brief empty result retains only real old points with an explicit loss state and strict expiry', () => {
  const continuity = new HandTrackingContinuity();
  const valid = result(1);
  continuity.observe(valid, 0, 10);
  const lost = continuity.observe(result(0), 33, 50);
  assert.equal(lost.result, valid);
  assert.equal(lost.state.status, 'lost');
  assert.equal(lost.state.handCount, 0);
  assert.equal(lost.opacity, .45);
  assert.equal(continuity.view(121).result, null);
  assert.equal(continuity.view(350).state.status, 'out-of-frame');
});

test('a partial two-to-one hand loss draws the fresh detected hand without inventing the missing hand', () => {
  const continuity = new HandTrackingContinuity();
  continuity.observe(result(2), 0, 5);
  const fresh = result(1);
  const view = continuity.observe(fresh, 40, 50);
  assert.equal(view.result, fresh);
  assert.equal(view.result.landmarks.length, 1);
  assert.equal(view.state.missingHands, 1);
  assert.equal(view.state.handCount, 1);
  assert.equal(continuity.observe(result(1), 350, 360).state.missingHands, undefined);
  assert.equal(continuity.observe(result(0), 390, 400).state.status, 'lost');
});

test('no landmarks are fabricated before detection, or after the age limit during a stalled stream', () => {
  const continuity = new HandTrackingContinuity();
  assert.equal(continuity.observe(result(0), 0, 0).result, null);
  assert.equal(continuity.view(1000).state.status, 'searching');
  continuity.observe(result(1), 1000, 1010);
  assert.equal(continuity.view(1121).result, null);
  assert.equal(continuity.view(1121).state.status, 'lost');
});

test('metrics measure actual event counts, latency and count-based recovery without initial invented FPS', () => {
  const metrics = new HandPerformanceMetrics(0);
  assert.equal(metrics.snapshot(0).cameraFps, null);
  assert.equal(metrics.snapshot(0).averageLatencyMs, null);
  for (let i = 0; i < 30; i++) metrics.cameraFrame(i * 1000 / 30, 1);
  for (let i = 0; i < 20; i++) metrics.inference(i * 50, 20, 10);
  metrics.inference(1000, 50, 30);
  metrics.hands(2, 0); metrics.hands(1, 100); metrics.hands(1, 200); metrics.hands(2, 250);
  const snapshot = metrics.snapshot(1000);
  assert.equal(snapshot.cameraFps, 30);
  assert.equal(snapshot.inferenceFps, 21);
  assert.equal(snapshot.maximumLatencyMs, 50);
  assert.equal(snapshot.averageLatencyMs, (20 * 20 + 50) / 21);
  assert.equal(snapshot.recoveryMs, 150);
  assert.equal(snapshot.detectionLosses, 1);
  assert.equal(metrics.snapshot(4000).cameraFps, 0);
});

test('only one inference is active and completion immediately captures the newest live frame', async () => {
  const fixture = sessionFixture();
  let finish;
  fixture.backend.infer = async (frame, timestamp) => {
    fixture.detections.push({ input: frame, timestamp });
    if (fixture.detections.length === 1) return new Promise(resolve => { finish = () => { frame.close(); resolve({ result: result(1), inferenceMs: 70 }); }; });
    frame.close(); return { result: result(1), inferenceMs: 10 };
  };
  await flush();
  fixture.tick(0, 0); await flush();
  fixture.tick(34, .034); fixture.tick(68, .068);
  assert.equal(fixture.detections.length, 1);
  fixture.setTime(70); finish(); await flush();
  assert.equal(fixture.detections.length, 2);
  assert.equal(fixture.detections[1].input.mediaTime, .068);
  assert.ok(fixture.detections[1].timestamp > fixture.detections[0].timestamp);
});

test('a capture overtaken by a new frame is closed and never sent for inference', async () => {
  let completeCapture, captureCount = 0, closed = 0;
  const fixture = sessionFixture(undefined, { captureFrame: video => ++captureCount === 1
    ? new Promise(resolve => { completeCapture = () => resolve({ width: 640, height: 480, close() { closed++; } }); })
    : Promise.resolve({ width: 640, height: 480, mediaTime: video.currentTime, close() {} }) });
  await flush();
  fixture.tick(0); fixture.tick(40, .04);
  completeCapture(); await flush();
  assert.equal(closed, 1);
  assert.equal(fixture.detections.length, 1);
  assert.equal(fixture.detections[0].input.mediaTime, .04);
});

test('late results and results arriving after stop cannot repaint an obsolete hand', async () => {
  const fixture = sessionFixture();
  let finish;
  fixture.backend.infer = () => new Promise(resolve => { finish = () => resolve({ result: result(2), inferenceMs: 200 }); });
  await flush();
  fixture.tick(0); await flush();
  fixture.setTime(200); finish(); await flush();
  assert.equal(fixture.states.some(state => state.status === 'detected'), false);
  fixture.tick(240, .24); await flush();
  fixture.session.stop(); finish(); await flush();
  assert.equal(fixture.states.some(state => state.status === 'detected'), false);
});

test('a capture completing after cancellation is released before inference', async () => {
  let finish, closed = 0;
  const fixture = sessionFixture(undefined, { captureFrame: () => new Promise(resolve => { finish = () => resolve({ width: 640, height: 480, close() { closed++; } }); }) });
  await flush(); fixture.tick(0);
  fixture.session.stop(); finish(); await flush();
  assert.equal(closed, 1);
  assert.equal(fixture.detections.length, 0);
});

test('diagnostics read negotiated camera settings and report the actual processing size', async () => {
  const snapshots = [];
  const fixture = sessionFixture(undefined, { onDiagnostics: snapshot => snapshots.push(snapshot) });
  fixture.video.srcObject = { getVideoTracks: () => [{ getSettings: () => ({ width: 1280, height: 720, frameRate: 29.97 }) }] };
  await flush(); fixture.tick(0); await flush();
  fixture.session.resetDiagnostics();
  const snapshot = snapshots.at(-1);
  assert.equal(snapshot.cameraWidth, 1280);
  assert.equal(snapshot.configuredCameraFps, 29.97);
  assert.equal(snapshot.processingWidth, 640);
  assert.equal(snapshot.processingHeight, 360);
  assert.equal(snapshot.backend, 'worker');
});

function workerFixture() {
  const messages = [];
  let terminated = 0;
  const worker = { postMessage: (message, transfer) => messages.push({ message, transfer }), terminate: () => { terminated++; }, onmessage: null, onerror: null, onmessageerror: null };
  const abort = new AbortController();
  const ready = connectHandWorker(worker, abort.signal, { profile: 'baseline' }, { model: '/models/hand_landmarker.task', wasm: '/mediapipe/wasm' });
  const emit = data => worker.onmessage?.({ data });
  return { worker, abort, messages, ready, emit, terminated: () => terminated };
}

test('worker transport rejects overlapping requests and ignores responses for a different frame', async () => {
  const fixture = workerFixture();
  fixture.emit({ type: 'ready', delegate: 'CPU' });
  const backend = await fixture.ready;
  let rejectedFrameClosed = 0;
  const frame = { width: 640, height: 480, close() {} };
  const first = backend.infer(frame, 10);
  await assert.rejects(backend.infer({ close() { rejectedFrameClosed++; } }, 11), /ocupado/);
  assert.equal(rejectedFrameClosed, 1);
  fixture.emit({ type: 'result', id: 90, timestamp: 9, result: result(0), inferenceMs: 1 });
  assert.equal(fixture.messages.filter(entry => entry.message.type === 'frame').length, 1);
  assert.equal(fixture.messages.at(-1).transfer[0], frame);
  fixture.emit({ type: 'result', id: 1, timestamp: 10, result: result(1), inferenceMs: 4 });
  assert.equal((await first).result.landmarks.length, 1);
  assert.equal(backend.delegate, 'CPU');
  backend.close(); fixture.emit({ type: 'disposed' });
  assert.equal(fixture.terminated(), 1);
});

test('worker cancellation rejects the in-flight promise and terminates immediately', async () => {
  const fixture = workerFixture();
  fixture.emit({ type: 'ready', delegate: 'GPU' });
  const backend = await fixture.ready;
  const inference = backend.infer({ close() {} }, 1);
  fixture.abort.abort();
  await assert.rejects(inference, { name: 'AbortError' });
  assert.equal(fixture.terminated(), 1);
  backend.close(); assert.equal(fixture.terminated(), 1);
});

test('worker initialization failure terminates the failed worker and exposes the error', async () => {
  const fixture = workerFixture();
  fixture.emit({ type: 'error', message: 'WASM unavailable' });
  await assert.rejects(fixture.ready, /WASM unavailable/);
  assert.equal(fixture.terminated(), 1);
});

test('fresh-inference subscribers receive each accepted Worker result once, never retained points or redraws', async () => {
  const observations = [];
  const fixture = sessionFixture(undefined, { onFreshInference: event => observations.push(event) });
  await flush();
  fixture.setResult(result(1)); fixture.tick(0); await flush();
  fixture.session.redraw(); fixture.session.redraw();
  assert.equal(observations.length, 1);
  assert.equal(observations[0].source, 'worker');
  assert.equal(observations[0].configuration.inputMirrored, false);
  fixture.setResult(result(0)); fixture.tick(40, .04); await flush();
  fixture.session.redraw();
  assert.equal(observations.length, 2);
  assert.equal(observations[1].result.landmarks.length, 0);
  assert.equal(observations[1].capturedAtMs, 40);
});

test('the fresh-inference channel rejects stale results and suppresses deliveries after shutdown', async () => {
  const observations = [];
  const fixture = sessionFixture(undefined, { onFreshInference: event => observations.push(event) });
  let finish;
  fixture.backend.infer = () => new Promise(resolve => { finish = () => resolve({ result: result(1), inferenceMs: 200 }); });
  await flush(); fixture.tick(0); await flush();
  fixture.setTime(200); finish(); await flush();
  assert.equal(observations.length, 0);
  fixture.tick(250, .25); await flush(); fixture.session.stop(); finish(); await flush();
  assert.equal(observations.length, 0);
});
