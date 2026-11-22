import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLessonLocation, units } from '../src/data/curriculum.ts';
import { questionFields } from '../src/data/lessonPlan.ts';
import { nextStudyStep } from '../src/data/lessonStudy.ts';
import { emptyProgress, recordProgressEvent, restoreProgress, summarizeProgress } from '../src/data/progress.ts';
import { createProfileExport, defaultProfile } from '../src/data/profile.ts';

const lessonId = 'numeros';
const { lesson: { plan }, unit } = getLessonLocation(lessonId);
const now = '2026-11-22T10:30:00Z';
const record = (state, event) => recordProgressEvent(state, { lessonId, ...event }, now);
const send = (state, stepId, input) => record(state, { type: 'lesson-step', stepId, input });
const read = { method: 'read' };
const begin = () => record(emptyProgress(), { type: 'lesson-start' });

function correctAnswers(questions) {
  return Object.fromEntries(questions.map(({ id, activity }) => [
    id, Object.fromEntries(questionFields(activity).map(field => [field.id, field.correctId])),
  ]));
}

function walk(state, end = plan.steps.length) {
  for (const step of plan.steps.slice(nextStudyStep(plan, state.lessonStudy.numeros), end)) {
    const questions = step.kind === 'practice' ? step.alternative : step.questions;
    state = send(state, step.id, questions ? {
      method: step.kind === 'practice' ? 'alternative' : 'answers', answers: correctAnswers(questions),
    } : read);
  }
  return state;
}

test('the existing numbers lesson has one ordered plan and five stable recognized targets', () => {
  assert.equal(unit.id, 2);
  assert.equal(units.flatMap(item => item.lessons).filter(item => item.id === 'numeros').length, 1);
  assert.equal(new Set(plan.steps.map(step => step.id)).size, plan.steps.length);
  assert.deepEqual(plan.steps.filter(step => step.kind === 'practice').map(step => step.targetId),
    ['LSP-001', 'LSP-002', 'LSP-003', 'LSP-004', 'LSP-005']);
});

test('ordered completion, valid alternatives, recognized target checks and XP idempotence', () => {
  let state = walk(begin(), 4);
  assert.equal(summarizeProgress(state).xp, 0);
  assert.equal(record(state, { type: 'lesson-finish' }), state);
  assert.equal(send(state, 'practica-2', { method: 'camera', signId: 'LSP-002' }), state);
  assert.equal(send(state, 'practica-1', { method: 'camera', signId: 'LSP-002' }), state);
  assert.equal(send(state, 'practica-1', { method: 'camera', signId: null }), state);
  state = send(state, 'practica-1', { method: 'camera', signId: 'LSP-001' });
  assert.equal(send(state, 'practica-1', { method: 'camera', signId: 'LSP-001' }), state);
  state = walk(state);
  assert.equal(summarizeProgress(state).lessonCameraPractices, 1);
  assert.equal(summarizeProgress(state).lessonAlternatives, 4);
  assert.equal(summarizeProgress(state).xp, 0);
  state = record(state, { type: 'lesson-finish' });
  assert.equal(summarizeProgress(state).xp, 80);
  assert.equal(record(state, { type: 'lesson-finish' }), state);
  assert.deepEqual(restoreProgress(JSON.stringify(state)), state);
});

test('partial progress keeps incorrect attempts and restores the real submitted assessment score', () => {
  let state = walk(begin(), 2);
  const wrong = { method: 'answers', answers: { botellas: { choice: 'LSP-001' } } };
  state = send(state, 'comprension', wrong);
  assert.equal(send(state, 'comprension', wrong), state);
  assert.equal(nextStudyStep(plan, state.lessonStudy.numeros), 2);
  assert.deepEqual(restoreProgress(JSON.stringify(state)), state);
  state = walk(state, plan.steps.length - 1);
  const assessment = plan.steps.at(-1);
  assert.equal(send(state, assessment.id, { method: 'answers', answers: {} }), state);
  const answers = correctAnswers(assessment.questions);
  answers.a.choice = 'LSP-005';
  state = send(state, assessment.id, { method: 'answers', answers });
  const edited = structuredClone(state);
  edited.lessonStudy.numeros.steps.evaluacion.attempts[0].grade.score = 99;
  const restored = restoreProgress(JSON.stringify(edited));
  assert.equal(restored.lessonStudy.numeros.steps.evaluacion.attempts[0].grade.score, 4);
  assert.equal(restored.lessonStudy.numeros.steps.comprension.attempts.length, 2);
  assert.deepEqual(createProfileExport(defaultProfile(), restored).progress.lessonStudy, restored.lessonStudy);
});

test('an older completion remains intact without granting another reward for the pilot', () => {
  const previous = restoreProgress(null, '["numeros"]');
  assert.equal(previous.lessonStudy, undefined);
  let state = record(previous, { type: 'lesson-start' });
  state = record(walk(state), { type: 'lesson-finish' });
  assert.deepEqual(state.activities, previous.activities);
  assert.equal(summarizeProgress(state).xp, 80);
});
