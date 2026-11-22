import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getEducationalSign } from '../src/data/library.ts';
import { emptyProgress, recordProgressEvent, restoreProgress, summarizeProgress } from '../src/data/progress.ts';
import { createProfileExport, defaultProfile } from '../src/data/profile.ts';
import { getSituationExercise, nextSituationScene, summarizeSituation } from '../src/data/situationStudy.ts';
import { getSituation, getSituationReturnPath, situations } from '../src/data/situations.ts';
import { recognitionSigns } from '../src/features/sign-recognition/recognitionCatalog.ts';

const at = '2026-11-22T15:30:00.000Z';
const dispatch = (state, situationId, type, data = {}) => recordProgressEvent(state, { situationId, type, ...data }, at);

function practiceWithoutCamera(state, situation, scene) {
  const choiceId = scene.expectedSignId;
  const sceneId = scene.id;
  const response = getSituationExercise(scene, getEducationalSign(choiceId)).correctId;
  state = dispatch(state, situation.id, 'situation-select', { sceneId, choiceId });
  state = dispatch(state, situation.id, 'situation-check', { sceneId });
  return dispatch(state, situation.id, 'situation-practice', { sceneId, input: { method: 'alternative', response } });
}

test('the visible catalogue contains six ordered situations, 15 interactions and all ten model classes', () => {
  assert.deepEqual(situations.map(item => item.id), ['tienda', 'comida', 'preguntas', 'actividad', 'utiles', 'cantidad']);
  const targets = new Set();
  let scenes = 0;
  for (const situation of situations) {
    assert.ok(situation.context && situation.objectives.length && situation.rewardXp < 80);
    assert.equal(new Set(situation.scenes.map(scene => scene.id)).size, situation.scenes.length);
    for (const scene of situation.scenes) {
      scenes++;
      assert.ok(scene.context && scene.explanation && scene.optionIds.length >= 2);
      assert.equal(new Set(scene.optionIds).size, scene.optionIds.length);
      assert.ok(scene.optionIds.includes(scene.expectedSignId));
      for (const id of scene.optionIds) {
        const sign = getEducationalSign(id);
        assert.equal(sign.id, id);
        const exercise = getSituationExercise(scene, sign);
        assert.ok(exercise.options.some(option => option.id === exercise.correctId));
        if (sign.recognitionClassId) assert.ok(sign.reference && sign.instructions);
      }
      targets.add(scene.expectedSignId);
    }
  }
  assert.equal(scenes, 15);
  for (const sign of recognitionSigns) assert.ok(targets.has(sign.id));
  assert.ok(targets.has('cero'));
  assert.ok(!targets.has('NEG-001'));
});

test('interactions reject out-of-order, unchecked and incompatible submissions', () => {
  const situationId = 'preguntas';
  let state = dispatch(emptyProgress(), situationId, 'situation-start');
  const before = state;
  assert.equal(dispatch(state, situationId, 'situation-finish'), before);
  assert.equal(dispatch(state, situationId, 'situation-select', { sceneId: 'prestamos', choiceId: 'cero' }), before);
  assert.equal(dispatch(state, situationId, 'situation-select', { sceneId: 'confirmacion', choiceId: 'LSP-010' }), before);
  state = dispatch(state, situationId, 'situation-select', { sceneId: 'confirmacion', choiceId: 'no' });
  const camera = { sceneId: 'confirmacion', input: { method: 'camera', signId: 'LSP-006' } };
  assert.equal(dispatch(state, situationId, 'situation-practice', camera), state);
  state = dispatch(state, situationId, 'situation-check', { sceneId: 'confirmacion' });
  assert.equal(dispatch(state, situationId, 'situation-practice', camera), state);
  assert.equal(dispatch(state, situationId, 'situation-practice', { sceneId: 'confirmacion', input: { method: 'alternative', response: 'LSP-006' } }), state);
  state = dispatch(state, situationId, 'situation-practice', { sceneId: 'confirmacion', input: { method: 'alternative', response: 'no' } });
  assert.equal(nextSituationScene(getSituation(situationId), state.situationStudy[situationId]).id, 'prestamos');
  assert.equal(summarizeSituation(getSituation(situationId), state.situationStudy[situationId]).incorrect, 1);
});

