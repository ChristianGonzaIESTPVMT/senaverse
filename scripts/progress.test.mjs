import assert from 'node:assert/strict';
import { test } from 'node:test';
import { functionalLessons, getLessonLocation, legacyUnitLessonIds, totalLessons } from '../src/data/curriculum.ts';
import { questionFields } from '../src/data/lessonPlan.ts';
import { situations } from '../src/data/situations.ts';
import { emptyProgress, recordProgressEvent, recordSignConsultation, restoreProgress, summarizeProgress } from '../src/data/progress.ts';

const timestamp = '2026-11-16T15:30:00.000Z';
function complete(state, lessonId) {
  const plan = getLessonLocation(lessonId)?.lesson.plan;
  if (!plan) return recordProgressEvent(state, { type: 'lesson', lessonId }, timestamp);
  state = recordProgressEvent(state, { type: 'lesson-start', lessonId }, timestamp);
  for (const step of plan.steps) {
    const questions = step.kind === 'practice' ? step.alternative : step.questions;
    const answers = questions && Object.fromEntries(questions.map(({ id, activity }) => [
      id, Object.fromEntries(questionFields(activity).map(item => [item.id, item.correctId])),
    ]));
    const input = answers ? { method: step.kind === 'practice' ? 'alternative' : 'answers', answers } : { method: 'read' };
    state = recordProgressEvent(state, { type: 'lesson-step', lessonId, stepId: step.id, input }, timestamp);
  }
  return recordProgressEvent(state, { type: 'lesson-finish', lessonId }, timestamp);
}

test('a new student has no invented completions, XP, activities or badges', () => {
  const summary = summarizeProgress(restoreProgress(null));
  assert.equal(summary.percent, 0);
  assert.equal(summary.xp, 0);
  assert.equal(summary.practices, 0);
  assert.equal(summary.recent.length, 0);
  assert.ok(summary.unitProgress.every(unit => unit.percent === 0));
  assert.ok(summary.achievements.every(badge => !badge.obtained));
});

test('migration excludes automatic demo seeds and preserves valid completions without invented dates', () => {
  const state = restoreProgress(null, JSON.stringify(['introduccion', 'abecedario', 'saludos', 'saludos', 'unknown']));
  assert.deepEqual(summarizeProgress(state).completed, ['saludos']);
  assert.equal(state.activities[0].occurredAt, null);
  assert.equal(summarizeProgress(state).xp, 80);
});

test('malformed storage recovers safely, and an explicitly empty new record stays empty', () => {
  assert.deepEqual(restoreProgress('{oops', 'bad'), emptyProgress());
  assert.deepEqual(restoreProgress('[]'), emptyProgress());
  assert.deepEqual(restoreProgress(JSON.stringify(emptyProgress()), '["saludos"]'), emptyProgress());
  assert.equal(summarizeProgress(restoreProgress('{oops', '["saludos"]')).completed.length, 1);
});

test('lesson completion is idempotent and shares curriculum totals and reward rules', () => {
  const first = complete(emptyProgress(), 'introduccion');
  assert.equal(complete(first, 'introduccion'), first);
  const summary = summarizeProgress(first);
  assert.equal(summary.completed.length, 1);
  assert.equal(summary.xp, 80);
  assert.equal(summary.percent, Math.round(100 / totalLessons));
  assert.equal(summary.unitProgress[0].percent, 50);
  assert.equal(summary.achievements[0].obtained, true);
  assert.equal(complete(first, 'not-a-lesson'), first);
});

test('Explorer requires three different consulted sign cards, without awarding activities or XP', () => {
  let state = emptyProgress();
  for (const signId of ['hola', 'hola', 'not-a-sign', 'gracias']) state = recordSignConsultation(state, signId);
  assert.equal(summarizeProgress(state).achievements[1].obtained, false);
  state = recordSignConsultation(state, 'adios');
  assert.equal(summarizeProgress(state).achievements[1].obtained, true);
  assert.equal(state.activities.length, 0);
  assert.equal(summarizeProgress(state).xp, 0);
});

test('historical Constancia keeps the grouping from the previous curriculum', () => {
  let state = emptyProgress();
  for (const id of legacyUnitLessonIds[0]) state = complete(state, id);
  assert.equal(summarizeProgress(state).achievements[2].obtained, false);
  for (const id of legacyUnitLessonIds[1]) state = complete(state, id);
  assert.equal(summarizeProgress(state).achievements[2].obtained, true);
});

