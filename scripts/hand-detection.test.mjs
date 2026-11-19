import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import { CAMERA_VIDEO_CONSTRAINTS, HAND_LANDMARKER_OPTIONS, MAX_DETECTION_FPS, getHandLandmarkerAssets, getHandLandmarkerOptions } from '../src/features/sign-recognition/config.ts';
import { HandTrackingContinuity } from '../src/features/sign-recognition/trackingContinuity.ts';
import { createHandDiagnosticReport, HandPerformanceMetrics } from '../src/features/sign-recognition/performanceMetrics.ts';
import { DatasetCapture } from '../src/features/sign-recognition/dataset/datasetCapture.ts';
import { participantFixture, signFixture } from './fixtures/dataset.mjs';
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
  assert.equal(continuity.view(121).result, valid);
  assert.equal(continuity.view(130).result, null);
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

test('a stalled stream exposes loss and a bounded faded hold, never a continued detection', () => {
  const continuity = new HandTrackingContinuity();
  assert.equal(continuity.observe(result(0), 0, 0).result, null);
  assert.equal(continuity.view(1000).state.status, 'searching');
  continuity.observe(result(1), 1000, 1010);
  assert.equal(continuity.view(1121).opacity, .45);
  assert.equal(continuity.view(1121).state.handCount, 0);
  assert.equal(continuity.view(1121).state.status, 'lost');
  assert.equal(continuity.view(1200).result, null);
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

test('a recent bitmap is not discarded merely because a camera frame arrives during asynchronous capture', async () => {
  let completeCapture, captureCount = 0, closed = 0;
  const fixture = sessionFixture(undefined, { captureFrame: video => ++captureCount === 1
    ? new Promise(resolve => { completeCapture = () => resolve({ width: 640, height: 480, mediaTime: 0, close() { closed++; } }); })
    : Promise.resolve({ width: 640, height: 480, mediaTime: video.currentTime, close() {} }) });
  await flush();
  fixture.tick(0); fixture.tick(40, .04);
  completeCapture(); await flush();
  assert.equal(closed, 1);
  assert.equal(fixture.detections.length, 2);
  assert.equal(fixture.detections[0].input.mediaTime, 0);
  assert.equal(fixture.detections[1].input.mediaTime, .04);
  assert.equal(fixture.session.readDiagnostics().expiredCaptures, 0);
});

test('110 ms latency does not blank the overlay at 120 ms; held points expire and fresh recovery replaces them', () => {
  const continuity = new HandTrackingContinuity();
  const first = result(1);
  continuity.observe(first, 0, 110);
  assert.equal(continuity.view(119).state.status, 'detected');
  const held = continuity.view(120);
  assert.equal(held.state.status, 'lost');
  assert.equal(held.state.handCount, 0);
  assert.equal(held.result, first);
  assert.equal(held.opacity, .45);
  assert.equal(held.lossReason, 'result-gap');
  assert.equal(continuity.view(199).result, first);
  assert.equal(continuity.view(200).result, null);
  const recovered = result(1); recovered.landmarks[0][0].x = .7;
  const view = continuity.observe(recovered, 210, 220);
  assert.equal(view.result, recovered);
  assert.equal(view.opacity, 1);
  assert.equal(view.state.status, 'detected');
});

test('an expired bitmap is closed before inference and its age is attributed to capture, not the model', async () => {
  let finish, closed = 0;
  const fixture = sessionFixture(undefined, { captureFrame: () => new Promise(resolve => { finish = () => resolve({ width: 640, height: 480, close() { closed++; } }); }) });
  await flush(); fixture.tick(0);
  fixture.setTime(121); finish(); await flush();
  assert.equal(closed, 1);
  assert.equal(fixture.detections.length, 0);
  const snapshot = fixture.session.readDiagnostics();
  assert.equal(snapshot.expiredCaptures, 1);
  assert.equal(snapshot.inferenceCount, 0);
  assert.equal(snapshot.emptyModelFrames, 0);
});

test('unchanged redraws do not clear the Canvas; resize and real results still repaint', async () => {
  const fixture = sessionFixture();
  await flush(); fixture.setResult(result(1)); fixture.tick(0); await flush();
  const clears = () => fixture.calls.filter(call => call.method === 'clearRect').length;
  const before = clears();
  fixture.session.redraw(); fixture.session.redraw();
  assert.equal(clears(), before);
  fixture.bounds.width = 320;
  fixture.session.redraw();
  assert.equal(clears(), before + 1);
  fixture.setTime(120); fixture.session.redraw();
  const snapshot = fixture.session.readDiagnostics();
  assert.equal(snapshot.visualState, 'held');
  assert.equal(snapshot.handCount, 0);
  assert.equal(snapshot.freshnessExpirations, 1);
  assert.equal(snapshot.visualHolds, 1);
  fixture.session.redraw();
  assert.equal(fixture.session.readDiagnostics().visualHolds, 1);
});

test('diagnostics distinguish raw empty model frames, discarded late results, loss, recovery and handedness scores', async () => {
  const fixture = sessionFixture();
  await flush();
  const detected = result(2);
  detected.handedness = [[{ categoryName: 'Left', score: .97 }], [{ categoryName: 'Right', score: .92 }]];
  fixture.setResult(detected); fixture.tick(0); await flush();
  fixture.setResult(result(0)); fixture.tick(40, .04); await flush();
  fixture.setResult(detected); fixture.tick(80, .08); await flush();
  let snapshot = fixture.session.readDiagnostics();
  assert.equal(snapshot.inferenceCount, 3);
  assert.equal(snapshot.acceptedFrames, 3);
  assert.equal(snapshot.emptyModelFrames, 1);
  assert.equal(snapshot.emptyAcceptedFrames, 1);
  assert.equal(snapshot.detectionLosses, 1);
  assert.equal(snapshot.detectionRecoveries, 1);
  assert.equal(snapshot.lastTrackingEvent, 'recovery');
  assert.deepEqual(snapshot.handednessScores, [{ label: 'Left', score: .97 }, { label: 'Right', score: .92 }]);
  let finish;
  fixture.backend.infer = () => new Promise(resolve => { finish = () => resolve({ result: result(0), inferenceMs: 130 }); });
  fixture.tick(120, .12); await flush(); fixture.setTime(251); finish(); await flush();
  snapshot = fixture.session.readDiagnostics();
  assert.equal(snapshot.inferenceCount, 4);
  assert.equal(snapshot.acceptedFrames, 3);
  assert.equal(snapshot.emptyModelFrames, 2);
  assert.equal(snapshot.emptyAcceptedFrames, 1);
  assert.equal(snapshot.staleByAge, 1);
  assert.equal(snapshot.rawHandCount, 0);
});

test('capture and initialization failures retain their phase/details in the last diagnostic snapshot', async () => {
  const failures = [];
  const fixture = sessionFixture(undefined, { onDiagnostics: snapshot => failures.push(snapshot), captureFrame: async () => { throw new Error('bitmap failed'); } });
  await flush(); fixture.tick(0); await flush();
  assert.equal(fixture.states.at(-1).error.phase, 'capture');
  assert.match(handDetectionMessage(fixture.states.at(-1)), /Se interrumpió el seguimiento/);
  assert.equal(failures.at(-1).lastError.detail, 'bitmap failed');
  assert.equal(failures.at(-1).failures, 1);
  const init = sessionFixture(async () => { throw new Error('WASM load failed'); }, { onDiagnostics: snapshot => failures.push(snapshot) });
  await flush();
  assert.equal(init.states.at(-1).error.phase, 'initialization');
  assert.match(handDetectionMessage(init.states.at(-1)), /No se pudo inicializar/);
  assert.equal(failures.at(-1).lastError.detail, 'WASM load failed');
});

test('held landmarks and stale results never enter a Dataset Studio sequence; real empty frames record a loss', async () => {
  let fixture;
  const recorder = new DatasetCapture({ now: () => time, isoNow: () => '2026-11-19T12:00:00.000Z', id: () => 'sample-integrity' });
  let time = 0;
  recorder.start({ participant: participantFixture, sign: { ...signFixture, durationMs: 500 }, sessionConsent: true, repetition: 1 });
  fixture = sessionFixture(undefined, { onFreshInference: event => recorder.accept(event) });
  await flush();
  time = 3000; fixture.setResult(result(1)); fixture.tick(time, 3); await flush();
  time = 3040; fixture.setResult(result(0)); fixture.tick(time, 3.04); await flush();
  time = 3070; fixture.setTime(time); fixture.session.redraw(); fixture.session.redraw();
  assert.equal(fixture.session.readDiagnostics().visualState, 'held');
  let finish;
  fixture.backend.infer = () => new Promise(resolve => { finish = () => resolve({ result: result(1), inferenceMs: 130 }); });
  time = 3100; fixture.tick(time, 3.1); await flush();
  time = 3231; fixture.setTime(time); finish(); await flush();
  time = 3620; recorder.advance();
  const sample = recorder.view().draft;
  assert.deepEqual(sample.frames.map(frame => [frame.timestampMs, frame.handCount]), [[0, 1], [40, 0]]);
  assert.deepEqual(sample.frames[1].hands, []);
  assert.ok(sample.incidents.some(incident => incident.type === 'hand-count-mismatch'));
  assert.equal(sample.qualityMetrics.sufficient, false);
});

test('diagnostic reports keep raw counters and single-variable profiles without assuming physical results', () => {
  const fixture = sessionFixture();
  const snapshot = fixture.session.readDiagnostics();
  const report = createHandDiagnosticReport(snapshot, { scenario: null, expectedHands: null, observedFalsePositives: null }, '2026-11-19T12:00:00.000Z');
  assert.equal(report.context.observedFalsePositives, null);
  assert.equal(report.configuration.minHandDetectionConfidence, .5);
  assert.equal(report.configuration.minHandPresenceConfidence, .5);
  assert.equal(report.configuration.minTrackingConfidence, .5);
  assert.equal('landmarks' in report, false);
  assert.equal(report.snapshot.acceptedFrames, 0);
  assert.equal(report.source, 'runtime-counters');
  assert.match(report.confidenceNote, /scores de lateralidad/);
  report.snapshot.acceptedFrames = 100;
  assert.equal(snapshot.acceptedFrames, 0);
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
  assert.equal(backend.diagnostics().mismatchedResponses, 1);
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

test('a Worker inference failure preserves its stage and detail and terminates the in-flight task', async () => {
  const fixture = workerFixture();
  fixture.emit({ type: 'ready', delegate: 'GPU' });
  const backend = await fixture.ready;
  const pending = backend.infer({ close() {} }, 10);
  fixture.emit({ type: 'error', phase: 'inference', message: 'WebGL context lost' });
  await assert.rejects(pending, error => error.phase === 'inference' && error.message === 'WebGL context lost');
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
