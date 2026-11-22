import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { simulate } from '../../ml/scripts/replay_session.mjs';
import { functionalLessons, getLessonLocation, getLessonPath } from '../../src/data/curriculum.ts';
import { questionFields } from '../../src/data/lessonPlan.ts';
import { parseLabModel } from '../../src/features/sign-recognition/labModel.ts';
import { replayTrace } from './lesson-browser.mjs';

const storage = 'JSON.parse(localStorage.getItem("senaverse-student-progress-v1"))';

export async function checkCurriculum({ send, evaluate, requests }, origin, until, datasetPath) {
  const navigate = path => send('Page.navigate', { url: origin + path });
  const text = (selector, value) => until(value, () => evaluate(
    `document.querySelector(${JSON.stringify(selector)})?.textContent.includes(${JSON.stringify(value)})`));
  const stepTitle = title => text('#study-step-title', title);
  const click = (selector, label) => until(label, () => evaluate(`(() => {
    const item = [...document.querySelectorAll(${JSON.stringify(selector)})].find(node =>
      node.textContent.trim() === ${JSON.stringify(label)} && !node.disabled);
    if (!item) return false;
    item.click();
    return true;
  })()`));
  const press = label => click('.lesson-sequence button', label);
  const input = (group, fieldId, option, index = Number(fieldId)) => evaluate(`(() => {
    const group = document.querySelectorAll('.lesson-sequence .lesson-answer-fields')[${group}];
    const choice = ${JSON.stringify(option)};
    if (${JSON.stringify(fieldId)} === 'choice') {
      [...group.querySelectorAll('input')].find(control => control.value === choice).click();
      return;
    }
    const select = group.querySelectorAll('select')[${JSON.stringify(index)}];
    select.value = choice;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  const answer = async (questions, wrongFirst = false) => {
    for (const [group, { activity }] of questions.entries()) {
      for (const [index, field] of questionFields(activity).entries()) {
        const choice = wrongFirst && group === 0 && index === 0
          ? activity.options.find(option => option.id !== field.correctId).id : field.correctId;
        await input(group, field.id, choice, index);
      }
    }
    await press('Comprobar respuestas');
  };
  const reload = async () => {
    const current = await evaluate('performance.timeOrigin');
    await send('Page.reload');
    await until('recarga completa', () => evaluate(`performance.timeOrigin !== ${current}`));
  };
  const assertFits = async width => {
    const size = await evaluate(`(() => {
      const { clientWidth, scrollWidth } = document.documentElement;
      return { clientWidth, scrollWidth, innerWidth, path: location.pathname,
        overflow: [...document.querySelectorAll('body *')].flatMap(el => {
          const { left, right } = el.getBoundingClientRect();
          return right > clientWidth + 1 || left < -1 ? [[el.getAttribute('class'), Math.round(left), Math.round(right)]] : [];
        }).slice(0, 12) };
    })()`);
    assert.equal(size.innerWidth, width, JSON.stringify(size));
    assert.ok(size.scrollWidth <= width, JSON.stringify(size));
  };

  await navigate('/academia/unidad/1/leccion/saludos');
  await text('h1', 'Saludos básicos');
  assert.equal(await evaluate('location.pathname'), '/academia/unidad/3/leccion/saludos');
  await navigate('/academia');
  await text('.learning-page', '6 unidades · 12 lecciones disponibles');
  await click('.learning-unit-card h3 a', 'Unidad 1 · Primeros pasos');
  await text('.learning-unit-page', 'Material preliminar');
  await click('.learning-lesson-open', 'Comenzar');

  for (const [index, { unit, lesson }] of functionalLessons.entries()) {
    const { plan } = lesson;
    await text('h1', lesson.title);
    assert.equal(await evaluate('location.pathname'), getLessonPath(unit.id, lesson.id));
    for (const step of plan.steps) {
      await stepTitle(step.title);
      if (step.kind === 'intro') {
        await press('Comenzar lección');
      } else if (step.kind === 'study' || step.kind === 'reading') {
        assert.match(await evaluate('document.querySelector(".lesson-sequence-step .practice-reference-link").href'), /minedu.gob.pe/);
        if (lesson.id === 'cero') {
          assert.equal(await evaluate('!!document.querySelector(".lesson-sequence canvas")'), true);
          await click('.lesson-number-list a', 'Ver ficha en Biblioteca');
          await text('.library-dialog[open]', 'Cero');
          assert.match(await evaluate('document.querySelector(".library-meaning a").href'), /#page=14$/);
          assert.equal(await evaluate(`!!document.querySelector('.library-dialog-actions a[href^="/camara"]')`), false);
          await click('.library-dialog-actions a', 'Volver a la lección');
          await stepTitle(step.title);
        }
        await press('Continuar');
      } else if (step.kind === 'practice') {
        if (step.notice) {
          await text('.lesson-sequence-step', step.notice);
          assert.equal(await evaluate('[...document.querySelectorAll(".lesson-sequence button")].some(button => button.textContent.includes("Practicar con cámara"))'), true);
        }
        await press('Hacer ejercicio sin cámara');
        await answer(step.alternative);
        await press('Continuar');
      } else if (step.kind === 'question') {
        if (lesson.id === 'comunicacion-visual') {
          await input(0, '0', '1');
          await input(0, '1', '1');
          await input(0, '2', '0');
          assert.equal(await evaluate('[...document.querySelectorAll(".lesson-sequence button")].find(button => button.textContent === "Comprobar respuestas").disabled'), true);
          await reload();
          await stepTitle(step.title);
        }
        if (lesson.id === 'cero') {
          assert.equal(await evaluate('!!document.querySelector(".lesson-answer-fields canvas")'), true);
          assert.equal(await evaluate('!!document.querySelector(".lesson-answer-explanation")'), false);
        }
        await answer(step.questions);
        await press('Continuar');
      } else {
        await answer(step.questions, lesson.id === 'repaso-cotidiano');
        await press('Ver resumen');
      }
    }
    await stepTitle('Resumen de la lección');
    await press('Finalizar lección');
    await text('.lesson-sequence [role=status]', 'Lección completada y guardada');
    if (index + 1 < functionalLessons.length) await click('.lesson-sequence a', 'Siguiente lección');
  }

  await text('.lesson-result-list', '5 de 6 correctas');
  await text('.lesson-result-list', 'Repasa las referencias');
  await press('Revisar evaluación');
  await text('.lesson-sequence-step', 'Incorrecta. La respuesta correcta es «Tres».');
  await press('Repetir evaluación');
  assert.equal(await evaluate('!!document.querySelector(".lesson-answer-explanation")'), false);
  const integration = functionalLessons.at(-1).lesson.plan.steps.at(-1);
  await answer(integration.questions);
  await text('.lesson-sequence [role=status]', '6 de 6 correctas');
  await reload();
  await stepTitle('Resumen de la lección');
  await text('.lesson-result-list', '6 de 6 correctas');
  const saved = await evaluate(storage);
  assert.equal(saved.activities.filter(activity => activity.type === 'lesson').length, 12);
  assert.equal(saved.lessonStudy['repaso-cotidiano'].steps.evaluacion.reviewAttempts.length, 1);
  assert.equal(await evaluate('window.studentAttempts'), 0);
  assert.ok(!requests.some(url => /lsp-v1\.json|handDetection\.worker|mediapipe\/wasm/.test(url)));

  await click('a', 'Mi progreso');
  await text('.progress-overall', '12 de 12 lecciones funcionales');
  await text('.progress-evaluations', 'Evaluación integradora · 6 de 6 · 2 intentos');
  await text('.progress-page', '960 XP');
  await click('a', 'Aprender');
  await text('.learning-banner-stats', '100%');
  await text('#learning-banner-title', 'Nivel básico completado');
  for (const width of [390, 768]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, mobile: width === 390, deviceScaleFactor: 1 });
    await assertFits(width);
    await evaluate('document.querySelector(".theme-toggle").click()');
    await until('tema cambiado', () => evaluate(`document.documentElement.dataset.theme === "${width === 390 ? 'dark' : 'light'}"`));
    await navigate('/academia/unidad/6/leccion/repaso-cotidiano');
    await stepTitle('Resumen de la lección');
    await assertFits(width);
    await press('Revisar evaluación');
    await assertFits(width);
    await navigate('/academia');
    await text('.learning-banner-stats', '100%');
  }
  await send('Emulation.clearDeviceMetricsOverride');
  if (datasetPath) {
    const { samples } = JSON.parse(await readFile(datasetPath, 'utf8'));
    const model = parseLabModel(JSON.parse(await readFile('public/models/lsp-v1.json', 'utf8')));
    const sample = samples.find(item => {
      if (item.labelId !== 'LSP-010' || item.reviewStatus !== 'accepted') return false;
      const { configuration, recordingStartedAtMs } = item.captureMetadata;
      return configuration.processingWidth / configuration.processingHeight === 4 / 3
        && simulate(model, { frames: item.frames, configuration, recordingStart: recordingStartedAtMs })
          .some(view => view.status === 'recognized' && view.stableId === 'LSP-010');
    });
    assert.ok(sample, 'Se requiere una captura real de Con confirmada en la reproducción original.');
    const { unit, lesson } = getLessonLocation('elecciones-y-compania');
    await evaluate('localStorage.removeItem("senaverse-student-progress-v1")');
    await navigate(getLessonPath(unit.id, lesson.id));
    await stepTitle('Antes de empezar');
    await press('Comenzar lección');
    await stepTitle('Observa Solo y Con');
    await press('Continuar');
    await stepTitle('Practica Solo');
    await press('Hacer ejercicio sin cámara');
    const solo = lesson.plan.steps.find(step => step.targetId === 'LSP-009');
    await answer(solo.alternative);
    await press('Continuar');
    await stepTitle('Practica Con');
    await evaluate('window.studentBlockModel = false');
    await press('Practicar con cámara');
    await until('modelo listo para Con', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
    await evaluate('document.querySelector(".practice-camera-button").click()');
    await until('cámara y detector activos para Con', () => evaluate('window.labWorkers.some(worker => !worker.ended && worker.results > 0)'), 30000);
    await replayTrace(evaluate, until, sample, 'Coincide con la seña');
    assert.equal(await evaluate(`(${storage}).lessonStudy["elecciones-y-compania"].steps["practica-lsp-010"] === undefined`), true);
    await press('Guardar práctica y continuar');
    await stepTitle('Evaluación de la lección');
    await until('liberación de cámara y Worker', () => evaluate(
      'window.labStreams.length > 0 && window.labStreams.flatMap(stream => stream.getTracks()).every(track => track.readyState === "ended") && window.labWorkers.every(worker => worker.ended)'));
    const run = (await evaluate(storage)).lessonStudy['elecciones-y-compania'];
    assert.deepEqual(run.steps['practica-lsp-010'].attempts[0].input, { method: 'camera', signId: 'LSP-010' });
    assert.equal(run.steps.evaluacion, undefined);
  }
  console.log(JSON.stringify({ units: 6, lessons: 12, grade: '5/6 → 6/6', xp: 960, cameraRequests: 0,
    libraryReturn: true, historicalRoute: true, refresh: true, responsiveWidths: [390, 768],
    guidedConFromRecording: !!datasetPath }));
}
