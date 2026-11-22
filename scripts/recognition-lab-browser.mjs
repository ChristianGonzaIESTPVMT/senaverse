import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer, preview } from 'vite';
import { simulate } from '../ml/scripts/replay_session.mjs';
import { parseLabModel } from '../src/features/sign-recognition/labModel.ts';
import { checkLesson } from './fixtures/lesson-browser.mjs';
import { checkLibrary } from './fixtures/library-browser.mjs';
import { checkSituations } from './fixtures/situation-browser.mjs';
import { checkMinigames } from './fixtures/minigames-browser.mjs';
import { checkStudentOverview } from './fixtures/student-overview-browser.mjs';

const executable = process.argv[2];
if (!executable) throw new Error('Indica la ruta de un navegador Chromium local.');
const mode = process.argv[3] ?? 'lab';
assert.ok(['lab', 'student-development', 'student-production', 'lesson-development', 'lesson-production',
  'library-development', 'library-production', 'situation-development', 'situation-production',
  'minigames-development', 'minigames-production', 'progress-development', 'progress-production'].includes(mode));
const datasetPath = process.argv[4];
const base = await realpath(tmpdir());
const directory = await realpath(await mkdtemp(join(base, 'senaverse-lab-browser-')));
assert.match(relative(base, directory), /^senaverse-lab-browser-[^/\\]+$/);

async function until(description, check, timeout = 18000) {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) {
    const result = await check();
    if (result) return result;
    await delay(100);
  }
  throw new Error('Se agotó la espera de ' + description);
}

