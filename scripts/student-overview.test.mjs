import assert from 'node:assert/strict';
import { test } from 'node:test';
import { functionalLessons, getLessonLocation } from '../src/data/curriculum.ts';
import { questionFields } from '../src/data/lessonPlan.ts';
import { summarizeLearningDays } from '../src/data/learningCalendar.ts';
import { getEducationalSign, libraryEntries } from '../src/data/library.ts';
import { minigames, normalizeGameSettings } from '../src/data/minigames.ts';
import { canWriteProgress, emptyProgress, recordProgressEvent, recordSignConsultation, restoreProgress } from '../src/data/progress.ts';
import { getSituationExercise } from '../src/data/situationStudy.ts';
import { getSituation, situations } from '../src/data/situations.ts';
import { getStudentLevel, selectStudentOverview } from '../src/data/studentOverview.ts';

const date = '2026-11-22T15:45:00Z';
const overview = (state, at = date) => selectStudentOverview(state, Date.parse(at));
const event = (state, type, data, at = date) => recordProgressEvent(state, { type, ...data }, at);
const badge = (summary, id) => summary.achievements.find(item => item.id === id);

function finishLesson(state, lessonId = 'numeros') {
  const { lesson: { plan } } = getLessonLocation(lessonId);
  state = event(state, 'lesson-start', { lessonId });
  for (const step of plan.steps) {
    const questions = step.kind === 'practice' ? step.alternative : step.questions;
    const answers = questions && Object.fromEntries(questions.map(({ id, activity }) => [
      id, Object.fromEntries(questionFields(activity).map(item => [item.id, item.correctId])),
    ]));
    state = event(state, 'lesson-step', { lessonId, stepId: step.id,
      input: answers ? { method: step.kind === 'practice' ? 'alternative' : 'answers', answers } : { method: 'read' } });
  }
  return event(state, 'lesson-finish', { lessonId });
}

function resolveScene(state, situation, scene, at = date) {
  const common = { situationId: situation.id, sceneId: scene.id };
  const choiceId = scene.expectedSignId;
  const sign = getEducationalSign(choiceId);
  state = event(state, 'situation-select', { ...common, choiceId }, at);
  const response = getSituationExercise(scene, sign).correctId;
  if (scene.dialogue) {
    const attemptId = scene.id;
    state = event(state, 'situation-attempt-start', { ...common, attempt: { id: attemptId, method: 'visual' } }, at);
    return event(state, 'situation-attempt-result', { ...common, attemptId, input: { method: 'visual', response } }, at);
  }
  state = event(state, 'situation-check', common, at);
  return event(state, 'situation-practice', { ...common, input: { method: 'alternative', response } }, at);
}

function finishSituation(state, situation, at = date) {
  state = event(state, 'situation-start', { situationId: situation.id }, at);
  for (const scene of situation.scenes) state = resolveScene(state, situation, scene, at);
  return event(state, 'situation-finish', { situationId: situation.id }, at);
}

function play(state, game, runId, { elapsedMs = 2000, correct = 3, errors = 0, duration = 0 } = {}) {
  const limit = duration ? 30 : 3;
  return event(state, 'minigame', { completed: true, gameId: game.id, runId, score: correct * 10, maxScore: limit * 10,
    details: { settings: normalizeGameSettings(game, { duration }), limit, elapsedMs, correct, errors, bestStreak: correct,
      camera: 0, alternative: game.kind === 'challenge' ? correct : 0 } });
}

test('levels use stable XP boundaries and show the amount remaining', () => {
  assert.equal(getStudentLevel(0).number, 1);
  assert.equal(getStudentLevel(0).remaining, 80);
  assert.equal(getStudentLevel(40).percent, 50);
  assert.equal(getStudentLevel(80).number, 2);
  assert.equal(getStudentLevel(150).remaining, 50);
  assert.equal(getStudentLevel(419).percent, 99);
  assert.equal(getStudentLevel(420).next, undefined);
  assert.equal(getStudentLevel(560).number, 5);
});

