import assert from 'node:assert/strict';
import { loadTraces, replayTrace } from './lesson-browser.mjs';

const list = '/minijuegos';
const selector = '.game-memory-card';
const storage = 'JSON.parse(localStorage.getItem("senaverse-student-progress-v1"))';
const released = 'window.labStreams.flatMap(item => item.getTracks()).every(track => track.readyState === "ended") && window.labWorkers.every(worker => worker.ended)';

export async function checkMinigames({ send, evaluate, requests }, origin, until, datasetPath) {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    Math.random = () => .999;
    window.gameClockOffset = 0;
    window.gameClocks = new Set();
    const now = Date.now.bind(Date);
    Date.now = () => now() + window.gameClockOffset;
    const interval = setInterval.bind(window), cancel = clearInterval.bind(window);
    window.setInterval = (callback, delay, ...args) => {
      const id = interval(callback, delay, ...args);
      if (delay === 200) window.gameClocks.add(id);
      return id;
    };
    window.clearInterval = id => { window.gameClocks.delete(id); cancel(id); };
  ` });
  const contains = (target, value) => until(value, () => evaluate(`document.querySelector(${JSON.stringify(target)})?.textContent.includes(${JSON.stringify(value)})`));
  const named = (kind, label) => until(label, () => evaluate(`(() => {
    const node = Array.from(document.querySelectorAll(${JSON.stringify(kind)}))
      .find(item => item.textContent.trim() === ${JSON.stringify(label)} && !item.disabled && item.getAttribute('aria-disabled') !== 'true');
    if (!node) return false;
    node.click();
    return true;
  })()`));
  const button = label => named('button', label);
  const link = label => named('a', label);
  const result = () => contains('#game-results-title', 'Resultados de la partida');
  const card = index => evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[${index}].click()`);
  const enter = async index => {
    await evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[${index}].focus()`);
    const key = { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 };
    await send('Input.dispatchKeyEvent', { ...key, type: 'keyDown', text: ' ', unmodifiedText: ' ' });
    await send('Input.dispatchKeyEvent', { ...key, type: 'keyUp' });
  };
  const select = (name, value) => evaluate(`(() => {
    const field = Array.from(document.querySelectorAll('.game-settings label')).find(label => label.firstChild.textContent.trim() === ${JSON.stringify(name)}).querySelector('select');
    field.value = ${JSON.stringify(value)};
    field.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  const plays = game => evaluate(`(${storage}).activities.filter(item => item.type === 'minigame' && item.targetId === ${JSON.stringify(game)})`);
  const start = () => button('Iniciar partida');
  const listLink = () => link('Minijuegos');
  const stopped = () => until('reloj detenido', () => evaluate('window.gameClocks.size === 0'));
  const timer = () => until('reloj visible', () => evaluate('!!document.querySelector("[role=timer]") && window.gameClocks.size === 1'));
  const cameraReleased = () => until('pistas y Worker liberados', () => evaluate(released));

  await send('Page.navigate', { url: origin + list });
  await until('cinco juegos disponibles', () => evaluate('document.querySelectorAll(".minigame-card a").length === 5'));
  const open = async (id, path = list) => {
    const target = JSON.stringify(`a[href="${path}/${id}"]`);
    await until(`enlace a ${id}`, () => evaluate(`!!document.querySelector(${target})`));
    await evaluate(`document.querySelector(${target}).click()`);
    await contains('#game-setup-title', 'Configura tu partida');
  };
  await open('memoria');
  await start();
  await timer();
  assert.equal(await evaluate('document.querySelectorAll(".game-memory-card[data-state=hidden]").length'), 6);
  assert.equal(await evaluate('document.querySelectorAll(".game-memory-card canvas").length'), 0);
  await enter(0);
  await contains('.game-memory [role=status]', 'segunda tarjeta');
  await card(2);
  await contains('.game-memory [role=status]', 'diferentes');
  await card(1);
  assert.equal(await evaluate('document.querySelectorAll(".game-memory-card[data-state=open]").length'), 2);
  await button('Ocultar tarjetas');
  await until('cartas ocultas', () => evaluate('document.querySelectorAll(".game-memory-card[data-state=hidden]").length === 6'));
  for (let index = 0; index < 6; index++) await card(index);
  await result();
  await stopped();
  await contains('.game-results', 'Ganaste 20 XP');
  assert.equal((await plays('memoria'))[0].result.details.errors, 1);
  await button('Volver a jugar');
  await timer();
  await card(0);
  await button('Reiniciar partida');
  assert.equal(await evaluate('document.querySelectorAll(".game-memory-card[data-state=hidden]").length'), 6);
  for (let index = 0; index < 6; index++) await card(index);
  await result();
  await until('segunda partida guardada', async () => (await plays('memoria')).length === 2);
  assert.equal((await plays('memoria')).filter(item => item.rewardXp).length, 1);
  await button('Cambiar opciones');
  await contains('.game-setup', 'Récord de esta configuración');
  await select('Nivel', 'intermedio');
  await start();
  await until('cinco parejas', () => evaluate('document.querySelectorAll(".game-memory-card[data-state=hidden]").length === 10'));
  await listLink();
  await stopped();

  await open('adivina');
  await select('Nivel', 'intermedio');
  await start();
  await contains('.game-quiz .game-progress-label', 'Pregunta 1 de 5');
  assert.equal(await evaluate('document.querySelector(".game-options").children.length'), 4);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.game-options button')).every(button => !button.hasAttribute('data-answer'))`), true);
  assert.equal(await evaluate('document.querySelector(".game-diagram canvas").getAttribute("aria-label").includes("Uno")'), false);
  await until('diagrama dibujado', () => evaluate(`(() => {
    const canvas = document.querySelector('.game-diagram canvas');
    return canvas?.getContext('2d').getImageData(140, 240, 100, 100).data.some(value => value !== 0);
  })()`));
  await button('Dos');
  await contains('.game-quiz [role=status]', '«Uno»');
  await button('Reiniciar partida');
  await contains('.game-quiz .game-progress-label', 'Pregunta 1 de 5');
  assert.equal(await evaluate('!!document.querySelector(".game-quiz [role=status]")'), false);
  await button('Dos');
  await contains('.game-quiz [role=status]', '«Uno»');
  await button('Siguiente pregunta');
  for (const [index, word] of ['Dos', 'Tres', 'Cuatro', 'Cinco'].entries()) {
    await contains('.game-quiz .game-progress-label', `Pregunta ${index + 2} de 5`);
    await button(word);
    await contains('.game-quiz [role=status]', 'correcta');
    await button(word === 'Cinco' ? 'Ver resultados' : 'Siguiente pregunta');
  }
  await result();
  await until('quiz registrado', async () => (await plays('adivina'))[0]?.result.score === 40);
  assert.equal((await plays('adivina'))[0].result.details.bestStreak, 4);
  await listLink();

  await open('desafio');
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".game-settings select:last-of-type option")).slice(-4).map(node => node.value)'), ['0', '30', '60', '90']);
  await select('Duración', '30');
  await start();
  await timer();
  await button('Uno');
  await button('Reiniciar partida');
  await contains('.game-quiz .game-progress-label', 'Pregunta 1 de 30');
  await button('Uno');
  await evaluate('window.gameClockOffset = 30000');
  await result();
  await contains('.game-results', 'Se acabó el tiempo');
  await stopped();
  await evaluate('window.gameClockOffset = 0');
  await until('récord guardado', async () => (await plays('desafio'))[0]?.result.score === 10);
  assert.equal((await plays('desafio'))[0].result.details.elapsedMs, 30000);
  await button('Cambiar opciones');
  await select('Duración', '0');
  await start();
  await contains('.game-quiz .game-progress-label', 'Pregunta 1 de 3');
  await stopped();
  assert.equal(await evaluate('!!document.querySelector("[role=timer]")'), false);
  for (const word of ['Uno', 'Dos', 'Tres']) {
    await button(word);
    await button(word === 'Tres' ? 'Ver resultados' : 'Siguiente pregunta');
  }
  await result();
  await until('partida sin límite guardada', async () => (await plays('desafio')).length === 2);
  await button('Cambiar opciones');
  await select('Duración', '60');
  await start();
  await timer();
  await listLink();
  await stopped();
  assert.equal((await plays('desafio')).length, 2);

  await open('relaciona');
  await select('Vocabulario', 'familia');
  await start();
  await contains('.game-quiz .game-progress-label', 'Pregunta 1 de 3');
  assert.equal(await evaluate('!!document.querySelector(".game-quiz canvas")'), false);
  await button('Familia');
  await contains('.game-quiz [role=status]', 'correcta');
  await button('Reiniciar partida');
  await contains('.game-quiz .game-progress-label', 'Pregunta 1 de 3');
  assert.equal(await evaluate('!!document.querySelector(".game-quiz [role=status]")'), false);
  for (const word of ['Familia', 'Mamá', 'Papá']) {
    await button(word);
    await button(word === 'Papá' ? 'Ver resultados' : 'Siguiente pregunta');
  }
  await result();
  await until('asociaciones registradas', async () => (await plays('relaciona'))[0]?.result.score === 30);
  assert.ok(!requests.some(url => /lsp-v1\.json|handDetection\.worker|mediapipe\/wasm/.test(url)));
  assert.equal(await evaluate('window.studentAttempts'), 0);
  await listLink();

  await open('senas');
  await select('Vocabulario', 'numeros');
  await start();
  await contains('#game-challenge-title', '«Uno»');
  assert.equal(await evaluate('!!document.querySelector(\'.sign-media[data-sign="LSP-001"] img[src*="lsp-001-uno"]\')'), true);
  assert.equal(await evaluate('!!document.querySelector(".sign-media video")'), false);
  assert.equal(await evaluate('!!document.querySelector("[role=timer]")'), false);
  await button('Practicar con cámara');
  const activate = async () => {
    await until('control disponible', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
    await evaluate('document.querySelector(".practice-camera-button").click()');
  };
  await until('práctica cargada', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
  assert.equal(await evaluate('window.studentAttempts'), 0);
  await evaluate('window.studentDeny = true');
  await activate();
  await contains('.practice-camera-error', 'permiso de cámara');
  await evaluate('window.studentDeny = false');
  await activate();
  const worker = () => until('Worker activo', () => evaluate('window.labWorkers.some(item => !item.ended && item.results > 0)'), 30000);
  await worker();
  await link('Ver ficha de Uno en Biblioteca');
  await contains('.library-dialog[open] h2', 'Uno');
  await cameraReleased();
  await link('Volver al desafío');
  await contains('#game-challenge-title', '«Uno»');
  assert.equal(await evaluate('!!document.querySelector(".practice-camera-button")'), false);

  if (datasetPath) {
    const traces = await loadTraces(datasetPath);
    await button('Practicar con cámara');
    await activate();
    await worker();
    await button('Reiniciar partida');
    await cameraReleased();
    assert.equal(await evaluate('!!document.querySelector(".practice-camera-button")'), false);
    await button('Practicar con cámara');
    await activate();
    await worker();
    assert.equal(await evaluate('Math.max(...window.labWorkers.map(item => item.maxActive))'), 1);
    await replayTrace(evaluate, until, traces.different, 'confirmó una seña distinta');
    assert.equal(await evaluate('document.querySelector(".game-challenge").textContent.includes("Guardar práctica con cámara")'), false);
    await button('Reintentar práctica');
    await replayTrace(evaluate, until, traces.correct, 'Coincide con la seña');
    await contains('#game-challenge-title', '«Uno»');
    await button('Guardar práctica con cámara');
    await contains('#game-challenge-title', '«Dos»');
    await cameraReleased();
  }
  for (const word of datasetPath ? ['Dos', 'Tres'] : ['Uno', 'Dos', 'Tres']) {
    await contains('#game-challenge-title', `«${word}»`);
    await button('Hacer ejercicio sin cámara');
    await evaluate('document.querySelector(".situation-alternative input[value=one]").click()');
    await button('Comprobar ejercicio sin cámara');
  }
  await result();
  await until('desafío guardado', async () => (await plays('senas'))[0]?.result.score === 30);
  const [challenge] = await plays('senas');
  assert.equal(challenge.result.details.camera, datasetPath ? 1 : 0);
  assert.equal(challenge.result.details.alternative, datasetPath ? 2 : 3);
  await evaluate('document.querySelector(".theme-toggle").click()');
  await until('tema oscuro', () => evaluate('document.documentElement.dataset.theme === "dark"'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  await send('Emulation.clearDeviceMetricsOverride');

  await send('Page.navigate', { url: origin + '/camara/desafio?cantidad=5' });
  await contains('.game-setup', '5 señas por partida');
  assert.equal((await plays('senas')).length, 1);
  assert.equal(await evaluate(`(${storage}).activities.reduce((sum, item) => sum + (item.rewardXp ?? 0), 0)`), 100);
  assert.ok(requests.every(url => url.startsWith(origin + '/') || /^(blob:|data:)/.test(url)));
  console.log(JSON.stringify({ games: 5, keyboard: true, timedAndUntimed: true, streak: 4, timersReleased: true,
    cameraConfirmedFromRecordings: !!datasetPath, permissionDenied: true, cameraReleased: true, rewardXp: 100, darkMobile: true }));
}