test('all lessons completed produces 100% with no extra activities for viewing progress', () => {
  let state = emptyProgress();
  for (const { lesson } of functionalLessons) state = complete(state, lesson.id);
  assert.equal(summarizeProgress(state).percent, 100);
  assert.equal(summarizeProgress(state).xp, totalLessons * 80);
  assert.ok(summarizeProgress(state).unitProgress.every(unit => unit.percent === 100));
  assert.deepEqual(restoreProgress(JSON.stringify(state)), state);
});

test('camera integration accepts only real recognized results and deduplicates sessions', () => {
  const state = emptyProgress();
  const event = { type: 'camera', sessionId: 'practice-1', signId: 'hola', result: { recognized: true, confidence: .93 } };
  for (const result of [{ recognized: false, confidence: .9 }, { recognized: true, confidence: NaN }, { recognized: true, confidence: 2 }]) {
    assert.equal(recordProgressEvent(state, { ...event, result }, timestamp), state);
  }
  const next = recordProgressEvent(state, event, timestamp);
  assert.equal(summarizeProgress(next).practices, 1);
  assert.equal(summarizeProgress(next).xp, 0);
  assert.equal(recordProgressEvent(next, event, timestamp), next);
  assert.equal(recordProgressEvent(next, { ...event, signId: 'unknown', sessionId: 'other' }, timestamp), next);
});

test('a situation completes only after every scene has a verified recognition result', () => {
  const situation = situations[0];
  let state = emptyProgress();
  for (const scene of situation.scenes.slice(0, -1)) state = recordProgressEvent(state, { type: 'situation-scene', situationId: situation.id, sceneId: scene.id, result: { recognized: true, confidence: .9 } }, timestamp);
  assert.equal(state.activities.some(item => item.type === 'situation'), false);
  state = recordProgressEvent(state, { type: 'situation-scene', situationId: situation.id, sceneId: situation.scenes.at(-1).id, result: { recognized: true, confidence: .9 } }, timestamp);
  assert.equal(state.activities.filter(item => item.type === 'situation').length, 1);
  assert.equal(summarizeProgress(state).recent.length, situation.scenes.length + 1);
  assert.equal(summarizeProgress(state).recent[0].type, 'situation');
  assert.deepEqual(restoreProgress(JSON.stringify(state)), state);
  assert.equal(summarizeProgress(state).xp, 0);
});

test('minigame integration requires a finished known game and a valid score', () => {
  const state = emptyProgress();
  const event = { type: 'minigame', runId: 'run-1', gameId: 'memoria', completed: true, score: 8, maxScore: 10 };
  for (const changes of [{ completed: false }, { score: 11 }, { score: -1 }, { maxScore: 0 }, { gameId: 'unknown' }]) assert.equal(recordProgressEvent(state, { ...event, ...changes }, timestamp), state);
  const next = recordProgressEvent(state, event, timestamp);
  assert.equal(next.activities.length, 1);
  assert.equal(summarizeProgress(next).xp, 0);
  assert.equal(recordProgressEvent(next, event, timestamp), next);
});

test('restoration discards invalid records, unverified results, fake XP and duplicate IDs', () => {
  const lesson = complete(emptyProgress(), 'saludos').activities[0];
  const state = restoreProgress(JSON.stringify({ version: 1, activities: [lesson, lesson, { ...lesson, id: 'fake' }, { id: 'camera:test', type: 'camera', targetId: 'hola', occurredAt: timestamp, result: { recognized: false, confidence: .8 }, xp: 9999 }], consultedSignIds: ['hola', 'hola', 'unknown'] }));
  assert.equal(state.activities.length, 1);
  assert.deepEqual(state.consultedSignIds, ['hola']);
  assert.equal(summarizeProgress(state).xp, 80);
});

test('history sorts actual dates first and retains undated legacy completions', () => {
  let state = restoreProgress(null, '["saludos"]');
  state = restoreProgress(JSON.stringify({ ...state, activities: [...state.activities,
    { id: 'lesson:introduccion', type: 'lesson', targetId: 'introduccion', occurredAt: '2026-11-15T12:00:00Z' }] }));
  state = recordProgressEvent(state, { type: 'lesson', lessonId: 'abecedario' }, timestamp);
  assert.deepEqual(summarizeProgress(state).recent.map(item => item.targetId), ['abecedario', 'introduccion', 'saludos']);
});
