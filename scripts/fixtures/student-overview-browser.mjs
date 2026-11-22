import assert from 'node:assert/strict';
import { loadTraces, replayTrace } from './lesson-browser.mjs';

const progressKey = 'senaverse-student-progress-v1';
const profileKey = 'senaverse-student-profile-v1';
const lesson = '/academia/unidad/2/leccion/numeros';
const released = 'window.labStreams.flatMap(item => item.getTracks()).every(track => track.readyState === "ended") && window.labWorkers.every(worker => worker.ended)';

export async function checkStudentOverview({ send, evaluate, requests }, origin, until, datasetPath) {
  const navigate = path => send('Page.navigate', { url: origin + path });
  const waitText = (selector, value) => until(value, () => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent.includes(${JSON.stringify(value)})`));
  const findClick = (selector, label) => until(label, () => evaluate(`(() => {
    const item = [...document.querySelectorAll(${JSON.stringify(selector)})].find(node => node.textContent.trim() === ${JSON.stringify(label)} && !node.disabled);
    if (!item) return false;
    item.click();
    return true;
  })()`));
  const step = value => waitText('#study-step-title', value);
  const stored = () => evaluate(`JSON.parse(localStorage.getItem('${progressKey}'))`);
  const reload = async () => {
    const timeOrigin = await evaluate('performance.timeOrigin');
    await send('Page.reload');
    await until('documento recargado', () => evaluate(`performance.timeOrigin !== ${timeOrigin}`));
  };

  await navigate('/');
  await waitText('.home-banner', 'Introducción a la LSP');
  assert.equal(await evaluate('document.querySelector(".home-continue").pathname'), '/academia/unidad/1/leccion/introduccion');
  await waitText('.home-learning', '0 días');
  await navigate('/progreso');
  await waitText('.progress-page', 'Aún no hay actividades educativas fechadas');
  await waitText('.progress-overall', '0 de 12');
  assert.equal(await evaluate('window.studentAttempts'), 0);

  await evaluate(`(() => {
    const today = Date.now();
    const yesterday = new Date(today - 86400000).toISOString();
    const twoDaysAgo = new Date(today - 172800000).toISOString();
    localStorage.setItem('${progressKey}', JSON.stringify({ version: 1, consultedSignIds: ['uno'], activities: [
      { id: 'lesson:saludos', type: 'lesson', targetId: 'saludos', occurredAt: null },
      { id: 'minigame:old-run', type: 'minigame', targetId: 'memoria', occurredAt: twoDaysAgo,
        result: { score: 30, maxScore: 30, details: { settings: { difficulty: 'basico', category: 'numeros', duration: 0 },
          limit: 3, elapsedMs: 6000, correct: 3, errors: 1, bestStreak: 2, camera: 0, alternative: 0 } } }
      ], situationStudy: { preguntas: { startedAt: yesterday, scenes: { confirmacion: { choiceId: 'LSP-006', attempts: ['LSP-006'], checked: true,
        practice: { method: 'alternative', response: 'one' }, practiceAt: yesterday } } } }
    }));
    localStorage.setItem('${profileKey}', JSON.stringify({ version: 1, displayName: 'Lucía', bio: 'Estoy aprendiendo LSP', avatarId: 'cat' }));
    localStorage.setItem('senaverse-library-saved-v1', '["dos"]');
  })()`);
  await reload();
  await waitText('.progress-motivation', 'Nivel 2');
  await waitText('.progress-motivation', '2 días');
  await waitText('.progress-overall', '1 finalización anterior');
  await waitText('.progress-record-list', '30 puntos de partida');
  assert.equal(await evaluate('document.querySelectorAll(".progress-week meter").length'), 7);
  await findClick('.progress-history-link', 'Ver historial');
  await waitText('.progress-dialog[open]', 'Fecha no disponible');
  await findClick('.progress-dialog[open] button[aria-label="Cerrar historial"]', '');

  await navigate('/academia/unidad/2/leccion/abecedario');
  await waitText('.learning-lesson-page', 'Material preliminar');
  assert.equal(await evaluate('document.body.textContent.includes("Marcar como completada")'), false);
  await navigate(lesson);
  await step('Objetivos');
  await findClick('.lesson-sequence button', 'Comenzar lección');
  await step('Observa');
  await navigate('/');
  await waitText('.home-banner', 'Observa');
  await waitText('.home-learning', '3 días');
  await waitText('.home-recent', 'Constancia');
  await findClick('a.home-continue', 'Continuar aprendiendo');
  await step('Observa');
  await navigate('/');
  await findClick('a.home-overview-link', 'Continuar situación');
  await waitText('#situation-scene-title', 'Préstamos devueltos');

  await navigate('/perfil');
  await waitText('#profile-student-name', 'Lucía');
  await waitText('.profile-learning', 'Racha actual de 3 días');
  await waitText('.profile-learning', 'Constancia');
  await waitText('.profile-learning', '100 XP acumulados');
  await reload();
  await waitText('.profile-learning', '100 XP acumulados');
  await waitText('.profile-learning', 'Racha actual de 3 días');
  const saved = await stored();
  assert.deepEqual(saved.consultedSignIds, ['LSP-001']);
  assert.equal(saved.consultedAt, undefined);
  assert.equal(saved.activities.filter(activity => activity.id === 'minigame:old-run').length, 1);
  assert.equal(saved.activities.find(activity => activity.id === 'lesson:saludos').occurredAt, null);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("senaverse-student-profile-v1")).avatarId'), 'cat');
  await evaluate('document.querySelector(".theme-toggle").click()');
  await until('tema oscuro', () => evaluate('document.documentElement.dataset.theme === "dark"'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  await findClick('.profile-learning a', 'Ver mi progreso');
  await waitText('.progress-motivation', 'Nivel 2');
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  await findClick('.progress-section-heading button', 'Ver todos');
  await waitText('.progress-dialog[open]', 'Explorador de señas');
  assert.equal(await evaluate('document.querySelector(".progress-dialog[open]").scrollWidth === document.querySelector(".progress-dialog[open]").clientWidth'), true);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await until('cierre por teclado', () => evaluate('!document.querySelector(".progress-dialog[open]")'));
  await send('Emulation.clearDeviceMetricsOverride');
  await navigate('/biblioteca');
  await waitText('.library-refinements', 'Favoritos (1)');
  await evaluate('document.querySelectorAll(".library-refinements input")[1].click()');
  await until('favorito restaurado', () => evaluate('document.querySelector(\'button[aria-label="Dos en favoritos"]\')?.getAttribute("aria-pressed") === "true"'));
  assert.equal(await evaluate('window.studentAttempts'), 0);
  assert.ok(!requests.some(url => /lsp-v1\.json|handDetection\.worker|mediapipe\/wasm/.test(url)));

  if (datasetPath) {
    await navigate('/camara/libre?sena=LSP-001');
    await until('modelo listo', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
    assert.equal(await evaluate('window.studentAttempts'), 0);
    await evaluate('document.querySelector(".practice-camera-button").click()');
    await until('Worker activo', () => evaluate('window.labWorkers.some(item => !item.ended && item.results > 0)'), 30000);
    const traces = await loadTraces(datasetPath);
    await replayTrace(evaluate, until, traces.different, 'confirmó una seña distinta');
    assert.equal(await evaluate('document.body.textContent.includes("Guardar práctica con cámara")'), false);
    await findClick('.practice-recognition-result button', 'Reintentar práctica');
    await replayTrace(evaluate, until, traces.correct, 'Coincide con la seña');
    assert.equal((await stored()).activities.filter(item => item.type === 'camera').length, 0);
    await findClick('.practice-recognition-result button', 'Guardar práctica con cámara');
    await waitText('.practice-recognition-result', 'Práctica experimental guardada');
    await until('coincidencia persistente', async () => (await stored()).activities.filter(item => item.type === 'camera').length === 1);
    await evaluate('document.querySelector(\'a[href="/progreso"]\').click()');
    await waitText('.progress-recent', 'Coincidencia experimental con cámara');
    await until('recursos liberados', () => evaluate(released));
    const [activity] = (await stored()).activities.filter(item => item.type === 'camera');
    assert.deepEqual(activity.result, { recognized: true });
    assert.equal(activity.rewardXp, undefined);
    await waitText('.progress-motivation', '100 XP acumulados');
  }
  console.log(JSON.stringify({ freshProfile: true, historyWithoutDate: true, threeDayStreak: true, olderXp: 100, lessonResumed: true,
    situationResumed: true, profileAndFavorites: true, cameraStoredFromRecording: !!datasetPath, darkMobile: true }));
}
