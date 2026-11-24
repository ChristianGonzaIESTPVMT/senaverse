import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { trailingWindow } from '../../ml/web/features.mjs';
import { simulate } from '../../ml/scripts/replay_session.mjs';
import { parseLabModel } from '../../src/features/sign-recognition/labModel.ts';

const route = '/academia/unidad/2/leccion/numeros';
const storage = 'JSON.parse(localStorage.getItem("senaverse-student-progress-v1"))';
const allReleased = 'window.labStreams.flatMap(s => s.getTracks()).every(t => t.readyState === "ended") && window.labWorkers.every(w => w.ended)';

export async function loadTraces(datasetPath) {
  const model = parseLabModel(JSON.parse(await readFile('public/models/lsp-v1.json', 'utf8')));
  const { samples } = JSON.parse(await readFile(datasetPath, 'utf8'));
  const aspect = sample => sample.captureMetadata.configuration.processingWidth / sample.captureMetadata.configuration.processingHeight;
  const usable = samples.filter(sample => sample.reviewStatus === 'accepted' && aspect(sample) === 4 / 3);
  function posture(labelId) {
    return usable.find(sample => sample.labelId === labelId && sample.frames.every(frame => frame.hands.length === 1)
      && model.predictor.classify(trailingWindow(sample.frames, 4 / 3)).labelId === labelId
      && model.predictor.classify(trailingWindow(Array.from({ length: 28 }, (_, i) => ({
        timestampMs: i * 50, hands: sample.frames.at(-1).hands,
      })), 4 / 3)).labelId === labelId);
  }
  const unknown = usable.find(sample => {
    if (sample.labelId !== 'NEG-001') return false;
    const states = simulate(model, { frames: sample.frames, configuration: sample.captureMetadata.configuration,
      recordingStart: sample.captureMetadata.recordingStartedAtMs });
    return states.some(state => state.status === 'unknown' || state.reason === 'hand-count')
      && states.every(state => state.status !== 'recognized');
  });
  const traces = { correct: posture('LSP-001'), different: posture('LSP-002'), unknown };
  for (const key of Object.keys(traces)) assert.ok(traces[key], `Se requiere una captura real utilizable para ${key}.`);
  return traces;
}

// Repeat one real landmark frame so test assertions do not depend on video scheduling.
export async function loadStaticTraces(datasetPath, labels) {
  const model = parseLabModel(JSON.parse(await readFile('public/models/lsp-v1.json', 'utf8')));
  const { samples } = JSON.parse(await readFile(datasetPath, 'utf8'));
  return Object.fromEntries(labels.map(label => {
    const candidates = samples.filter(sample => sample.reviewStatus === 'accepted' && sample.labelId === label
      && sample.captureMetadata.configuration.processingWidth / sample.captureMetadata.configuration.processingHeight === 4 / 3);
    const candidate = candidates.flatMap(sample => {
      const hands = sample.frames.at(-1)?.hands;
      if (hands?.length !== 1) return [];
      const frames = Array.from({ length: 25 }, (_, index) => ({ timestampMs: index * 60, hands }));
      const prepared = trailingWindow(frames, 4 / 3);
      if (!prepared.features) return [];
      const prediction = model.predictor.classify(prepared);
      const usable = label === 'NEG-001'
        ? prediction.reason === 'low-confidence' || prediction.reason === 'low-margin' : prediction.labelId === label;
      return usable ? [{ hands, strength: label === 'NEG-001' ? -prediction.margin : prediction.margin }] : [];
    }).sort((a, b) => b.strength - a.strength)[0];
    assert.ok(candidate, `Se requiere una postura reproducible de ${label}.`);
    return [label, { frames: [{ timestampMs: 0, hands: candidate.hands }] }];
  }));
}

export async function replayTrace(evaluate, until, sample, expected, afterConfirmation) {
  const frames = sample.frames.map(frame => ({ time: frame.timestampMs, result: {
    landmarks: frame.hands.map(hand => hand.landmarks), handedness: frame.hands.map(hand => hand.handedness),
  } }));
  await evaluate(`(() => {
    const result = document.querySelector('.practice-student-result');
    window.studentTrace = { frames: ${JSON.stringify(frames)}, cursor: 0, started: null, statuses: new Set() };
    window.studentTrace.observer = new MutationObserver(() => window.studentTrace.statuses.add(result.textContent));
    window.studentTrace.observer.observe(result, { subtree: true, childList: true, characterData: true });
  })()`);
  try {
    await until(expected, () => evaluate(`[...window.studentTrace.statuses].some(status => status.includes(${JSON.stringify(expected)}))`));
    await afterConfirmation?.();
  } catch (error) {
    const diagnostics = await evaluate(`({ statuses: [...window.studentTrace.statuses], cursor: window.studentTrace.cursor,
      size: [...document.querySelectorAll('video')].map(video => [video.videoWidth, video.videoHeight]),
      workers: window.labWorkers.map(worker => [worker.ended, worker.results]) })`);
    throw new Error(`${error.message}. ${JSON.stringify(diagnostics)}`, { cause: error });
  } finally {
    await evaluate('window.studentTrace.observer.disconnect(); window.studentTrace = null');
  }
}