test('the original combination of Numbers, scenarios and games retains 420 XP after reload and replay', () => {
  let state = finishLesson(emptyProgress());
  for (const situation of situations) state = finishSituation(state, situation);
  for (const game of minigames) state = play(state, game, game.id);
  assert.equal(overview(state).xp, 420);
  const repeated = situations[0];
  state = event(state, 'situation-repeat', { situationId: repeated.id }, '2026-11-23T15:45:00Z');
  state = finishSituation(state, repeated, '2026-11-23T15:46:00Z');
  state = play(state, minigames[0], 'repeated-memory');
  const summary = overview(restoreProgress(JSON.stringify(state)), '2026-11-23T19:00:00Z');
  assert.equal(summary.xp, 420);
  assert.equal(summary.curriculum.done, 1);
  assert.equal(summary.curriculum.total, 12);
  assert.equal(summary.curriculum.percent, 8);
  assert.equal(summary.lessonSteps, 10);
  assert.equal(summary.situationInteractions, 15 + repeated.scenes.length);
  assert.equal(summary.situationStarts, 6);
  assert.equal(summary.completedGames, 5);
  assert.equal(summary.gameRuns, 6);
  assert.equal(summary.evaluations[0].score, summary.evaluations[0].total);
  assert.equal(summary.level.number, 5);
  assert.equal(badge(summary, 'communicator').obtained, true);
  assert.equal(badge(summary, 'play').obtained, true);
  assert.equal(badge(summary, 'numbers').obtained, true);
  assert.equal(badge(summary, 'learner').obtainedAt, date);
  assert.equal(new Set(summary.achievements.map(item => item.id)).size, summary.achievements.length);
});

test('finishing all functional content yields 1300 XP and 100% without awarding anything for previews', () => {
  let state = emptyProgress();
  for (const { lesson } of functionalLessons) state = finishLesson(state, lesson.id);
  for (const situation of situations) state = finishSituation(state, situation);
  for (const game of minigames) state = play(state, game, game.id);
  const summary = overview(restoreProgress(JSON.stringify(state)));
  assert.equal(summary.xp, 1300);
  assert.equal(summary.curriculum.percent, 100);
  assert.equal(summary.curriculum.done, 12);
  assert.equal(summary.evaluations.length, 12);
  assert.equal(summary.matches, 0);
  assert.equal(summary.historicalLessons, 0);
});

test('Lima calendar counts distinct consecutive dates across month and year boundaries, ignoring missing and future evidence', () => {
  const dates = [null, 'bad', '2026-12-31T03:00:00Z', '2026-12-31T04:30:00Z', '2027-01-01T04:59:59Z', '2027-01-01T05:00:00Z', '2027-01-03T05:00:00Z'];
  const current = summarizeLearningDays(dates, Date.parse('2027-01-02T15:00:00Z'));
  assert.equal(current.current, 3);
  assert.equal(current.best, 3);
  assert.equal(current.streakAwardAt, '2027-01-01T05:00:00Z');
  assert.deepEqual(current.week.map(day => day.count), [0, 0, 0, 2, 1, 1, 0]);
  const expired = summarizeLearningDays(dates.slice(0, -1), Date.parse('2027-01-03T05:00:00Z'));
  assert.equal(expired.current, 0);
  assert.equal(expired.best, 3);
});

test('visiting, starting, consulting and timing out without participation do not increase a streak', () => {
  let state = event(emptyProgress(), 'lesson-start', { lessonId: 'numeros' });
  state = event(state, 'situation-start', { situationId: 'tienda' });
  state = recordSignConsultation(state, 'uno', date);
  state = play(state, minigames.find(game => game.id === 'desafio'), 'empty', { elapsedMs: 30000, correct: 0, duration: 30 });
  const summary = overview(state);
  assert.equal(summary.calendar.current, 0);
  assert.equal(summary.completedGames, 0);
  assert.equal(summary.gameRuns, 1);
  assert.equal(summary.consulted, 1);
  assert.equal(summary.studied, 0);
  assert.equal(summary.resumeLesson.path, '/academia/unidad/2/leccion/numeros');
  assert.equal(summary.resumeSituation.path, '/simulador/tienda');
  assert.equal(summary.history.find(item => item.module === 'library').learning, false);
});

test('saved camera confirmations count once without XP or scores, separately from study and consultations', () => {
  let state = event(emptyProgress(), 'camera-saved', { sessionId: 'one', signId: 'LSP-001' }, date);
  const repeated = event(state, 'camera-saved', { sessionId: 'one', signId: 'LSP-001' }, date);
  assert.equal(repeated, state);
  assert.equal(event(state, 'camera-saved', { sessionId: 'two', signId: 'hola' }), state);
  state = recordSignConsultation(state, 'uno', date);
  const summary = overview(restoreProgress(JSON.stringify(state)));
  assert.deepEqual(state.activities[0].result, { recognized: true });
  assert.equal(summary.xp, 0);
  assert.equal(summary.calendar.current, 1);
  assert.equal(summary.matches, 1);
  assert.equal(summary.studied, 0);
  assert.equal(summary.consulted, 1);
  assert.equal(badge(summary, 'first-practice').obtainedAt, date);
});

