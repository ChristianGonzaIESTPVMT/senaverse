import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { units } from '../../src/data/curriculum.ts';
import { headerIllustrations } from '../../src/data/illustrations.ts';
import { getEducationalSign } from '../../src/data/library.ts';
import { minigames } from '../../src/data/minigames.ts';
import { getSituationExercise } from '../../src/data/situationStudy.ts';
import { getSituationPath, getSituationScenePath, situations } from '../../src/data/situations.ts';

const dimensions = [[320, 720], [360, 800], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]];
const reading = units[0].lessons.find(lesson => lesson.id === 'comunicacion-visual')
  .plan.steps.find(step => step.kind === 'reading');
const pages = [
  ['inicio', '/', '.home-dashboard'],
  ['aprender', '/academia', '.learning-page'],
  ['unidad', '/academia/unidad/2', '.learning-unit-page'],
  ['leccion', '/academia/unidad/2/leccion/numeros', '#study-step-title'],
  ['lectura', '/academia/unidad/1/leccion/comunicacion-visual', '#study-step-title'],
  ['biblioteca', '/biblioteca', '.library-page'],
  ['ficha', '/biblioteca?sena=LSP-001', '.library-dialog[open]'],
  ['camara', '/camara?sena=LSP-001', '.camera-center .practice-workspace'],
  ['practica-libre', '/camara/libre?sena=LSP-001', '.practice-page .practice-workspace'],
  ['situaciones', '/simulador', '.situations-page'],
  ['escena', '/simulador/tienda', '.situation-scene-page'],
  ['minijuegos', '/minijuegos', '.minigames-page'],
  ['partida', '/minijuegos/memoria', '.game-setup'],
  ['progreso', '/progreso', '.progress-page'],
  ['perfil', '/perfil', '.profile-page'],
  ['presentacion', '/presentacion', '.landing'],
];
const covers = {
  inicio: [headerIllustrations.learningRoute],
  aprender: units.map(unit => unit.cover),
  unidad: [units[1].cover],
  lectura: [reading.illustration],
  camara: [headerIllustrations.practice],
  situaciones: situations.map(situation => situation.illustrationSrc),
  escena: [situations[0].illustrationSrc],
  minijuegos: minigames.map(game => game.cover),
  presentacion: [headerIllustrations.presentation],
};

