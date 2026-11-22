import assert from 'node:assert/strict';
import { loadTraces, replayTrace } from './lesson-browser.mjs';

const progress = 'JSON.parse(localStorage.getItem("senaverse-student-progress-v1"))';
const route = '/simulador/cantidad';
const released = 'window.labStreams.flatMap(stream => stream.getTracks()).every(track => track.readyState === "ended") && window.labWorkers.every(worker => worker.ended)';

export async function checkSituations({ send, evaluate, requests }, origin, until, datasetPath) {
  const button = label => evaluate(`Array.from(document.querySelectorAll('button')).find(node =>
    node.textContent.trim() === ${JSON.stringify(label)} && !node.disabled).click()`);
  const link = label => evaluate(`Array.from(document.querySelectorAll('a')).find(node =>
    node.textContent.trim() === ${JSON.stringify(label)} && node.getClientRects().length).click()`);
  const radio = (group, value) => evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(`${group} input[type=radio]`)}))
    .find(node => node.value === ${JSON.stringify(value)}).click()`);
  const contains = (selector, message) => until(message, () => evaluate(`document.querySelector(${JSON.stringify(selector)})
    ?.textContent.includes(${JSON.stringify(message)})`));
  const scene = title => contains('#situation-scene-title', title);
  const feedback = message => contains('.situation-question .situation-answer-feedback', message);
  const method = message => contains('.situation-practice-step [role=status]', message);
  const selection = value => radio('.situation-options', value);
  const activateCamera = async () => {
    await until('control de cámara disponible', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
    await evaluate('document.querySelector(".practice-camera-button").click()');
  };
  const cameraRunning = () => until('Worker activo', () => evaluate('window.labWorkers.some(worker => !worker.ended && worker.results > 0)'), 30000);
  const stopConfirmed = () => until('recursos liberados', () => evaluate(released));
  const readRun = () => evaluate(`(${progress}).situationStudy.cantidad`);
  const completionCount = () => evaluate(`(${progress}).activities.filter(item => item.id === 'situation:cantidad').length`);
  const noCamera = () => evaluate('!document.querySelector(".practice-camera-button")');
  async function answer(value, ok = true) {
    await selection(value);
    await button('Comprobar alternativa');
    await feedback(ok ? 'Respuesta adecuada' : 'no corresponde');
  }
  async function alternative(value, retry = false) {
    await button('Hacer ejercicio sin cámara');
    assert.equal(await noCamera(), true);
    assert.equal(await evaluate(released), true);
    if (retry) {
      await radio('.situation-alternative', 'two');
      await button('Comprobar ejercicio sin cámara');
      await contains('.situation-alternative [role=status]', 'vuelve a intentarlo');
    }
    await radio('.situation-alternative', value);
    await button('Comprobar ejercicio sin cámara');
    await method('Ejercicio sin cámara completado');
  }
  async function visitCard() {
    await link('Ver ficha de Uno en Biblioteca');
    await contains('.library-dialog[open] h2', 'Uno');
    assert.equal(await evaluate('location.pathname'), '/biblioteca');
    assert.match(await evaluate('document.querySelector(".library-meaning a").href'), /minedu\.gob\.pe.*#page=14$/);
    await stopConfirmed();
    await link('Volver a la situación');
    await scene('Hojas para el taller');
    await feedback('no corresponde');
    assert.equal(await evaluate('document.querySelector(".situation-options input:checked").value'), 'LSP-001');
    assert.equal(await noCamera(), true);
  }

  await send('Page.navigate', { url: origin + '/simulador' });
  await until('seis situaciones', () => evaluate('document.querySelectorAll(".situation-card").length === 6'));
  await button('Intermedio');
  await until('filtro Intermedio', () => evaluate('document.querySelectorAll(".situation-card").length === 3 && location.search === "?nivel=intermedio"'));
  await send('Page.navigate', { url: origin + route + '/escena/faltante' });
  await scene('Hojas para el taller');
  assert.match(await evaluate('location.pathname'), /\/escena\/total$/);
  assert.equal(await evaluate('window.studentAttempts'), 0);
  await answer('LSP-001', false);
  assert.match(await evaluate('document.querySelector("#situation-practice-title").textContent'), /«Uno»/);
  await visitCard();
  assert.ok(!requests.some(url => url.endsWith('/models/lsp-v1.json') || /handDetection\.worker/.test(url)));

  await button('Practicar con cámara');
  await until('práctica dirigida montada', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
  assert.equal(await evaluate('window.studentAttempts'), 0);
  assert.equal(await evaluate('window.labWorkers.length'), 0);
  await evaluate('window.studentDeny = true');
  await activateCamera();
  await contains('.practice-camera-error', 'permiso de cámara');
  await button('Hacer ejercicio sin cámara');
  assert.equal(await noCamera(), true);
  await evaluate('window.studentDeny = false');
  await button('Practicar con cámara');
  await activateCamera();
  await cameraRunning();
  await visitCard();
  await button('Practicar con cámara');
  await activateCamera();
  await cameraRunning();
  assert.equal(await evaluate('Math.max(...window.labWorkers.map(worker => worker.maxActive))'), 1);

  if (datasetPath) {
    const traces = await loadTraces(datasetPath);
    await replayTrace(evaluate, until, traces.different, 'confirmó una seña distinta');
    assert.equal(await evaluate('document.querySelector(".situation-directed-practice").textContent.includes("Guardar práctica con cámara")'), false);
    await button('Reintentar práctica');
    await replayTrace(evaluate, until, traces.correct, 'Coincide con la seña');
    assert.equal((await readRun()).scenes.total.practice, undefined);
    await button('Guardar práctica con cámara');
    await method('coincidencia experimental');
    await stopConfirmed();
    assert.equal((await readRun()).scenes.total.practice.method, 'camera');
  } else await alternative('one');

  await link('Continuar a la siguiente interacción');
  await scene('La última hoja');
  await answer('cero', false);
  assert.match(await evaluate('document.querySelector("#situation-practice-title").textContent'), /«Cero»/);
  assert.equal(await evaluate('!!document.querySelector(".situation-practice-step button[aria-pressed]") && !document.querySelector(".situation-practice-step").textContent.includes("Practicar con cámara")'), true);
  const timeOrigin = await evaluate('performance.timeOrigin');
  await send('Page.reload');
  await until('recarga de la escena', () => evaluate(`performance.timeOrigin !== ${timeOrigin}`));
  await scene('La última hoja');
  await feedback('no corresponde');
  assert.equal(await evaluate('window.studentAttempts'), 0);

  await evaluate('document.querySelector(".theme-toggle").click()');
  await until('tema oscuro', () => evaluate('document.documentElement.dataset.theme === "dark"'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  await answer('LSP-001');
  await alternative('one', true);
  assert.equal(await completionCount(), 0);
  await button('Finalizar situación');
  await contains('#situation-results-title', 'Resumen de la situación');
  assert.equal((await readRun()).scenes.faltante.practice.method, 'alternative');
  assert.match(await evaluate('document.querySelector(".situation-results-metrics").textContent'), /1 adecuada · 1 por revisar.*2 intentos incorrectos/s);
  await contains('.situation-results-note', '40 XP');
  assert.equal(await completionCount(), 1);
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  await send('Emulation.clearDeviceMetricsOverride');

  await link('Volver a Situaciones');
  await contains('.situation-card[aria-labelledby="situation-cantidad"]', '2 de 2 interacciones · Finalizada');
  await evaluate('document.querySelector(\'.situation-card[aria-labelledby="situation-cantidad"] .situation-start\').click()');
  await contains('#situation-results-title', 'Resumen de la situación');
  await button('Repetir situación');
  await scene('Hojas para el taller');
  await answer('LSP-005');
  await alternative('one');
  await link('Continuar a la siguiente interacción');
  await scene('La última hoja');
  await answer('cero', false);
  await alternative('one');
  await button('Finalizar situación');
  await contains('.situation-results-note', '40 XP');
  assert.equal(await completionCount(), 1);
  await evaluate('document.querySelector(\'a[href="/progreso"]\').click()');
  await contains('.progress-page', 'Eligiendo una cantidad');
  assert.ok(requests.every(url => url.startsWith(origin + '/') || /^(blob:|data:)/.test(url)));
  console.log(JSON.stringify({ catalogue: 6, libraryRoundTrip: true, incompatibleSign: 'Cero', permissionDenied: true,
    realTraces: !!datasetPath, contextsAndCameraSeparate: true, resumed: true, reward: '40 XP once', mobileDark: true, released: true }));
}