export async function checkLesson({ send, evaluate, requests }, origin, until, datasetPath) {
  const click = label => evaluate(`Array.from(document.querySelectorAll('button')).find(button =>
    button.textContent.trim() === ${JSON.stringify(label)} && !button.disabled).click()`);
  const step = title => until(title, () => evaluate(`document.querySelector('#study-step-title')?.textContent === ${JSON.stringify(title)}`));
  const select = (field, value) => evaluate(`(() => {
    const control = document.querySelectorAll('.lesson-answer-fields select')[${field}];
    control.value = ${JSON.stringify(value)};
    control.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  const radio = (group, value) => evaluate(`Array.from(document.querySelectorAll('.lesson-answer-fields')[${group}].querySelectorAll('input'))
    .find(control => control.value === ${JSON.stringify(value)}).click()`);
  const status = message => until(message, () => evaluate(`document.querySelector('.practice-student-result')
    ?.textContent.includes(${JSON.stringify(message)})`));
  const released = () => until('pistas y Workers liberados', () => evaluate(allReleased));
  const next = () => click('Continuar');
  const check = () => click('Comprobar respuestas');
  await send('Page.navigate', { url: origin + route });
  await step('Objetivos de la lección');
  assert.equal(await evaluate(`(${storage})?.lessonStudy !== undefined`), false);
  await click('Comenzar lección');
  await step('Observa las cinco señas');
  assert.match(await evaluate('document.querySelector(".lesson-sequence-step a").href'), /minedu\.gob\.pe.*#page=14$/);
  assert.equal(await evaluate('document.querySelectorAll(".lesson-number-list dt").length'), 5);
  await next();
  await step('De la seña a la cantidad');
  await until('video de cantidades listo', () => evaluate('document.querySelector(".quiz-sign-video")?.readyState >= 1'));
  assert.equal(await evaluate('!!document.querySelector(".lesson-quiz-review,.lesson-answer-explanation")'), false);
  await radio(0, 'LSP-001');
  await check();
  await until('respuesta incorrecta', () => evaluate('document.querySelector(".lesson-sequence-step [role=status]")?.textContent.includes("0 de 1")'));
  await radio(0, 'LSP-002');
  await check();
  await next();
  await step('Relaciona las configuraciones');
  for (const [i, id] of ['LSP-003', 'LSP-005', 'LSP-001'].entries()) await select(i, id);
  await check();
  await next();
  await step('Practica «Uno»');
  assert.equal(await evaluate('window.labWorkers.length'), 0);
  assert.ok(!requests.some(url => url.endsWith('/models/lsp-v1.json') || /RecognitionPractice|PracticeCamera|handDetection\.worker/.test(url)));
  await click('Practicar con cámara');
  await until('carga del modelo controlada', () => evaluate('!!document.querySelector(".practice-recognition-error")'));
  await evaluate('window.studentBlockModel = false; window.studentDeny = true');
  await click('Reintentar carga');
  const activate = async () => {
    await until('cámara habilitada', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
    await evaluate('document.querySelector(".practice-camera-button").click()');
  };
  await activate();
  await until('permiso denegado', () => evaluate('document.querySelector(".practice-camera-error")?.textContent.includes("permiso de cámara")'));
  await evaluate('window.studentDeny = false');
  await activate();
  await until('inferencias en la lección', () => evaluate('window.labWorkers.some(worker => worker.results > 0)'), 30000);
  await status('Buscando manos');
  await evaluate('document.querySelector(".practice-overlay-toggle input").click()');
  assert.equal(await evaluate('document.querySelector(".practice-hand-overlay").style.opacity'), '');
  await activate();
  await released();
  await activate();
  await until('cámara reactivada antes de cambiar de actividad', () => evaluate('window.labWorkers.some(worker => !worker.ended)'));
  await click('Anterior');
  await step('Relaciona las configuraciones');
  await released();
  await next();
  await step('Practica «Uno»');

  if (datasetPath) {
    const traces = await loadTraces(datasetPath);
    await click('Practicar con cámara');
    await activate();
    await until('cámara reactivada', () => evaluate('document.querySelector(".practice-camera-button").textContent.includes("Desactivar")'));
    await replayTrace(evaluate, until, traces.different, 'confirmó una seña distinta');
    assert.equal(await evaluate('document.body.textContent.includes("Guardar práctica y continuar")'), false);
    await click('Reintentar práctica');
    await replayTrace(evaluate, until, traces.unknown, 'Gesto no reconocido');
    assert.equal(await evaluate('document.body.textContent.includes("Guardar práctica y continuar")'), false);
    await click('Reintentar práctica');
    await replayTrace(evaluate, until, traces.correct, 'Coincide con la seña');
    assert.equal(await evaluate(`(${storage}).lessonStudy.numeros.steps["practica-1"] === undefined`), true);
    await until('coincidencia disponible antes de apagar', () => evaluate('document.body.textContent.includes("Guardar práctica y continuar")'));
    await activate();
    await released();
    assert.equal(await evaluate('document.body.textContent.includes("Guardar práctica y continuar")'), false);
    await activate();
    await until('cámara reanudada después de apagar', () => evaluate('window.labWorkers.some(worker => !worker.ended && worker.results > 0)'), 30000);
    await replayTrace(evaluate, until, traces.correct, 'Coincide con la seña');
    await replayTrace(evaluate, until, traces.different, 'confirmó una seña distinta');
    assert.equal(await evaluate('document.body.textContent.includes("Guardar práctica y continuar")'), false);
    await click('Reintentar práctica');
    await replayTrace(evaluate, until, traces.correct, 'Coincide con la seña');
    await click('Guardar práctica y continuar');
    await step('Practica «Dos»');
    await released();
  }

  async function alternative(id, wrong = false) {
    await click('Hacer ejercicio sin cámara');
    if (wrong) {
      await radio(0, 'LSP-005');
      await check();
      await until('alternativa incorrecta', () => evaluate('document.querySelector(".lesson-sequence-step [role=status]")?.textContent.includes("0 de 1")'));
    }
    await radio(0, id);
    await check();
    await next();
  }
  if (!datasetPath) await alternative('LSP-001');
  await alternative('LSP-002', true);
  await step('Practica «Tres»');
  await send('Page.reload');
  await step('Practica «Tres»');
  await evaluate('window.studentBlockModel = false');
  await click('Practicar con cámara');
  await activate();
  await until('cámara de Tres activada', () => evaluate('window.labStreams.length === 1 && window.labWorkers.some(worker => !worker.ended)'));
  await evaluate('document.querySelector(\'a[href="/biblioteca"]\').click()');
  await until('salida de la lección', () => evaluate('location.pathname === "/biblioteca"'));
  await released();
  await send('Page.navigate', { url: origin + route });
  await step('Practica «Tres»');
  await evaluate('window.studentBlockModel = false');
  await click('Practicar con cámara');
  await activate();
  await until('cámara abierta antes de cambiar de método', () => evaluate('window.labStreams.length === 1 && window.labWorkers.some(worker => !worker.ended)'));
  await click('Hacer ejercicio sin cámara');
  assert.equal(await evaluate('!!document.querySelector(".practice-camera-button")'), false);
  await released();
  await radio(0, 'LSP-003');
  await check();
  await next();
  await alternative('LSP-004');
  await alternative('LSP-005');
  await step('Evaluación final');
  assert.equal(await evaluate(`(${storage}).activities.length`), 0);
  assert.equal(await evaluate('document.querySelectorAll(".lesson-answer-fields :is(.quiz-sign-image,.quiz-sign-video,.quiz-sign-diagram)").length'), 5);
  assert.equal(await evaluate('!!document.querySelector(".lesson-quiz-review,.lesson-answer-explanation,.sign-media-credit")'), false);
  assert.equal(await evaluate(`[...document.querySelectorAll('.lesson-answer-fields [alt],.lesson-answer-fields [aria-label]')]
    .every(element => !/\\b(Uno|Dos|Tres|Cuatro|Cinco)\\b/i.test(element.getAttribute('alt') ?? element.getAttribute('aria-label')))`), true);
  for (const [group, id] of ['LSP-002', 'LSP-002', 'LSP-003', 'LSP-004', 'LSP-005'].entries()) await radio(group, id);
  await check();
  await until('calificación real', () => evaluate('document.querySelector(".lesson-sequence-step [role=status]")?.textContent.includes("4 de 5")'));
  assert.ok(await evaluate('document.querySelectorAll(".lesson-quiz-review a").length >= 5'));
  await click('Ver resumen');
  await step('Resumen de la lección');
  await click('Finalizar lección');
  await until('lección completada', () => evaluate('document.body.textContent.includes("Lección completada y guardada")'));
  await evaluate('document.querySelector(".theme-toggle").click()');
  await until('tema oscuro', () => evaluate('document.documentElement.dataset.theme === "dark"'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  await send('Emulation.clearDeviceMetricsOverride');
  await send('Page.reload');
  await step('Resumen de la lección');
  const saved = await evaluate(storage);
  assert.equal(saved.activities.length, 1);
  assert.equal(saved.activities[0].id, 'lesson:numeros');
  assert.equal(saved.lessonStudy.numeros.steps['practica-1'].attempts[0].input.method, datasetPath ? 'camera' : 'alternative');
  assert.equal(saved.lessonStudy.numeros.steps['practica-2'].attempts[0].input.method, 'alternative');
  assert.equal(saved.lessonStudy.numeros.steps.evaluacion.attempts[0].grade.score, 4);
  assert.equal(await evaluate('document.body.textContent.includes("Finalizar lección")'), false);
  assert.ok(requests.every(url => url.startsWith(origin + '/') || /^(blob:|data:)/.test(url)));
  console.log(JSON.stringify({ route, assessment: '4/5', completions: 1,
    cameraRecognitionsVerifiedFromRecordings: !!datasetPath, staleMatchDismissed: !!datasetPath, deniedPermission: true, released: true, responsive: true }));
}