test('old and partial schemas preserve valid rewards and never assign dates to historical records', () => {
  const stored = JSON.stringify({ version: 1, activities: [{ id: 'lesson:saludos', type: 'lesson', targetId: 'saludos', occurredAt: null }],
    consultedSignIds: ['uno', 'hola', 'gracias'], consultedAt: { LSP_001: 'bad' } });
  const progress = restoreProgress(stored);
  const summary = overview(progress);
  assert.equal(summary.xp, 80);
  assert.equal(summary.curriculum.done, 0);
  assert.equal(summary.historicalLessons, 1);
  assert.equal(summary.calendar.best, 0);
  assert.equal(badge(summary, 'first-step').obtainedAt, undefined);
  assert.equal(badge(summary, 'explorer').obtainedAt, undefined);
  assert.ok(summary.history.every(item => item.at === null));
  const malformed = restoreProgress(JSON.stringify({ ...progress, consultedSignIds: 'bad' }));
  assert.equal(overview(malformed).xp, 80);
  assert.equal(canWriteProgress(stored), true);
  assert.equal(canWriteProgress('{"version":2,"activities":[]}'), false);
  const partial = restoreProgress(JSON.stringify({ version: 1, consultedAt: { 'LSP-001': date } }), '["saludos"]');
  assert.equal(overview(partial).xp, 80);
  assert.deepEqual(partial.consultedSignIds, ['LSP-001']);
  let mixed = recordSignConsultation(emptyProgress(), 'uno');
  mixed = recordSignConsultation(mixed, 'dos', date);
  mixed = recordSignConsultation(mixed, 'tres', date);
  assert.equal(badge(overview(mixed), 'explorer').obtained, true);
  assert.equal(badge(overview(mixed), 'explorer').obtainedAt, undefined);
});

test('a credited prototype with the same ID keeps its XP and can resume the functional lesson', () => {
  let state = restoreProgress(null, '["numeros"]');
  assert.equal(overview(state).xp, 80);
  assert.equal(overview(state).curriculum.done, 0);
  state = event(state, 'lesson-start', { lessonId: 'numeros' });
  assert.equal(overview(state).resumeLesson.path, '/academia/unidad/2/leccion/numeros');
  const summary = overview(restoreProgress(JSON.stringify(finishLesson(state))));
  assert.equal(summary.curriculum.done, 1);
  assert.equal(summary.historicalLessons, 1);
  assert.equal(summary.history.find(item => item.id === 'lesson-run:numeros').at, date);
  assert.equal(badge(summary, 'numbers').obtainedAt, date);
  assert.equal(summary.xp, 80);
});

test('the reference badge keeps canonical consultations, counts only ten eligible fichas and retains date evidence', () => {
  const eligible = libraryEntries.filter(sign => sign.reference).slice(0, 10);
  let state = recordSignConsultation(emptyProgress(), 'hola', date);
  eligible.forEach((sign, index) => { state = recordSignConsultation(state, sign.id, `2026-11-${11 + index}T13:00:00Z`); });
  const dated = restoreProgress(JSON.stringify(state));
  assert.equal(recordSignConsultation(dated, 'uno', date), dated);
  const summary = overview(dated);
  assert.equal(summary.consulted, 11);
  assert.equal(badge(summary, 'reference-explorer').obtainedAt, '2026-11-20T13:00:00Z');
  assert.equal(summary.calendar.best, 0);
});

test('a dated interaction contributes on its day and survives restart while undated historical scenes remain visible', () => {
  const situation = getSituation('preguntas');
  let state = event(emptyProgress(), 'situation-start', { situationId: situation.id }, '2026-11-20T10:00:00Z');
  state = resolveScene(state, situation, situation.scenes[0], '2026-11-20T13:00:00Z');
  state = resolveScene(state, situation, situation.scenes[1], '2026-11-21T13:00:00Z');
  state = event(state, 'situation-finish', { situationId: situation.id }, '2026-11-21T13:01:00Z');
  state = event(state, 'situation-repeat', { situationId: situation.id }, date);
  state = resolveScene(state, situation, situation.scenes[0], date);
  const summary = overview(restoreProgress(JSON.stringify(state)));
  assert.equal(summary.calendar.best, 3);
  assert.equal(summary.calendar.current, 3);
  assert.equal(badge(summary, 'streak').obtainedAt, date);
  assert.equal(summary.situationInteractions, 3);
  assert.equal(summary.xp, 40);
  assert.equal(summary.resumeSituation.detail, situation.scenes[1].title);

  const older = structuredClone(state);
  delete older.situationArchive[situation.id][0].scenes[situation.scenes[0].id].practiceAt;
  assert.equal(overview(restoreProgress(JSON.stringify(older))).history.find(item => item.id === `scene:${situation.id}/0/${situation.scenes[0].id}`).at, null);
});