function protocol(socket) {
  const pending = new Map();
  const requests = [];
  let id = 0;
  socket.addEventListener('message', event => {
    const item = JSON.parse(event.data);
    if (item.method === 'Network.requestWillBeSent') requests.push(item.params.request.url);
    const callback = pending.get(item.id);
    if (!callback) return;
    pending.delete(item.id);
    callback(item);
  });
  function send(method, params = {}) {
    const next = ++id;
    return new Promise((resolve, reject) => {
      const timeout = method === 'Page.navigate' || method === 'Page.reload' ? 30000 : 8000;
      const timer = setTimeout(() => {
        pending.delete(next);
        reject(new Error('Chromium no respondió a ' + method));
      }, timeout);
      pending.set(next, item => {
        clearTimeout(timer);
        if (item.error) reject(new Error(JSON.stringify(item.error))); else resolve(item.result);
      });
      socket.send(JSON.stringify({ id: next, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  return { send, evaluate, requests };
}

async function checkStudent({ send, evaluate, requests }, origin) {
  let rejectedTake = false;
  await send('Page.navigate', { url: origin + '/camara' });
  await until('mensaje de recurso ausente', () => evaluate('!!document.querySelector(".practice-recognition-error")'));
  assert.equal(await evaluate('document.querySelector(".practice-camera-button").disabled'), true);
  assert.equal(await evaluate('window.labWorkers.length'), 0);
  assert.equal(await evaluate('document.querySelector(".practice-select-field select").options.length'), 11);
  const choose = id => evaluate(`(() => {
    const select = document.querySelector('.practice-select-field select');
    select.value = '${id}';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await choose('LSP-009');
  await until('instrucciones dirigidas', () => evaluate('document.querySelector(".practice-reference-link")?.textContent.includes("135")'));
  await choose('');
  const ready = () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false');
  const activate = () => evaluate('document.querySelector(".practice-camera-button").click()');
  await evaluate('window.studentBlockModel = false; document.querySelector(".practice-recognition-error button").click()');
  await until('modelo público V1', ready);
  await evaluate('window.studentDeny = true');
  await activate();
  await until('permiso denegado', () => evaluate('document.querySelector(".practice-camera-error")?.textContent.includes("permiso de cámara")'));
  assert.equal(await evaluate('window.labStreams.length'), 0);
  assert.equal(await evaluate('window.labWorkers.length'), 0);
  await evaluate('window.studentDeny = false; window.studentHold = true');
  await activate();
  await until('permiso pendiente', () => evaluate('typeof window.studentRelease === "function"'));
  await evaluate('document.querySelector(\'a[href="/biblioteca"]\').click()');
  await until('biblioteca', () => evaluate('location.pathname === "/biblioteca" && !document.querySelector(".practice-camera-button")'));
  await evaluate('document.querySelector(\'a[href="/camara"]\').click()');
  await until('regreso a Cámara', ready);
  await activate();
  await until('reserva de cámara única', () => evaluate('document.querySelector(".practice-camera-error")?.textContent.includes("Otra vista")'));
  assert.equal(await evaluate('window.studentAttempts'), 2);
  await evaluate('window.studentHold = false; window.studentRelease()');
  await until('pista tardía liberada', () => evaluate('window.labStreams[0]?.getTracks().every(track => track.readyState === "ended")'));

  await activate();
  let detectorRetries = 0;
  await until('MediaPipe procesando sin manos', async () => {
    if (detectorRetries < 2 && await evaluate('!!document.querySelector(".practice-detector-retry")')) {
      detectorRetries++;
      await evaluate('document.querySelector(".practice-detector-retry").click()');
    }
    return evaluate(`window.labWorkers.some(worker => !worker.ended && worker.results > 0) &&
      document.querySelector('.practice-student-result')?.textContent.includes('Buscando manos')`);
  }, 30000).catch(async error => {
    const diagnostics = await evaluate(`({
      messages: document.querySelector('.practice-camera-panel')?.textContent,
      workers: window.labWorkers.map(worker => [worker.ended, worker.results]),
      errors: window.labWorkerErrors,
      status: document.querySelector('.practice-student-result')?.textContent,
      diagnostics: document.querySelector('.hand-diagnostics')?.textContent,
      video: Array.from(document.querySelectorAll('video'), ({ currentTime, paused, readyState, videoWidth, hidden }) =>
        ({ currentTime, paused, readyState, videoWidth, hidden })),
    })`);
    throw new Error(`${error.message}. ${JSON.stringify(diagnostics)}`, { cause: error });
  });
  assert.equal(await evaluate('Math.max(...window.labWorkers.map(worker => worker.maxActive))'), 1);
  const workerCount = await evaluate('window.labWorkers.length');
  await choose('LSP-009');
  await evaluate('document.querySelector(".practice-overlay-toggle input").click()');
  assert.equal(await evaluate('document.querySelector(".practice-hand-overlay").style.opacity'), '');
  assert.equal(await evaluate('window.labWorkers.length'), workerCount);
  await evaluate('document.querySelector(".practice-recognition-result button").click()');
  if (datasetPath) {
    const document = JSON.parse(await readFile(datasetPath, 'utf8'));
    const model = parseLabModel(JSON.parse(await readFile('public/models/lsp-v1.json', 'utf8')));
    const rows = document.samples.filter(sample => ['LSP-010', 'NEG-001'].includes(sample.labelId) && sample.reviewStatus === 'accepted')
      .map(sample => ({ labelId: sample.labelId, frames: sample.frames, recordingStart: sample.captureMetadata.recordingStartedAtMs,
        configuration: sample.captureMetadata.configuration }));
    const take = rows.find(row => simulate(model, row).some(view => view.status === 'recognized' && view.stableId === 'LSP-010'));
    assert.ok(take, 'Se requiere una grabación de Con confirmada por la reproducción original.');
    async function replay(row, target, expected, confirmedName) {
      const frames = row.frames.map(frame => ({ time: frame.timestampMs, result: {
        landmarks: frame.hands.map(hand => hand.landmarks), handedness: frame.hands.map(hand => hand.handedness),
      } }));
      await choose(target);
      await evaluate(`(() => {
        document.querySelector('.practice-recognition-result button').click();
        window.studentTrace = { frames: ${JSON.stringify(frames)}, cursor: 0, started: null, states: new Map() };
        const result = document.querySelector('.practice-student-result');
        window.studentTrace.observer = new MutationObserver(() => window.studentTrace?.states.set(
          result.textContent, result.querySelector('strong')?.textContent ?? null));
        window.studentTrace.observer.observe(result,
          { subtree: true, childList: true, characterData: true });
      })()`);
      await until(expected, () => evaluate(`[...window.studentTrace.states].some(([message, sign]) =>
        message.includes(${JSON.stringify(expected)}) && sign === ${JSON.stringify(confirmedName)})`)).catch(async error => {
        const states = await evaluate('({ cursor: window.studentTrace.cursor, states: [...window.studentTrace.states] })');
        throw new Error(`${error.message}. ${JSON.stringify(states)}`, { cause: error });
      });
      await evaluate('window.studentTrace.observer.disconnect(); window.studentTrace = null');
    }
    await replay(take, '', 'Seña reconocida', 'Con');
    await replay(take, 'LSP-010', 'Coincide con la seña', 'Con');
    await replay(take, 'LSP-001', 'confirmó una seña distinta', 'Con');
    const rejected = rows.filter(row => row.labelId === 'NEG-001').find(row => {
      const states = simulate(model, row);
      return states.some(view => view.status === 'unknown' || view.reason === 'hand-count')
        && states.every(view => view.status !== 'recognized');
    });
    if (rejected) {
      await replay(rejected, '', 'Gesto no reconocido', null);
      rejectedTake = true;
    }
  }
  await evaluate('document.querySelector(".theme-toggle").click()');
  await until('tema oscuro', () => evaluate('document.documentElement.dataset.theme === "dark"'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  await send('Emulation.clearDeviceMetricsOverride');
  await activate();
  const released = () => evaluate('window.labStreams.flatMap(stream => stream.getTracks()).every(track => track.readyState === "ended") && window.labWorkers.every(worker => worker.ended)');
  await until('apagado y liberación', released);
  await activate();
  await until('reinicio de cámara', () => evaluate('window.labStreams.length === 3 && window.labWorkers.some(worker => !worker.ended)'));
  assert.equal(await evaluate('Math.max(...window.labWorkers.map(worker => worker.maxActive))'), 1);
  await evaluate('document.querySelector(\'a[href="/academia"]\').click()');
  await until('liberación al navegar', released);
  await send('Page.navigate', { url: origin + '/camara/libre?sena=si' });
  await until('enlace previo a Sí', () => evaluate('document.querySelector(".practice-select-field select")?.value === "LSP-006"'));
  assert.equal(await evaluate('!!document.querySelector(".recognition-diagnostics")'), false);
  if (mode === 'student-production') {
    for (const path of ['__senaverse/recognition-v1.json', 'ml/artifacts/hito-3/model.json', 'ml/datasets/senaverse-dataset-dataset-json.json']) {
      const response = await fetch(origin + '/' + path, { headers: { Accept: 'application/json' } });
      assert.ok(response.status >= 400, path);
    }
    for (const path of ['/herramientas/reconocimiento', '/herramientas/dataset']) {
      await send('Page.navigate', { url: origin + path });
      await until('ruta interna excluida', () => evaluate('location.pathname === "/" && !document.querySelector(".recognition-lab, .dataset-studio")'));
    }
  }
  assert.ok(requests.some(url => url.endsWith('/models/lsp-v1.json')));
  assert.ok(requests.every(url => url.startsWith(origin + '/') || /^(blob:|data:)/.test(url)));
  console.log(JSON.stringify({ mode, chromium: await evaluate('navigator.userAgent'), detectorRetries, recordedTake: datasetPath ? 'Con' : null, rejectedTake,
    assertions: 'modelo público, gestión de cámara, permiso denegado, reserva única, MediaPipe, cero manos, catálogo, práctica dirigida, claro/oscuro, navegación y liberación' }));
}

let server, browser, socket;
try {
  const debug = mode === 'student-development' ? 'VITE_HAND_DEBUG=true\n' : '';
  await writeFile(join(directory, '.env.development.local'), 'VITE_ENABLE_RECOGNITION_LAB=true\nVITE_ENABLE_DATA_COLLECTION=true\n' + debug);
  const common = { envDir: directory, cacheDir: join(directory, 'vite-cache'), logLevel: 'silent' };
  if (mode.endsWith('-production')) server = await preview({ ...common, preview: { host: '127.0.0.1', port: 0 } });
  else {
    server = await createServer({ ...common, server: { host: '127.0.0.1', port: 0, ws: false } });
    await server.listen();
  }
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  const profile = join(directory, 'chrome-profile');
  browser = spawn(executable, [
    '--headless=new', '--remote-debugging-port=0', '--no-first-run', '--disable-background-networking',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-sync', '--disable-component-update', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost',
    '--user-data-dir=' + profile, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  let launchError;
  browser.on('error', error => { launchError = error; });
  const port = await until('puerto de Chromium', async () => {
    if (launchError) throw launchError;
    return readFile(join(profile, 'DevToolsActivePort'), 'utf8').then(value => value.split(/\r?\n/)[0], () => null);
  });
  const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  socket = new WebSocket(list.find(target => target.type === 'page').webSocketDebuggerUrl);
  await once(socket, 'open');
  const { send, evaluate, requests } = protocol(socket);
  await send('Page.enable');
  await send('Network.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.labStreams = [];
    window.labWorkers = [];
    window.labWorkerErrors = [];
    window.labBlockModel = true;
    window.studentBlockModel = ${!['library-', 'situation-', 'minigames-', 'progress-'].some(prefix => mode.startsWith(prefix))};
    window.studentAttempts = 0;
    const fetchResource = window.fetch.bind(window);
    window.fetch = (resource, options) => (window.labBlockModel && String(resource).endsWith('/__senaverse/recognition-v1.json'))
      || String(resource).endsWith('/__senaverse/recognition-v2.json')
      || (window.studentBlockModel && String(resource).endsWith('/models/lsp-v1.json'))
      ? Promise.resolve(new Response(null, { status: 503 })) : fetchResource(resource, options);
    const openCamera = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async options => {
      window.studentAttempts++;
      if (window.studentDeny) throw new DOMException('Prueba de permiso denegado.', 'NotAllowedError');
      if (window.studentHold) await new Promise(resolve => { window.studentRelease = resolve; });
      const stream = await openCamera(options);
      window.labStreams.push(stream);
      return stream;
    };
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        this.ended = false;
        this.results = 0;
        window.labWorkers.push(this);
        this.maxActive = window.labWorkers.filter(worker => !worker.ended).length;
        this.addEventListener('error', event => window.labWorkerErrors.push(event.message));
        this.addEventListener('message', event => {
          if (event.data.type === 'error') window.labWorkerErrors.push(event.data.message);
          if (event.data.type === 'result') this.results++;
        });
      }
      postMessage(message, transfer) {
        const trace = window.studentTrace;
        if (message.type !== 'frame' || !trace) return super.postMessage(message, transfer);
        message.frame.close();
        const { id, timestamp } = message;
        trace.started ??= timestamp;
        const elapsed = timestamp - trace.started;
        while (trace.frames[trace.cursor + 1]?.time <= elapsed) trace.cursor++;
        const result = trace.frames[trace.cursor].result;
        queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', {
          data: { type: 'result', id, timestamp, result, inferenceMs: 0 },
        })));
      }
      terminate() { this.ended = true; super.terminate(); }
    };
  ` });
  if (mode.startsWith('progress-')) {
    await checkStudentOverview({ send, evaluate, requests }, origin, until, datasetPath);
  } else if (mode.startsWith('minigames-')) {
    await checkMinigames({ send, evaluate, requests }, origin, until, datasetPath);
  } else if (mode.startsWith('situation-')) {
    await checkSituations({ send, evaluate, requests }, origin, until, datasetPath);
  } else if (mode.startsWith('library-')) {
    await checkLibrary({ send, evaluate, requests }, origin, until);
  } else if (mode.startsWith('lesson-')) {
    await checkLesson({ send, evaluate, requests }, origin, until, datasetPath);
  } else if (mode !== 'lab') {
    await checkStudent({ send, evaluate, requests }, origin);
  } else {
  await send('Page.navigate', { url: origin + '/herramientas/reconocimiento' });
  await until('aviso de modelo ausente', () => evaluate('document.querySelector(".recognition-error")?.textContent.includes("V1")'));
  assert.equal(await evaluate('document.querySelector(".practice-camera-button").disabled'), true);
  assert.equal(await evaluate('window.labStreams.length'), 0);
  await evaluate('window.labBlockModel = false; document.querySelector(".recognition-error button").click()');
  await until('modelo V1', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
  const chooseModel = version => evaluate(`(() => {
    const select = document.querySelector('.recognition-intro select');
    select.value = '${version}';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await chooseModel('v2');
  await until('aviso de V2 pendiente', () => evaluate('document.querySelector(".recognition-error")?.textContent.includes("V2 pendiente")'));
  await chooseModel('v1');
  await until('regreso a V1', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
  await evaluate('document.querySelector(".theme-toggle").click()');
  await until('tema oscuro', () => evaluate('document.documentElement.dataset.theme === "dark"'));
  await evaluate('document.querySelectorAll("[name=lab-mode]")[1].click(); document.querySelector(".recognition-diagnostics summary").click()');
  await until('modo dirigido', () => evaluate('document.querySelector("#recognition-target")?.options.length === 10'));

  const activate = () => evaluate('document.querySelector(".practice-camera-button").click()');
  await activate();
  const fps = await until('inferencias MediaPipe con cámara simulada', () => evaluate(
    'parseFloat(document.querySelector(".recognition-metrics dd")?.textContent) > 0 && document.querySelector(".recognition-metrics dd").textContent',
  )).catch(async error => {
    const camera = await evaluate(`({
      messages: document.querySelector('.practice-camera-panel')?.textContent,
      streams: window.labStreams.length,
      workers: window.labWorkers.map(worker => worker.ended),
      workerErrors: window.labWorkerErrors,
      result: document.querySelector('.recognition-state')?.textContent,
    })`);
    throw new Error(`${error.message}. ${JSON.stringify(camera)}`, { cause: error });
  });
  assert.equal(await evaluate('document.querySelector(".recognition-state").dataset.state'), 'searching');
  await evaluate('document.querySelector(".recognition-reset").click()');
  await until('reinicio de reconocimiento', () => evaluate('document.querySelector(".recognition-window")?.value === 0 || document.querySelector("#recognition-window").value === 0'));
  await activate();
  await until('parada de cámara y Worker', () => evaluate(
    'window.labStreams[0]?.getTracks().every(track => track.readyState === "ended") && window.labWorkers.length > 0 && window.labWorkers.every(worker => worker.ended)',
  ));
  assert.equal(await evaluate('document.querySelector(".recognition-state").dataset.state'), 'off');
  await activate();
  await until('reinicio de cámara', () => evaluate('window.labStreams.length === 2 && window.labWorkers.some(worker => !worker.ended)'));
  await evaluate('document.querySelector(".recognition-back").click()');
  await until('cierre al salir de la ruta', () => evaluate(
    '!document.querySelector(".recognition-lab") && window.labStreams[1].getTracks().every(track => track.readyState === "ended") && window.labWorkers.every(worker => worker.ended)',
  ));
  assert.ok(requests.length > 0);
  assert.ok(requests.every(url => url.startsWith(origin + '/') || /^(blob:|data:)/.test(url)));
  console.log(JSON.stringify({ chromium: await evaluate('navigator.userAgent'), simulatedDetectorFps: fps,
    cameraStreams: 2, localRequests: requests.length, assertions: 'modelo ausente, selector V1/V2, recuperación, tema, modo dirigido, MediaPipe, cero manos, reinicio y limpieza' }));
  }
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  if (browser?.pid && browser.exitCode === null && browser.signalCode === null) {
    const exited = once(browser, 'exit');
    browser.kill();
    await Promise.race([exited, delay(2000)]);
  }
  if (server) {
    if (mode.endsWith('-production')) await new Promise(resolve => server.httpServer.close(resolve));
    else await server.close();
  }
  await rm(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
}