export async function checkFairAudit({ send, evaluate, requests, errors, failedResponses }, origin, until, output) {
  const data = [];
  const layoutIssues = [];
  const snapshots = [];
  if (output) await mkdir(output, { recursive: true });
  const capture = async (label, width, height, theme) => {
    if (!output) return;
    const { data: png } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const filename = `${width}x${height}-${theme}-${label}.png`;
    await writeFile(join(output, filename), Buffer.from(png, 'base64'));
    snapshots.push(filename);
  };
  const exists = selector => until(selector, () => evaluate(`location.origin === ${JSON.stringify(origin)} && !!document.querySelector(${JSON.stringify(selector)})`));
  const navigate = path => send('Page.navigate', { url: origin + path });
  const navigateInApp = path => evaluate(`(() => {
    history.pushState({ idx: (history.state?.idx ?? 0) + 1 }, '', ${JSON.stringify(path)});
    dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  })()`);
  const illustrationSelector = 'img[src*="/images/illustrations/"]';
  const checkIllustrations = async name => {
    if (name === 'lectura') {
      await until('lección Comunicación visual', () => evaluate('document.querySelector(".learning-lesson-page h1")?.textContent === "Comunicación visual"'));
      await evaluate(`document.querySelector(".lesson-sequence-nav .button-primary").textContent.includes("Comenzar lección")
        && document.querySelector(".lesson-sequence-nav .button-primary").click()`);
      await exists('.lesson-reading-illustration');
    }
    const expected = covers[name];
    if (expected) await exists(illustrationSelector);
    const actual = await evaluate(`Promise.all([...document.querySelectorAll(${JSON.stringify(illustrationSelector)})].map(async image => {
      const { loading, alt } = image;
      image.loading = 'eager';
      await image.decode();
      const rect = image.getBoundingClientRect();
      return { src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight,
        reserved: image.naturalWidth === +image.getAttribute('width') && image.naturalHeight === +image.getAttribute('height'),
        visible: rect.width > 0 && rect.height > 0,
        intact: getComputedStyle(image).objectFit === 'contain' || Math.abs(rect.width * image.naturalHeight / image.naturalWidth - rect.height) < 1,
        loading, alt };
    }))`);
    assert.deepEqual(actual.map(({ src, width, height }) => ({ src, width, height })), (expected ?? []).map(asset =>
      ({ src: '/' + asset.src, width: asset.width, height: asset.height })), name);
    assert.ok(actual.every(image => image.reserved && image.visible && image.intact), name);
    assert.ok(actual.every(image => image.loading === (['inicio', 'presentacion'].includes(name) ? 'eager' : 'lazy')), name);
    if (name === 'lectura') assert.match(actual[0].alt, /iluminado/);
  };
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Performance.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  const performance = [];
  for (const [name, route, selector] of pages.filter(([name]) => ['inicio', 'aprender', 'camara'].includes(name))) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await navigate(route);
      await exists(selector);
      await evaluate('document.fonts.ready.then(() => true)');
      await until('documento cargado', () => evaluate('document.readyState === "complete"'));
      performance.push(await evaluate(`(() => {
        const nav = window.performance.getEntriesByType('navigation')[0];
        const entries = window.performance.getEntriesByType('resource');
        return { page: ${JSON.stringify(name)}, domMs: Math.round(nav.domContentLoadedEventEnd),
          loadedMs: Math.round(nav.loadEventEnd), readyMs: Math.round(window.performance.now()),
          transferBytes: nav.transferSize + entries.reduce((sum, item) => sum + item.transferSize, 0),
          resources: entries.length, workers: window.labWorkers.length,
          engineDownloads: entries.filter(item => /\.wasm|hand_landmarker|handDetection\.worker/.test(item.name)).length };
      })()`));
    }
  }
  await send('Network.setCacheDisabled', { cacheDisabled: false });
  const coldMetrics = Object.fromEntries((await send('Performance.getMetrics')).metrics.map(({ name, value }) => [name, value]));

  for (const theme of ['light', 'dark']) {
    await evaluate(`localStorage.setItem('senaverse-theme-v1', ${JSON.stringify(theme)})`);
    await navigate('/');
    await exists('.home-dashboard');
    for (const [width, height] of dimensions) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
      for (const [name, route, selector] of pages) {
        await navigateInApp(route);
        await exists(selector);
        await checkIllustrations(name);
        await evaluate('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => resolve(true))))');
        await evaluate('window.scrollTo({ top: 0, behavior: "instant" })');
        const report = await evaluate(`(() => {
          const { clientWidth, scrollWidth } = document.documentElement;
          const controlOutside = [...document.querySelectorAll('a, button, input, select, textarea, canvas')].flatMap(el => {
            if (el.matches('.app-skip-link') || !el.getClientRects().length) return [];
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || (rect.left >= -1 && rect.right <= clientWidth + 1)) return [];
            return [[el.tagName, el.getAttribute('class'), el.getAttribute('aria-label') ?? el.textContent.trim().slice(0, 70), Math.round(rect.left), Math.round(rect.right)]];
          }).slice(0, 10);
          const clippedDiagrams = [...document.querySelectorAll('.sign-media-diagram canvas')].flatMap(canvas => {
            const frame = canvas.parentElement.getBoundingClientRect(), rect = canvas.getBoundingClientRect();
            return rect.height > 0 && (rect.top < frame.top - 1 || rect.bottom > frame.bottom + 1)
              ? [[canvas.getAttribute('aria-label'), Math.round(frame.height), Math.round(rect.height)]] : [];
          });
          const internalOverflow = [];
          for (const field of document.querySelectorAll('.learning-banner-stat dt, .learning-banner-stat dd')) {
            const panel = field.closest('.learning-banner-stat').getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(field);
            if ([...range.getClientRects()].some(rect => rect.right > panel.right + 1 || rect.left < panel.left - 1)) internalOverflow.push(field.textContent);
          }
          const teaser = document.querySelector('.lesson-teaser'), benefits = document.querySelector('.hero-benefits');
          if (teaser && benefits && teaser.getBoundingClientRect().bottom > benefits.getBoundingClientRect().top) internalOverflow.push('Etiquetas de Presentación');
          return { clientWidth, scrollWidth, innerWidth, actualTheme: document.documentElement.dataset.theme, controlOutside, clippedDiagrams, internalOverflow };
        })()`);
        const row = { name, route, width, height, theme, ...report };
        data.push(row);
        if (report.actualTheme !== theme || report.scrollWidth > width + 1 || report.controlOutside.length || report.clippedDiagrams.length || report.internalOverflow.length) layoutIssues.push(row);
        const exhibition = ['presentacion', 'inicio', 'aprender', 'situaciones', 'escena', 'minijuegos', 'camara', 'lectura'];
        if (exhibition.includes(name) && (width === 390 || (width === 1366 && theme === 'light') || (width === 1920 && theme === 'dark'))) {
          if (name === 'lectura') await evaluate('document.querySelector(".lesson-sequence-step").scrollIntoView({ behavior: "instant" })');
          await capture(name, width, height, theme);
          if (name === 'presentacion' && width === 390) {
            await evaluate('document.querySelector(".lesson-teaser").scrollIntoView({ behavior: "instant", block: "center" })');
            await capture('presentacion-detalle', width, height, theme);
          }
        }
      }
    }
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('/biblioteca?sena=LSP-001');
  await exists('.library-dialog[open] .sign-media-open');
  await evaluate('document.querySelector(".library-dialog .sign-media-open").click()');
  await exists('.sign-media-dialog[open] .sign-media-image img');
  await capture('visor', 390, 844, 'dark');
  await navigate('/academia/unidad/2/leccion/numeros');
  await exists('#study-step-title');
  await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.includes("Comenzar lección")).click()');
  await exists('.lesson-number-list');
  await capture('actividad', 390, 844, 'dark');
  await navigate('/minijuegos/memoria');
  await exists('.game-setup');
  await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.includes("Iniciar partida")).click()');
  await exists('.game-memory');
  await capture('tablero', 390, 844, 'dark');
  await navigate('/');
  await exists('.app-bottom-nav button');
  await evaluate('document.querySelector(".app-bottom-nav button").click()');
  await exists('.app-menu-dialog[open]');
  await capture('menu', 390, 844, 'dark');
  await navigate('/progreso');
  await exists('.progress-achievements button');
  await evaluate('document.querySelector(".progress-achievements button").click()');
  await exists('.progress-dialog[open]');
  const badges = await evaluate(`[...document.querySelectorAll('.progress-dialog[open] .progress-badge-art > span > svg')].map(icon => icon.outerHTML)`);
  assert.equal(badges.length, 10);
  assert.equal(new Set(badges).size, 10);
  await capture('insignias', 390, 844, 'dark');
  await send('Emulation.clearDeviceMetricsOverride');

  const summary = { cases: data.length, layoutIssues, performance, errors, failedResponses, snapshots,
    metrics: { jsHeapBytes: coldMetrics.JSHeapUsedSize, jsHeapTotalBytes: coldMetrics.JSHeapTotalSize },
    requests: requests.length, external: requests.filter(url => !url.startsWith(origin + '/') && !/^(blob:|data:)/.test(url)),
    engineRequests: requests.filter(url => /\.wasm|hand_landmarker|handDetection\.worker/.test(url)) };
  if (output) await writeFile(join(output, 'mediciones.json'), JSON.stringify({ ...summary, cases: data }, null, 2));
  console.log(JSON.stringify(summary));
  assert.equal(summary.external.length, 0);
  assert.equal(summary.engineRequests.length, 0);
  assert.deepEqual(summary.errors, []);
  assert.deepEqual(summary.failedResponses, []);
  assert.deepEqual(summary.layoutIssues, []);
}