test('camera accepts only the selected compatible class and keeps the contextual score separate', () => {
  const situationId = 'cantidad', sceneId = 'total';
  let state = dispatch(emptyProgress(), situationId, 'situation-start');
  state = dispatch(state, situationId, 'situation-select', { sceneId, choiceId: 'LSP-001' });
  state = dispatch(state, situationId, 'situation-check', { sceneId });
  const withCamera = signId => dispatch(state, situationId, 'situation-practice', { sceneId, input: { method: 'camera', signId } });
  assert.equal(withCamera('LSP-005'), state);
  state = withCamera('LSP-001');
  assert.equal(withCamera('LSP-001'), state);
  assert.deepEqual(summarizeSituation(getSituation(situationId), state.situationStudy[situationId]),
    { completed: 1, correct: 0, incorrect: 1, camera: 1, alternative: 0, errors: 1 });
  assert.equal(summarizeProgress(state).xp, 0);
  assert.deepEqual(restoreProgress(JSON.stringify(state)), state);
});

test('all situations can finish without a camera and the first reward survives replay and reload', () => {
  let state = emptyProgress(), rewarded = 0;
  for (const situation of situations) {
    for (let iteration = 0; iteration < 2; iteration++) {
      state = dispatch(state, situation.id, iteration ? 'situation-repeat' : 'situation-start');
      for (const scene of situation.scenes) state = practiceWithoutCamera(state, situation, scene);
      state = dispatch(state, situation.id, 'situation-finish');
      assert.equal(dispatch(state, situation.id, 'situation-finish'), state);
      const completions = state.activities.filter(item => item.id === `situation:${situation.id}`);
      assert.equal(completions.length, 1);
      assert.equal(completions[0].rewardXp, situation.rewardXp);
      const run = state.situationStudy[situation.id];
      assert.equal(summarizeSituation(situation, run).alternative, situation.scenes.length);
      assert.deepEqual(restoreProgress(JSON.stringify(state)), state);
      if (!iteration) rewarded += situation.rewardXp;
      assert.equal(summarizeProgress(state).xp, rewarded);
    }
  }
  const exported = createProfileExport(defaultProfile(), state);
  assert.equal(exported.progressSummary.xp, 240);
  assert.deepEqual(exported.progress.situationStudy, state.situationStudy);
});

test('old answers are restored without inventing a method, a date or a reward', () => {
  const legacy = JSON.stringify({ tienda: { currentSceneId: 'cantidad', answers: { cantidad: { choiceId: 'dos', checked: true } } },
    'necesito-ayuda': { answers: { 'libro-correcto': { choiceId: 'si', checked: true } } } });
  let state = restoreProgress(null, null, legacy);
  const shop = state.situationStudy.tienda;
  assert.equal(shop.startedAt, null);
  assert.deepEqual(shop.scenes.cantidad, { choiceId: 'LSP-002', checked: true, attempts: ['LSP-002'] });
  assert.equal(state.situationStudy['necesito-ayuda'].scenes['libro-correcto'].choiceId, 'LSP-006');
  assert.equal(nextSituationScene(getSituation('tienda'), shop).id, 'llegada');
  assert.equal(summarizeProgress(state).xp, 0);

  state = restoreProgress(JSON.stringify(state), null, legacy);
  assert.equal(state.situationStudy.tienda.scenes.cantidad.checked, true);
  assert.deepEqual(restoreProgress(JSON.stringify({ ...emptyProgress(), situationStudy: {} }), null, legacy).situationStudy, {});
  assert.equal(getSituationReturnPath({ situationId: 'tienda', sceneId: 'cantidad', filter: 'intermedio' }), '/simulador/tienda/escena/cantidad?nivel=intermedio');
  assert.equal(getSituationReturnPath({ situationId: 'tienda', sceneId: 'no-existe' }), undefined);
});

test('restoration keeps contextual retries while rejecting incompatible and out-of-order practice', () => {
  const saved = { ...emptyProgress(), situationStudy: { preguntas: { startedAt: at, completedAt: at, scenes: {
    confirmacion: { choiceId: 'LSP-006', checked: true, attempts: ['no', 'LSP-006', 'no-existe'], practice: { method: 'camera', signId: 'LSP-001' } },
    prestamos: { choiceId: 'cero', checked: true, attempts: ['cero'], practice: { method: 'alternative', response: 'one' } },
  } } } };
  const state = restoreProgress(JSON.stringify(saved));
  const run = state.situationStudy.preguntas;
  assert.equal(run.completedAt, undefined);
  assert.equal(run.scenes.prestamos.practice, undefined);
  assert.equal(run.scenes.confirmacion.practice, undefined);
  assert.deepEqual(run.scenes.confirmacion.attempts, ['no', 'LSP-006']);
  assert.equal(summarizeProgress(state).xp, 0);
});
