import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadStaticTraces, replayTrace } from './lesson-browser.mjs';

const storage = 'JSON.parse(localStorage.getItem("senaverse-student-progress-v1"))';
const released = 'window.labStreams.flatMap(stream => stream.getTracks()).every(track => track.readyState === "ended") && window.labWorkers.every(worker => worker.ended)';

export async function checkSituations({ send, evaluate, requests }, origin, until, datasetPath, screenshots) {
  const button = label => evaluate(`Array.from(document.querySelectorAll('button')).find(node =>
    node.textContent.trim() === ${JSON.stringify(label)} && !node.disabled).click()`);
  const link = label => evaluate(`Array.from(document.querySelectorAll('a')).find(node =>
    node.textContent.trim() === ${JSON.stringify(label)} && node.getClientRects().length).click()`);
  const radio = (group, value) => evaluate(`document.querySelector(${JSON.stringify(`${group} input[value="${value}"]`)}).click()`);
  const contains = (selector, message) => until(message, () => evaluate(`document.querySelector(${JSON.stringify(selector)})
    ?.textContent.includes(${JSON.stringify(message)})`));
  const scene = title => contains('#situation-scene-title', title);
  const feedback = message => contains('.situation-attempt-feedback', message);
  const selection = value => radio('.situation-options', value);
  const available = () => until('control de cámara disponible', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
  const activate = async () => { await available(); await evaluate('document.querySelector(".practice-camera-button").click()'); };
  const cameraRunning = () => until('Worker activo', () => evaluate('window.labWorkers.some(worker => !worker.ended && worker.results > 0)'), 30000);
  const stop = () => until('recursos liberados', () => evaluate(released));
  const submit = () => button('Comprobar intento con cámara');
  const canAdvance = () => evaluate('!!document.querySelector(".situation-navigation .button-primary")');
  const current = () => evaluate(`(${storage}).situationStudy.utiles.scenes.cuadernos`);
  const completions = () => evaluate(`(${storage}).activities.filter(item => item.id === 'situation:utiles').length`);
  const pane = '.situation-attempt-feedback';
  const device = (width, height, mobile) => send('Emulation.setDeviceMetricsOverride', { width, height, mobile, deviceScaleFactor: 1 });

  async function capture(name, focusSelector) {
    if (!screenshots) return;
    await mkdir(screenshots, { recursive: true });
    await until('ilustración lista para la captura', () => evaluate(`[...document.querySelectorAll('.situation-context-art img')].every(image => image.complete && image.naturalWidth > 0)`));
    await evaluate(focusSelector
      ? `document.fonts.ready.then(() => document.querySelector(${JSON.stringify(focusSelector)}).scrollIntoView({ block: 'center' }))`
      : 'document.fonts.ready.then(() => window.scrollTo(0, 0))');
    const { cssContentSize } = await send('Page.getLayoutMetrics');
    const { data } = await send('Page.captureScreenshot', { format: 'png', ...(focusSelector ? {} : { captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 } }) });
    await writeFile(join(screenshots, name + '.png'), Buffer.from(data, 'base64'));
  }

  async function startCamera(label = 'Practicar con cámara') {
    await button(label);
    await activate();
    await cameraRunning();
  }

  async function assess(choice, trace, expected, messages, name, label) {
    await selection(choice);
    await startCamera(label);
    await replayTrace(evaluate, until, trace, expected, () => until('observación vigente al comprobar', () => evaluate(`(() => {
      const result = document.querySelector('.practice-student-result');
      const control = [...document.querySelectorAll('button')].find(node =>
        node.textContent.trim() === 'Comprobar intento con cámara' && !node.disabled);
      if (!control || !result?.textContent.includes(${JSON.stringify(expected)})) return false;
      control.click();
      return true;
    })()`)));
    for (const message of messages) await feedback(message);
    assert.equal(await canAdvance(), name === '06-ambas-correctas');
    await stop();
    await capture(name);
  }

  async function completeVisual(choice) {
    await selection(choice);
    await button('Hacer ejercicio sin cámara');
    assert.equal(await evaluate('!!document.querySelector(".practice-camera-button")'), false);
    const signAssets = await evaluate('[...document.querySelectorAll(".situation-alternative img")].map(node => [node.alt, node.title])');
    assert.ok(signAssets.length >= 2 && signAssets.every(([alt, title]) => alt && !title));
    await radio('.situation-alternative', choice);
    await button('Comprobar ejercicio sin cámara');
    await feedback('Comprensión visual correcta');
  }

  await device(1390, 900, false);
  await send('Page.navigate', { url: origin + '/simulador' });
  await until('seis situaciones', () => evaluate('document.querySelectorAll(".situation-card").length === 6'));
  await button('Intermedio');
  await until('filtro Intermedio', () => evaluate('document.querySelectorAll(".situation-card").length === 3 && location.search === "?nivel=intermedio"'));
  await send('Page.navigate', { url: origin + '/simulador/utiles/escena/lapices' });
  await scene('Cuadernos por curso');
  assert.match(await evaluate('location.pathname'), /\/escena\/cuadernos$/);
  await selection('LSP-003');
  assert.equal(await evaluate(`!!document.querySelector("${pane}, .situation-context-art")`), false);
  assert.equal(await canAdvance(), false);
  assert.ok(!requests.some(url => url.endsWith('/models/lsp-v1.json')));

  await button('Practicar con cámara');
  await evaluate('window.studentDeny = true');
  await activate();
  await contains('.practice-camera-error', 'permiso de cámara');
  await button('Hacer ejercicio sin cámara');
  await radio('.situation-alternative', 'LSP-002');
  await button('Comprobar ejercicio sin cámara');
  await feedback('Comprensión visual por revisar');
  assert.equal(await canAdvance(), false);
  await evaluate('window.studentDeny = false');
  await startCamera();
  await contains('.practice-student-result', 'Buscando manos');
  await submit();
  await feedback('Seguimiento insuficiente');
  await stop();
  await capture('01-seguimiento-insuficiente');

  if (datasetPath) {
    const traces = await loadStaticTraces(datasetPath, ['LSP-001', 'LSP-002', 'LSP-003', 'NEG-001']);
    await startCamera('Reintentar con cámara');
    await replayTrace(evaluate, until, traces['LSP-003'], 'Tres');
    await until('la confirmación desaparece al perder la mano', () => evaluate(`/Buscando manos|Seguimiento insuficiente/
      .test(document.querySelector('.practice-student-result').textContent)`));
    await submit();
    assert.equal((await current()).evaluations.at(-1).observation.status, 'tracking');
    await stop();

    await startCamera('Reintentar con cámara');
    await button('Reiniciar intento');
    await stop();
    assert.equal(await evaluate('document.querySelector(".practice-camera-button")?.textContent.includes("Activar")'), true);
    await activate();
    await cameraRunning();
    await replayTrace(evaluate, until, traces['LSP-002'], 'Dos', async () => selection('LSP-002'));
    await stop();
    assert.equal(await evaluate(`!!document.querySelector("${pane}, .practice-camera-button")`), false);

    await assess('LSP-002', traces['LSP-002'], 'Dos', ['Contexto por revisar', 'Coincidencia gestual'], '02-contexto-incorrecto-coincidencia');
    await assess('LSP-002', traces['LSP-001'], 'Uno', ['Contexto por revisar', 'Seña diferente', '«Uno»'], '03-ambas-incorrectas', 'Reintentar con cámara');
    await assess('LSP-003', traces['LSP-002'], 'Dos', ['Contexto correcto', 'Seña diferente', '«Dos»'], '04-contexto-correcto-sena-diferente');
    await assess('LSP-003', traces['NEG-001'], 'Gesto no reconocido', ['Contexto correcto', 'Gesto desconocido'], '05-gesto-desconocido', 'Reintentar con cámara');
    assert.equal(await evaluate('Math.max(...window.labWorkers.map(worker => worker.maxActive))'), 1);

    const persisted = await current();
    await send('Page.reload');
    await feedback('Gesto desconocido');
    assert.deepEqual(await current(), persisted);
    await assess('LSP-003', traces['LSP-003'], 'Tres', ['Contexto correcto', 'Coincidencia gestual', '«Tres»'], '06-ambas-correctas', 'Reintentar con cámara');
    assert.equal((await current()).practice.method, 'camera');
  } else {
    await completeVisual('LSP-003');
  }
  await link('Repasar Tres en Biblioteca');
  await contains('.library-dialog[open] h2', 'Tres');
  await link('Volver a la situación');
  await scene('Cuadernos por curso');
  await link('Continuar a la siguiente interacción');
  await scene('Materiales para el grupo');
  await device(390, 844, true);
  assert.equal(await evaluate('document.documentElement.dataset.theme === "light" && document.documentElement.scrollWidth === innerWidth'), true);
  await device(1390, 900, false);
  await evaluate('document.querySelector(".theme-toggle").click()');
  await until('tema oscuro', () => evaluate('document.documentElement.dataset.theme === "dark"'));
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await device(390, 844, true);
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  await completeVisual('LSP-004');
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  await capture('07-comprension-visual-movil-oscuro', pane);
  assert.equal(await completions(), 0);
  await button('Finalizar situación');
  await contains('.situation-results-note', '40 XP');
  await contains('.situation-result-scenes', 'Comprensión visual');
  assert.equal(await completions(), 1);
  await button('Repetir situación');
  await scene('Cuadernos por curso');
  assert.equal(await evaluate(`(${storage}).situationArchive.utiles.length`), 1);
  await completeVisual('LSP-003');
  await link('Continuar a la siguiente interacción');
  await scene('Materiales para el grupo');
  await completeVisual('LSP-004');
  await button('Finalizar situación');
  await contains('.situation-results-note', '40 XP');
  assert.equal(await completions(), 1);
  await send('Page.navigate', { url: origin + '/simulador/preguntas' });
  await scene('El libro reservado');
  await selection('no');
  await button('Comprobar alternativa');
  await contains('.situation-answer-feedback', 'no corresponde');
  assert.equal(await canAdvance(), false);
  assert.equal(await evaluate('!!document.querySelector(".practice-camera-button")'), false);

  await send('Page.navigate', { url: origin + '/simulador/comida' });
  await scene('Una porción para el almuerzo');
  await completeVisual('LSP-001');
  await contains('.situation-scene-reply', '¿Puedes mirar si queda pan en la bandeja?');
  await link('Continuar a la siguiente interacción');
  await scene('Se acabó el pan');
  await completeVisual('LSP-001');
  await feedback('Contexto por revisar');
  assert.equal(await canAdvance(), false);
  assert.equal(await evaluate('!!document.querySelector(".situation-scene-reply")'), false);
  await capture('comedor-visual-correcto-contexto-incorrecto', pane);
  await selection('LSP-007');
  await button('Hacer ejercicio sin cámara');
  assert.equal(await evaluate('document.querySelectorAll(".situation-alternative video").length'), 3);
  assert.equal(await evaluate('!!document.querySelector(".practice-camera-button")'), false);
  await radio('.situation-alternative', 'LSP-007');
  await button('Comprobar ejercicio sin cámara');
  await contains('.situation-scene-reply', '¿Puedes revisar también la bandeja de arroz?');
  await capture('comedor-transicion-narrativa', '.situation-scene-reply');
  await link('Continuar a la siguiente interacción');
  await scene('Arroz para todos');

  assert.ok(requests.every(url => url.startsWith(origin + '/') || /^(blob:|data:)/.test(url)));
  console.log(JSON.stringify({ catalogue: 6, libraryRoundTrip: true, unsupported: 'No', permissionDenied: true,
    cameraOutcomes: datasetPath ? 6 : 1, lostTrackingAfterConfirmation: !!datasetPath, archivedOnRepeat: true,
    reward: '40 XP once', visualWrongContext: true, narrativeContinuity: true,
    desktopAndMobileBothThemes: true, released: true, screenshots: !!screenshots }));
}
