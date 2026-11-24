import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadStaticTraces } from './lesson-browser.mjs';

const storage = 'JSON.parse(localStorage.getItem("senaverse-student-progress-v1"))';
const released = 'window.labStreams.flatMap(stream => stream.getTracks()).every(track => track.readyState === "ended") && window.labWorkers.every(worker => worker.ended)';
const words = ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco'];
const ids = ['relaciona', 'memoria', 'adivina', 'senas', 'desafio'];

export async function checkMinigames({ send, evaluate, requests }, origin, until, datasetPath, screenshots) {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: [
    'Math.random = () => .999;',
    'window.gameClockOffset = 0;',
    'const now = Date.now.bind(Date);',
    'Date.now = () => now() + window.gameClockOffset;',
  ].join('\n') });
  const wait = (description, script) => until(description, () => evaluate(script), 30000);
  const q = JSON.stringify;
  const visible = selector => wait(selector, '!!document.querySelector(' + q(selector) + ')');
  const contains = (selector, text) => wait(text, 'document.querySelector(' + q(selector) + ')?.textContent.includes(' + q(text) + ')');
  const click = selector => wait(selector, '(() => { const node = document.querySelector(' + q(selector) + '); if (!node || node.disabled) return false; node.click(); return true; })()');
  const button = (label, selector = 'button') => wait(label, '(() => { const node = [...document.querySelectorAll(' + q(selector) + ')].find(item => item.textContent.trim() === ' + q(label) + ' && !item.disabled && item.getAttribute("aria-disabled") !== "true"); if (!node) return false; node.click(); return true; })()');
  const select = (name, value) => evaluate('(() => { const node = [...document.querySelectorAll(".game-settings label")].find(item => item.firstChild.textContent.trim() === ' + q(name) + ').querySelector("select"); node.value = ' + q(value) + '; node.dispatchEvent(new Event("change", { bubbles: true })); })()');
  const score = () => evaluate('Number(document.querySelector("[data-score]").textContent)');
  const errors = () => evaluate('Number(document.querySelector("[data-errors]").textContent)');
  const record = id => evaluate('(' + storage + ').activities.filter(item => item.targetId === ' + q(id) + ')');
  const start = () => button('Iniciar partida');
  const results = () => visible('#game-results-title');

  async function open(id, theme) {
    await send('Page.navigate', { url: origin + '/minijuegos/' + id });
    await visible('.game-setup');
    await evaluate('localStorage.setItem("senaverse-theme-v1",' + q(theme) + '); document.documentElement.dataset.theme = ' + q(theme));
  }

  async function device(width, height, mobile) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, mobile, deviceScaleFactor: 1 });
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  }

  async function screenshot(name) {
    if (!screenshots) return;
    await mkdir(screenshots, { recursive: true });
    await evaluate('document.fonts.ready.then(async () => { window.scrollTo({top:0,behavior:"instant"}); for (const img of document.querySelectorAll(".minigame-session img")) img.loading = "eager"; await Promise.all([...document.querySelectorAll(".minigame-session img")].map(img=>img.decode())); return true; })');
    const { cssContentSize } = await send('Page.getLayoutMetrics');
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 } });
    await writeFile(join(screenshots, name + '.png'), Buffer.from(data, 'base64'));
  }

  async function space(selector) {
    await evaluate('document.querySelector(' + q(selector) + ').focus()');
    const key = { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 };
    await send('Input.dispatchKeyEvent', { ...key, type: 'keyDown', text: ' ', unmodifiedText: ' ' });
    await send('Input.dispatchKeyEvent', { ...key, type: 'keyUp' });
  }

  async function touch(selector) {
    const point = await evaluate('(() => { const node = document.querySelector(' + q(selector) + '); node.scrollIntoView({block:"center",behavior:"instant"}); const rect = node.getBoundingClientRect(); return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }; })()');
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  async function drag(source, destination) {
    await evaluate('(() => { const transfer = new DataTransfer(); for (const [selector, type] of ' + q([[source, 'dragstart'], [destination, 'dragover'], [destination, 'drop']])
      + ') document.querySelector(selector).dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer })); })()');
  }

  await send('Page.navigate', { url: origin + '/minijuegos' });
  await wait('cinco portadas', 'document.querySelectorAll(".minigame-card a").length === 5 && document.querySelectorAll(".minigame-art img").length === 5');

  for (const [layout, width, height, mobile, theme] of [['escritorio', 1440, 980, false, 'light'], ['movil', 390, 844, true, 'dark']]) {
    await device(width, height, mobile);
    for (const id of ids) {
      await open(id, theme);
      await start();
      const prefix = layout + '-' + theme + '-' + id;
      if (id === 'relaciona') {
        await visible('[data-source-index="0"]');
        const input = mobile ? touch : space;
        await input('[data-source-index="0"]');
        await input('[data-destination-index="2"]');
        await contains('.game-association [role="status"]', '1 conexiones');
        await drag('[data-source-index="1"]', '[data-destination-index="1"]');
        await click('[data-source-index="2"]');
        await click('[data-destination-index="0"]');
        await button('Comprobar conexiones');
        await wait('dos conexiones incorrectas', 'document.querySelectorAll("[data-source-index][data-pair=wrong]").length === 2');
        await screenshot(prefix + '-partida');
        await click('[data-source-index="1"]'); await click('[data-destination-index="0"]');
        await click('[data-source-index="2"]'); await click('[data-destination-index="1"]');
        await button('Comprobar conexiones');
      } else if (id === 'memoria') {
        await visible('.game-memory-card');
        assert.equal(await evaluate('document.querySelectorAll(".game-memory-card img").length'), 0);
        const card = index => '.game-memory-card:nth-child(' + (index + 1) + ')';
        await space(card(0)); await click(card(2));
        await contains('.game-memory [role=status]', 'no forman pareja');
        await button('Ocultar tarjetas');
        await click(card(0)); await click(card(1)); await click(card(2));
        await screenshot(prefix + '-partida');
        for (const index of [3, 4, 5]) await click(card(index));
      } else if (id === 'senas') {
        await button('Ocultar secuencia y empezar');
        assert.equal(await evaluate('document.querySelectorAll(".game-sequence-slot canvas, .game-sequence-slot img").length'), 0);
        for (const index of [0, 2, 1]) await click('[data-choice-index="' + index + '"]');
        await button('Comprobar secuencia');
        await contains('.game-sequence [role=status]', 'posición 2');
        await button('Ver ayuda'); await button('Ocultar ayuda');
        await click('[data-choice-index="1"]');
        await screenshot(prefix + '-partida');
        await click('[data-choice-index="2"]'); await button('Comprobar secuencia');
      } else {
        const count = id === 'desafio' ? 5 : 3;
        if (id === 'desafio') await contains('.game-countdown', 'Empieza en');
        await visible('.game-observation img');
        assert.equal(await evaluate(`(() => {
          const box = document.querySelector('.game-observation').getBoundingClientRect();
          const image = document.querySelector('.game-observation img');
          const rect = image.getBoundingClientRect();
          return getComputedStyle(image).objectFit === 'contain' && rect.height <= box.height && rect.width <= box.width;
        })()`), true, 'La foto completa cabe en el visor de ' + id);
        for (let index = 0; index < count; index++) {
          await button(words[index], '.game-options button');
          await contains('.game-quiz-feedback', 'Correcto.');
          if (!index) {
            if (id === 'adivina') { await button('Volver a observar con el diagrama'); await button('Volver a la fotografía'); }
            await screenshot(prefix + '-partida');
          }
          await button(index === count - 1 ? 'Ver resultados' : 'Siguiente seña');
        }
      }
      await results();
      await screenshot(prefix + '-resultado');
      const plays = await record(id);
      assert.equal(plays.length, mobile ? 2 : 1);
      assert.equal(plays.reduce((sum, item) => sum + (item.rewardXp ?? 0), 0), 20);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, prefix);
      await button('Cambiar opciones');
      if (id === 'senas') await contains('.game-setup', 'Récord con ayuda');
      else await contains('.game-setup', 'Récord');
      await start();
      await button('Abandonar partida');
      assert.equal((await record(id)).length, plays.length);
    }
  }

  for (const [width, height, mobile, theme] of [[1440, 980, false, 'dark'], [390, 844, true, 'light']]) {
    await device(width, height, mobile);
    for (const id of ids) {
      await open(id, theme); await start(); await visible('.game-score');
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, id + ' ' + theme);
      await button('Abandonar partida');
    }
  }

  await device(1440, 980, false);
  await open('desafio', 'light');
  await select('Modalidad', 'camera'); await select('Duración', '30'); await start();
  await evaluate('window.studentDeny = true');
  await click('.practice-camera-button');
  await contains('.game-camera', 'permiso');
  assert.equal(await score(), 0);
  await evaluate('window.studentDeny = false; window.studentFailure = "NotFoundError"');
  await click('.practice-camera-button');
  await contains('.game-camera', 'No se encontró');
  await evaluate('window.studentFailure = null');
  await click('.practice-camera-button');
  await wait('Worker y cámara listos', 'window.labWorkers.some(worker => !worker.ended && worker.results > 0)');
  await visible('[data-target]');
  await screenshot('escritorio-light-desafio-camara-partida');
  assert.equal(await score(), 0);
  assert.equal(await errors(), 0);

  let recordedGestures = false;
  if (datasetPath) {
    const traces = await loadStaticTraces(datasetPath, ['LSP-001', 'LSP-002', 'LSP-003']);
    const useTrace = async id => {
      const hands = id ? traces[id].frames[0].hands : [];
      const trace = { frames: [{ time: 0, result: { landmarks: hands.map(hand => hand.landmarks),
        handedness: hands.map(hand => hand.handedness), worldLandmarks: hands.map(hand => hand.worldLandmarks) } }], started: null, cursor: 0 };
      await evaluate('window.studentTrace = ' + q(trace));
    };
    await useTrace('LSP-002');
    await wait('gesto diferente registrado', 'Number(document.querySelector("[data-errors]").textContent) === 1');
    await useTrace('LSP-001');
    await new Promise(resolve => setTimeout(resolve, 1800));
    assert.equal(await score(), 0, 'Cambiar sin retirar la mano no rearma');
    await useTrace(null);
    await contains('.game-camera-status', 'Buscando manos');
    await useTrace('LSP-001');
    await wait('primer objetivo reconocido', 'Number(document.querySelector("[data-score]").textContent) === 10');
    await new Promise(resolve => setTimeout(resolve, 1800));
    assert.equal(await score(), 10, 'Mantener la postura no repite puntos');
    await useTrace(null);
    await contains('.game-camera-status', 'Buscando manos');
    await useTrace('LSP-002');
    await wait('segundo objetivo reconocido', 'Number(document.querySelector("[data-score]").textContent) === 20');
    recordedGestures = true;
    await evaluate('window.studentTrace = null');
  }
  await evaluate('window.gameClockOffset = 31000');
  await results();
  await screenshot('escritorio-light-desafio-camara-resultado');
  await wait('cámara liberada', released);

  await open('senas', 'dark'); await select('Modalidad', 'camera'); await start();
  await button('Ocultar secuencia y empezar');
  await click('.practice-camera-button');
  await wait('cámara preparada en secuencia', 'window.labWorkers.some(worker => !worker.ended && worker.results > 0)');
  await screenshot('escritorio-dark-senas-camara-partida');
  await button('Abandonar partida');
  await wait('cámara liberada al abandonar', released);
  assert.equal((await record('senas')).length, 2);

  // Feed an existing educational video through a browser capture track and the real Worker.
  await open('desafio', 'dark'); await select('Modalidad', 'camera'); await start();
  await evaluate(`(async () => {
    const video = document.createElement('video');
    video.src = '/media/signs/lsp-001-uno.mp4';
    video.muted = video.loop = video.playsInline = true;
    await video.play();
    video.currentTime = video.duration * .55;
    await new Promise(resolve => video.addEventListener('seeked', resolve, { once: true }));
    video.pause();
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const context = canvas.getContext('2d');
    const stream = canvas.captureStream(0);
    const [track] = stream.getVideoTracks();
    const draw = () => {
      context.fillStyle = '#222';
      context.fillRect(0, 0, 640, 480);
      const width = video.videoWidth * 480 / video.videoHeight;
      context.drawImage(video, (640 - width) / 2, 0, width, 480);
      track.requestFrame();
    };
    draw();
    const timer = setInterval(draw, 32);
    navigator.mediaDevices.getUserMedia = async () => {
      window.labStreams.push(stream);
      return stream;
    };
    window.gameVideo = { video, timer };
    return true;
  })()`);
  await click('.practice-camera-button');
  try {
    await wait('video educativo procesado por el Worker', 'window.gameVideo.video.currentTime > 0 && window.labWorkers.some(worker => !worker.ended && worker.results >= 3)');
  } catch (error) {
    const diagnostic = await evaluate('({videoTime: window.gameVideo.video.currentTime, preview: document.querySelector(".game-camera video")?.getVideoPlaybackQuality(), camera: document.querySelector(".game-camera")?.textContent, results: window.labWorkers.map(worker=>worker.results), errors: window.labWorkerErrors})');
    throw new Error(error.message + ' · ' + JSON.stringify(diagnostic), { cause: error });
  }
  await visible('[data-target]');
  const clipStart = Date.now();
  let educationalVideoPoints = await score();
  while (!educationalVideoPoints && Date.now() - clipStart < 6000) {
    await new Promise(resolve => setTimeout(resolve, 250));
    educationalVideoPoints = await score();
  }
  await screenshot('escritorio-dark-desafio-video-educativo');
  const educationalVideoDetector = await evaluate('document.querySelector(".game-camera .practice-recognition-state").textContent.trim()');
  await button('Abandonar partida');
  await wait('pista del video liberada', released);
  await evaluate('clearInterval(window.gameVideo.timer); window.gameVideo.video.pause()');

  await open('memoria', 'light');
  await contains('.game-setup', 'Récord');
  assert.equal((await record('memoria')).length, 2);
  assert.ok(requests.some(url => url.includes('/media/signs/')));
  console.log(JSON.stringify({ games: ids, layouts: 2, themes: 2, touch: true, keyboard: true, drag: true, syntheticCamera: true,
    recordedGestures, educationalVideo: true, educationalVideoPoints, educationalVideoDetector, denied: true, absent: true, released: true }));
}
