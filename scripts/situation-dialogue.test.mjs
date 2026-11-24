import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyProgress, recordProgressEvent, restoreProgress, summarizeProgress } from '../src/data/progress.ts';
import { getEducationalSign } from '../src/data/library.ts';
import { getSituationVisualExercise, nextSituationScene } from '../src/data/situationStudy.ts';
import { getSituation } from '../src/data/situations.ts';

const at = '2026-11-24T15:30:00.000Z';
const situationId = 'utiles', sceneId = 'cuadernos';
const two = 'LSP-002', three = 'LSP-003', four = 'LSP-004';
const dispatch = (state, type, fields) => recordProgressEvent(state, { type, situationId, sceneId, ...fields }, at);
const select = (state, choiceId) => dispatch(state, 'situation-select', { choiceId });
const start = (state, id = 'initial', method = 'camera') => dispatch(state, 'situation-attempt-start', { attempt: { id, method } });
const result = (state, input, attemptId = 'initial') => dispatch(state, 'situation-attempt-result', { attemptId, input });
const camera = (signId) => ({ method: 'camera', observation: { status: 'recognized', signId } });
const selected = (id) => select(dispatch(emptyProgress(), 'situation-start'), id);
const run = (state) => state.situationStudy[situationId];
const current = (state) => run(state).scenes[sceneId];

for (const [label, choice, observation, contextCorrect, matched] of [
  ['ambas correctas', three, camera(three), true, true],
  ['contexto correcto y otra seña', three, camera(two), true, false],
  ['contexto incorrecto y coincidencia', two, camera(two), false, true],
  ['ambas incorrectas', two, camera(four), false, false],
  ['gesto desconocido', three, { method: 'camera', observation: { status: 'unknown' } }, true, false],
  ['seguimiento insuficiente', three, { method: 'camera', observation: { status: 'tracking' } }, true, false],
]) {
  test(`Cuadernos: ${label} solo avanza con ambas validaciones del mismo intento`, () => {
    const before = selected(choice);
    assert.equal(current(before).checked, false);
    assert.equal(dispatch(before, 'situation-check'), before);
    assert.equal(result(before, observation), before);
    const state = result(start(before), observation);
    const passed = contextCorrect && matched;
    const evaluation = { ...observation, id: 'initial', choiceId: choice, contextCorrect, matched, passed };
    assert.deepEqual(current(state).evaluations, [evaluation]);
    assert.deepEqual(current(state).attempts, [choice]);
    assert.equal(nextSituationScene(getSituation(situationId), run(state)).id, passed ? 'lapices' : sceneId);
    assert.equal(result(state, observation), state);
    assert.equal(dispatch(state, 'situation-finish'), state);
    assert.equal(summarizeProgress(state).xp, 0);
    assert.deepEqual(restoreProgress(JSON.stringify(state)), state);
  });
}

test('Cuadernos invalida el ID al cambiar, reiniciar o restaurar una sesión abierta', () => {
  let state = start(selected(two));
  state = select(state, three);
  assert.equal(result(state, camera(three)), state);
  state = start(start(state, 'second'), 'third');
  assert.equal(result(state, camera(three), 'second'), state);
  assert.equal(result(state, { method: 'visual', response: three }, 'third'), state);
  assert.equal(result(state, camera('cero'), 'third'), state);
  assert.equal(result(state, camera('NEG-001'), 'third'), state);
  const restored = restoreProgress(JSON.stringify(state));
  assert.equal(current(restored).active, undefined);
  assert.equal(result(restored, camera(three), 'third'), restored);
});

test('Cuadernos registra comprensión visual sin afirmar coincidencia gestual', () => {
  const scene = getSituation(situationId).scenes[0];
  const exercise = getSituationVisualExercise(scene, getEducationalSign(three));
  assert.deepEqual(exercise.options.map(option => option.media?.kind), ['photo', 'photo', 'photo']);
  assert.deepEqual(exercise.options.map(option => option.label), ['Demostración A', 'Demostración B', 'Demostración C']);
  let state = result(start(selected(three), 'initial', 'visual'), { method: 'visual', response: two });
  assert.equal(current(state).practice, undefined);
  state = result(start(state, 'next', 'visual'), { method: 'visual', response: three }, 'next');
  assert.deepEqual(current(state).practice, { method: 'alternative', response: three });
  assert.deepEqual(current(state).evaluations.map(item => [item.method, item.matched]), [['visual', false], ['visual', true]]);
  assert.deepEqual(restoreProgress(JSON.stringify(state)), state);
});
