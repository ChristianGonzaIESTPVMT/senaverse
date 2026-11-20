import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'vite';

const executable = process.argv[2];
if (!executable) throw new Error('Indica la ruta de un navegador Chromium local.');
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
      const timer = setTimeout(() => {
        pending.delete(next);
        reject(new Error('Chromium no respondió a ' + method));
      }, 8000);
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

let server, browser, socket;
try {
  await writeFile(join(directory, '.env.development.local'), 'VITE_ENABLE_RECOGNITION_LAB=true\n');
  server = await createServer({ envDir: directory, cacheDir: join(directory, 'vite-cache'), logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0, ws: false } });
  await server.listen();
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  const profile = join(directory, 'chrome-profile');
  browser = spawn(executable, [
    '--headless=new', '--remote-debugging-port=0', '--no-first-run', '--disable-background-networking',
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
    window.labBlockModel = true;
    const fetchResource = window.fetch.bind(window);
    window.fetch = (resource, options) => window.labBlockModel && String(resource).endsWith('/__senaverse/recognition-v1.json')
      ? Promise.resolve(new Response(null, { status: 503 })) : fetchResource(resource, options);
    const openCamera = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async options => {
      const stream = await openCamera(options);
      window.labStreams.push(stream);
      return stream;
    };
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args) { super(...args); this.ended = false; window.labWorkers.push(this); }
      terminate() { this.ended = true; super.terminate(); }
    };
  ` });
  await send('Page.navigate', { url: origin + '/herramientas/reconocimiento' });
  await until('aviso de modelo ausente', () => evaluate('document.querySelector(".recognition-error")?.textContent.includes("V1")'));
  assert.equal(await evaluate('document.querySelector(".practice-camera-button").disabled'), true);
  assert.equal(await evaluate('window.labStreams.length'), 0);
  await evaluate('window.labBlockModel = false; document.querySelector(".recognition-error button").click()');
  await until('modelo V1', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
  await evaluate('document.querySelector(".theme-toggle").click()');
  await until('tema oscuro', () => evaluate('document.documentElement.dataset.theme === "dark"'));
  await evaluate('document.querySelectorAll("[name=lab-mode]")[1].click(); document.querySelector(".recognition-diagnostics summary").click()');
  await until('modo dirigido', () => evaluate('document.querySelector("#recognition-target")?.options.length === 10'));

  const activate = () => evaluate('document.querySelector(".practice-camera-button").click()');
  await activate();
  const fps = await until('inferencias MediaPipe con cámara simulada', () => evaluate(
    'parseFloat(document.querySelector(".recognition-metrics dd")?.textContent) > 0 && document.querySelector(".recognition-metrics dd").textContent',
  ));
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
    cameraStreams: 2, localRequests: requests.length, assertions: 'modelo ausente, recuperación, tema, modo dirigido, MediaPipe, cero manos, reinicio y limpieza' }));
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  if (browser?.pid && browser.exitCode === null && browser.signalCode === null) {
    const exited = once(browser, 'exit');
    browser.kill();
    await Promise.race([exited, delay(2000)]);
  }
  await server?.close();
  await rm(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
}
