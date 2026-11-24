import assert from 'node:assert/strict';

// The player fixture is mounted only by the isolated development browser test.
export function mediaFixturePlugin() {
  let video;
  return {
    name: 'senaverse-media-browser-fixture',
    configureServer(server) {
      server.middlewares.use('/__media-test', async (request, response, next) => {
        if (request.url === '/') {
          const html = '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/scripts/fixtures/media-player-fixture.tsx"></script></body></html>';
          response.setHeader('Content-Type', 'text/html');
          response.end(await server.transformIndexHtml('/__media-test/', html));
        } else if (request.url === '/sample.webm' && request.method === 'POST') {
          const chunks = [];
          for await (const chunk of request) chunks.push(chunk);
          video = Buffer.concat(chunks);
          response.statusCode = 204;
          response.end();
        } else if (request.url === '/sample.webm' && video) {
          response.setHeader('Content-Type', 'video/webm');
          response.setHeader('Content-Length', video.length);
          response.end(video);
        } else if (request.url?.startsWith('/frame.svg')) {
          response.setHeader('Content-Type', 'image/svg+xml');
          const color = request.url.endsWith('?second') ? '#30845d' : '#794cca';
          response.end(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${color}"/></svg>`);
        } else if (request.url === '/missing.webm') {
          response.statusCode = 404;
          response.end();
        } else next();
      });
    },
  };
}

export async function checkMedia({ send, evaluate, requests }, origin, until, testPlayer) {
  const navigate = path => send('Page.navigate', { url: origin + path });
  const exists = selector => until(selector, () => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`));
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const decodedPhoto = selector => until('foto cargada', () => evaluate(`(() => {
    const image = document.querySelector(${JSON.stringify(selector)});
    return image?.naturalWidth === 1200 && image?.naturalHeight === 1600;
  })()`));
  const label = (selector, value) => evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].find(
    button => button.textContent.trim() === ${JSON.stringify(value)}).click()`);
  const escape = async () => {
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  };

  await navigate('/');
  await exists('.home-banner-art img');
  await navigate('/biblioteca');
  await exists('.library-filters .library-numbers-icon');
  await click('.library-filter:has(.library-numbers-icon)');
  await decodedPhoto('.library-thumbnail img[src*="lsp-001-uno"]');
  assert.ok(!requests.some(url => url.endsWith('.mp4')));
  const originalClips = [];
  for (let index = 1; index <= 10; index++) {
    if (index === 6) await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
    const id = `LSP-${String(index).padStart(3, '0')}`;
    await navigate(`/biblioteca?sena=${id}`);
    await decodedPhoto('.library-dialog[open] .sign-media-preview img');
    const mediaRequests = requests.filter(url => url.endsWith('.mp4')).length;
    assert.equal(await evaluate('!!document.querySelector(".library-dialog video")'), false);
    await click('.library-dialog .sign-media-load');
    const videoPath = await until(`metadatos de ${id}`, () => evaluate(`(() => {
      const video = document.querySelector('.library-dialog video');
      return video?.readyState >= 2 && video.currentSrc;
    })()`));
    assert.ok(requests.filter(url => url.endsWith('.mp4')).length > mediaRequests);
    assert.match(videoPath, new RegExp(`/media/signs/${id.toLowerCase()}-`));
    assert.deepEqual(await evaluate(`(() => {
      const video = document.querySelector('.library-dialog video');
      const photo = document.querySelector('.library-dialog .sign-media-preview img');
      return [video.controls, video.playsInline, video.paused, video.autoplay, video.poster === photo.src,
        video.videoWidth, video.videoHeight, video.preload, video.duration > 5 && video.duration < 8];
    })()`), [true, true, true, false, true, 848, 478, 'metadata', true]);
    await evaluate('document.querySelector(".library-dialog video").play().then(() => true)');
    await until(`reproducción de ${id}`, () => evaluate('document.querySelector(".library-dialog video")?.currentTime > .1'));
    await evaluate(`(() => {
      const video = document.querySelector('.library-dialog video');
      video.pause();
      video.currentTime = video.duration - .35;
    })()`);
    await until(`búsqueda de tramo de ${id}`, () => evaluate(`(() => {
      const video = document.querySelector('.library-dialog video');
      return !video.seeking && video.readyState >= 2 && Math.abs(video.duration - video.currentTime - .35) < .07;
    })()`));
    if (index === 1 || index === 6) {
      for (const rate of [.5, .75, 1]) {
        assert.equal(await evaluate(`(() => {
          const select = document.querySelector('.library-dialog .sign-media-actions select');
          select.value = '${rate}';
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return document.querySelector('.library-dialog video').playbackRate;
        })()`), rate);
      }
      await label('.library-dialog .sign-media-actions button', 'Repetir video');
      await until('repetición del video original', () => evaluate(`(() => {
        const video = document.querySelector('.library-dialog video');
        return !video.paused && !video.seeking && video.currentTime < 1;
      })()`));
    }
    originalClips.push(id);
  }
  assert.equal(new Set(requests.filter(url => url.endsWith('.mp4'))).size, 10);
  await navigate('/biblioteca?sena=LSP-001');
  await decodedPhoto('.library-dialog[open] .sign-media-preview img');
  assert.equal(await evaluate('!!document.querySelector(".library-dialog video")'), false);
  assert.match(await evaluate('document.querySelector(".library-dialog .practice-reference-link").href'), /minedu\.gob\.pe.*#page=14$/);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  await click('.theme-toggle');
  await until('tema oscuro', () => evaluate('document.documentElement.dataset.theme === "dark"'));
  await click('.library-dialog .sign-media-open');
  await decodedPhoto('.sign-media-dialog[open] img');
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Cerrar ampliación');
  assert.equal(await evaluate(`(() => {
    const dialog = document.querySelector('.sign-media-dialog[open]');
    const photo = dialog.querySelector('img');
    const { width, height } = photo.getBoundingClientRect();
    return dialog.getBoundingClientRect().width <= 390 && width <= dialog.clientWidth
      && Math.abs(width / height - .75) < .01 && getComputedStyle(photo).objectFit === 'contain';
  })()`), true);
  await escape();
  await until('la ficha sigue abierta y se restaura el foco', () => evaluate(
    '!!document.querySelector(".library-dialog[open]") && !document.querySelector(".sign-media-dialog[open]") && document.activeElement.classList.contains("sign-media-open")'));
  await navigate('/biblioteca?sena=hola');
  await exists('.library-dialog[open] .sign-media');
  assert.equal(await evaluate('document.querySelector(".library-dialog .sign-media").textContent.includes("Referencia visual pendiente")'), true);
  assert.equal(await evaluate('!!document.querySelector(".library-dialog .sign-media-open, .library-dialog video")'), false);
  await send('Emulation.clearDeviceMetricsOverride');

  await navigate('/academia/unidad/2/leccion/numeros');
  await exists('#study-step-title');
  await label('.lesson-sequence button', 'Comenzar lección');
  await decodedPhoto('.lesson-sequence .sign-media-preview img');
  assert.equal(await evaluate('document.querySelectorAll(".lesson-number-list .sign-media-preview img").length'), 5);
  assert.equal(await evaluate('document.querySelectorAll(".lesson-number-list .sign-media-load").length'), 5);
  assert.equal(await evaluate('document.querySelectorAll(".lesson-sequence-step .practice-reference-link").length'), 1);
  const before = await evaluate('localStorage.getItem("senaverse-student-progress-v1")');
  await click('.lesson-number-list .sign-media-open');
  await exists('.sign-media-dialog[open]');
  await escape();
  await until('progreso idéntico al volver de la ampliación', () => evaluate(
    `localStorage.getItem('senaverse-student-progress-v1') === ${JSON.stringify(before)} && !document.querySelector('.sign-media-dialog[open]')`));

  await navigate('/camara/libre?sena=LSP-001');
  await decodedPhoto('.practice-workspace .sign-media[data-sign="LSP-001"] img');
  await click('.practice-workspace .sign-media-load');
  await until('video de práctica disponible', () => evaluate('document.querySelector(".practice-workspace video[poster]")?.readyState >= 2'));
  assert.equal(await evaluate('window.studentAttempts'), 0);
  await until('modelo local', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
  await click('.practice-camera-button');
  await until('inferencias locales', () => evaluate('window.labWorkers.some(worker => !worker.ended && worker.results > 0)'), 30000);
  const starts = await evaluate('window.studentAttempts');
  await click('.practice-workspace .sign-media-open');
  await exists('.sign-media-dialog[open]');
  await escape();
  assert.equal(await evaluate('window.labWorkers.filter(worker => !worker.ended).length'), 1);
  assert.equal(await evaluate('window.studentAttempts'), starts);
  await evaluate(`(() => {
    const select = document.querySelector('.practice-select-field select');
    select.value = 'LSP-009';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await exists('.practice-workspace .sign-media[data-sign="LSP-009"]');
  assert.match(await evaluate('document.querySelector(".practice-workspace .sign-media").textContent'), /flecha de giro/);
  assert.match(await evaluate('document.querySelector(".practice-workspace .practice-reference-link").href'), /#page=135$/);
  await decodedPhoto('.practice-workspace .sign-media[data-sign="LSP-009"] img');
  assert.equal(await evaluate('!!document.querySelector(".practice-workspace .sign-media video")'), false);
  await click('.practice-camera-button');
  await until('cámara y Worker liberados', () => evaluate(
    'window.labStreams.flatMap(stream => stream.getTracks()).every(track => track.readyState === "ended") && window.labWorkers.every(worker => worker.ended)'));

  await navigate('/simulador');
  await exists('.situation-illustration img');
  assert.equal(await evaluate('document.querySelectorAll(".situation-illustration img").length'), 6);
  await navigate('/minijuegos');
  await exists('.minigame-art img');
  assert.equal(await evaluate('document.querySelectorAll(".minigame-art img").length'), 5);
  await navigate('/minijuegos/adivina');
  await exists('.game-panel');
  await label('.game-panel button', 'Iniciar partida');
  await exists('.game-observation img');
  const alt = await evaluate('document.querySelector(".game-observation img").alt');
  assert.match(alt, /extendid|recogid/u);
  assert.doesNotMatch(alt, /\b(?:uno|dos|tres|cuatro|cinco)\b/iu);
  assert.ok(requests.every(url => url.startsWith(origin + '/') || /^(blob:|data:)/.test(url)));

  if (testPlayer) {
    await navigate('/__media-test/');
    await exists('[data-sign="fixture-video"] .sign-media-open');
    await click('[data-sign="fixture-video"] .sign-media-open');
    await exists('.sign-media-dialog[open] img[alt="Cuadrado verde"]');
    await until('imágenes cargadas', () => evaluate(
      '[...document.querySelectorAll(".sign-media-dialog[open] img")].every(image => image.complete && image.naturalWidth > 0)'));
    await escape();
    assert.ok(!requests.some(url => url.endsWith('/sample.webm')));
    await evaluate(`(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const stream = canvas.captureStream(12);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      recorder.ondataavailable = event => chunks.push(event.data);
      const stopped = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.start();
      for (let i = 0; i < 12; i++) {
        const context = canvas.getContext('2d');
        context.fillStyle = i < 6 ? '#794cca' : '#30845d';
        context.fillRect(0, 0, 64, 64);
        await new Promise(resolve => setTimeout(resolve, 90));
      }
      recorder.stop();
      await stopped;
      stream.getTracks().forEach(track => track.stop());
      await fetch('/__media-test/sample.webm', { method: 'POST', body: new Blob(chunks) });
    })()`);
    await label('[data-sign="fixture-video"] button', 'Cargar video');
    await until('metadatos del reproductor', () => evaluate('document.querySelector("[data-sign=fixture-video] video")?.readyState >= 2'));
    assert.equal(await evaluate('document.querySelector("[data-sign=fixture-video] video").paused'), true);
    await evaluate(`(async () => {
      const root = document.querySelector('[data-sign=fixture-video]');
      const video = root.querySelector('video');
      const select = root.querySelector('select');
      select.value = '0.5';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await video.play();
      video.pause();
    })()`);
    assert.equal(await evaluate('document.querySelector("[data-sign=fixture-video] video").playbackRate'), 0.5);
    await label('[data-sign="fixture-video"] button', 'Repetir video');
    await until('repetición activa', () => evaluate('!document.querySelector("[data-sign=fixture-video] video").paused'));
    await label('[data-sign="fixture-missing"] button', 'Cargar video');
    await exists('[data-sign="fixture-missing"] [role="status"]');
    assert.equal(await evaluate('!!document.querySelector("[data-sign=fixture-missing] video")'), false);
    await label('[data-sign="fixture-missing"] button', 'Volver a intentar');
    await label('[data-sign="fixture-missing"] button', 'Cargar video');
    await exists('[data-sign="fixture-missing"] [role="status"]');
  }

  console.log(JSON.stringify({ localPhotos: 10, originalClips, desktopClips: 5, mobileWidth390Clips: 5,
    externalRequests: 0, zoomKeyboard: true, studyProgressPreserved: true,
    cameraContinued: true, games: 5, scenarios: 6, nativeVideoFixture: testPlayer, sequenceFixture: testPlayer }));
}