export async function checkFairJourneys({ send, evaluate, requests }, origin, until) {
  const key = 'senaverse-student-progress-v1';
  const navigate = path => send('Page.navigate', { url: origin + path });
  const read = () => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
  const exists = selector => until(selector, () => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`));
  const click = (selector, label) => until(label, () => evaluate(`(() => {
    const control = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.textContent.trim() === ${JSON.stringify(label)} && !el.disabled);
    if (!control) return false;
    control.click();
    return true;
  })()`));
  const select = (selector, value) => until(value, () => evaluate(`(() => {
    const input = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.value === ${JSON.stringify(value)});
    if (!input) return false;
    input.click();
    return true;
  })()`));
  const keyboard = async key => {
    const virtual = { Tab: 9, Enter: 13, Escape: 27 }[key];
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: virtual });
  };

  await navigate('/');
  await exists('.home-dashboard');
  assert.match(await evaluate('document.querySelector(".home-learning").textContent'), /0\/12.*0.*0 días/s);
  assert.match(await evaluate('document.querySelector(".home-recent").textContent'), /Tus actividades aparecerán.*Tus logros aparecerán/s);
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".home-explore-link")].map(link => link.pathname)'), ['/academia', '/biblioteca', '/simulador', '/camara', '/minijuegos']);
  await keyboard('Tab');
  assert.equal(await evaluate('document.activeElement.className'), 'app-skip-link');
  await keyboard('Enter');
  assert.equal(await evaluate('document.activeElement.id'), 'contenido');

  const otherDocument = '(function(){ localStorage.setItem(' + JSON.stringify(key) + ', JSON.stringify({version:1, consultedSignIds:["LSP-003"], activities:[{id:"lesson:repaso-basico",type:"lesson",targetId:"repaso-basico",occurredAt:null}]})); })()';
  await evaluate(`(() => {
    const iframe = document.createElement('iframe'); iframe.hidden = true;
    iframe.srcdoc = '<script>' + ${JSON.stringify(otherDocument)} + '<' + '/script>';
    document.body.append(iframe);
  })()`);
  await until('XP del otro documento', () => evaluate('document.querySelector(".app-example-xp").textContent.includes("80 XP")'));
  await click('.home-explore-link', 'Ver señas');
  await exists('.library-page');
  await evaluate(`document.querySelector('[aria-label="Ver seña: Hola"]').click()`);
  await exists('.library-dialog[open]');
  assert.deepEqual((await read()).consultedSignIds, ['LSP-003', 'hola']);
  assert.equal((await read()).activities[0].id, 'lesson:repaso-basico');
  await keyboard('Escape');

  await navigate('/biblioteca?sena=LSP-001');
  await exists('.library-dialog[open] .sign-media-image img');
  await evaluate('document.querySelector(".library-dialog[open] .sign-media-image img").decode().then(() => true)');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await exists('.library-dialog[open] .external-reference-status');
  assert.equal(await evaluate('!!document.querySelector(".library-dialog[open] .sign-media-image img")'), true);
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await until('restauración del enlace externo', () => evaluate('!document.querySelector(".library-dialog[open] .external-reference-status")'));

  const runScenario = async situation => {
    for (const [index, scene] of situation.scenes.entries()) {
      const path = getSituationScenePath(situation.id, scene.id);
      await until(path, () => evaluate(`location.pathname === ${JSON.stringify(path)}`));
      await exists('.situation-options');
      assert.equal(await evaluate('!!document.querySelector(".situation-story .situation-illustration img")'),
        !(scene.dialogue || situation.illustrationAfterAnswer || scene.illustrationAfterAnswer));
      await select('.situation-options input', scene.expectedSignId);
      if (!scene.dialogue) {
        await click('.situation-question button', 'Comprobar alternativa');
        await exists('.situation-answer-feedback.is-correct');
      } else {
        assert.equal(await evaluate('!!document.querySelector(".situation-context-art,.situation-attempt-feedback")'), false);
      }
      await click('.situation-question-actions button', 'Hacer ejercicio sin cámara');
      const exercise = getSituationExercise(scene, getEducationalSign(scene.expectedSignId));
      await select('.situation-alternative input', exercise.correctId);
      await click('.situation-alternative button', 'Comprobar ejercicio sin cámara');
      assert.ok(await evaluate(`document.querySelector('.situation-scene-reply')?.textContent.includes(${JSON.stringify(scene.reply)})`));
      const asset = await evaluate('document.querySelector(".situation-scene-page .situation-illustration img")?.getAttribute("src")');
      assert.equal(asset, '/' + situation.illustrationSrc.src);
      await click('.situation-navigation :is(a,button)', index + 1 === situation.scenes.length ? 'Finalizar situación' : 'Continuar a la siguiente interacción');
    }
    await exists('.situation-results-panel');
    assert.match(await evaluate('document.querySelector(".situation-results-note").textContent'), /40 XP/);
  };
  for (const situation of situations) {
    await navigate(getSituationPath(situation.id));
    await runScenario(situation);
  }
  assert.equal(situations.reduce((total, situation) => total + situation.scenes.length, 0), 15);
  await click('.situation-results-panel button', 'Repetir situación');
  await runScenario(situations.at(-1));
  const saved = await read();
  const rewards = saved.activities.filter(item => item.type === 'situation' && item.rewardXp);
  assert.equal(rewards.length, 6);
  assert.equal(rewards.reduce((total, item) => total + item.rewardXp, 0), 240);
  assert.equal(await evaluate('window.studentAttempts'), 0);
  assert.ok(!requests.some(url => /(?:lsp-v1\.json|\.wasm|hand_landmarker|handDetection\.worker)/.test(url)));
  await navigate('/progreso');
  await exists('.progress-page');
  assert.match(await evaluate('document.querySelector(".progress-page").textContent'), /320 XP/);

  await evaluate(`(() => {
    const previous = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === ${JSON.stringify(key)}) throw new DOMException('Prueba de almacenamiento bloqueado', 'QuotaExceededError');
      previous.call(this, key, value);
    };
  })()`);
  await click('.app-navigation a', 'Biblioteca');
  await exists('.library-page');
  await until('ficha por abrir', () => evaluate(`(() => { const entry = document.querySelector('[aria-label="Ver seña: Gracias"]'); if (!entry) return false; entry.click(); return true; })()`));
  await exists('.app-content > .lesson-warning[role="status"]');
  assert.ok(!(await read()).consultedSignIds.includes('gracias'));
  console.log(JSON.stringify({ newProfile: true, shortcutRoutes: 5, skipLink: true, secondDocumentStorage: true, blockedStorage: true,
    externalOfflineWarning: true, situations: 6, scenes: 15, rewardsXp: 240, repeatedRewardXp: 0, cameraAttempts: 0 }));
}
