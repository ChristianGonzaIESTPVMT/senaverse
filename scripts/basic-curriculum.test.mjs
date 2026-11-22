import assert from 'node:assert/strict';
import { test } from 'node:test';
import { functionalLessons, getCurriculumProgress, getLessonLocation, units } from '../src/data/curriculum.ts';
import { getEducationalSign } from '../src/data/library.ts';
import { gradeAnswers, questionFields } from '../src/data/lessonPlan.ts';
import { nextStudyStep } from '../src/data/lessonStudy.ts';
import { recordProgressEvent, restoreProgress } from '../src/data/progress.ts';
import { selectStudentOverview } from '../src/data/studentOverview.ts';

const time = '2026-11-22T15:00:00Z';
const later = '2026-11-22T16:00:00Z';
const overview = state => selectStudentOverview(state, Date.parse(later));
const answers = questions => Object.fromEntries(questions.map(({ id, activity }) => [
  id, Object.fromEntries(questionFields(activity).map(field => [field.id, field.correctId])),
]));

test('six units contain twelve functional lessons with sourced vocabulary and assessments, plus seven previews', () => {
  assert.deepEqual(units.map(unit => unit.lessons.filter(lesson => lesson.plan).length), [2, 3, 2, 2, 2, 1]);
  const lessonIds = units.flatMap(unit => unit.lessons.map(lesson => lesson.id));
  assert.equal(lessonIds.length, 19);
  assert.equal(new Set(lessonIds).size, lessonIds.length);
  const targets = [];
  const vocabulary = new Set();
  for (const { lesson } of functionalLessons) {
    const { objectives, steps } = lesson.plan;
    assert.ok(objectives.length >= 2);
    assert.equal(steps[0].kind, 'intro');
    assert.equal(steps.at(-1).kind, 'assessment');
    assert.equal(new Set(steps.map(step => step.id)).size, steps.length);
    const taught = new Set();
    for (const step of steps) {
      if (step.kind === 'study') for (const { id } of step.signs) {
        const entry = getEducationalSign(id);
        assert.ok(entry?.reference?.url && entry.source?.page && entry.instructions, id);
        assert.equal(entry.validation, 'pending');
        assert.equal(getLessonLocation(entry.lesson.lessonId)?.unit.id, entry.lesson.unitId);
        taught.add(id);
        vocabulary.add(id);
      }
      if (step.kind === 'practice') {
        const entry = getEducationalSign(step.targetId);
        assert.ok(taught.has(step.targetId));
        assert.equal(step.instruction, entry.instructions);
        assert.equal(step.reference, entry.reference);
        targets.push(step.targetId);
      }
      const questions = step.questions ?? step.alternative;
      if (!questions) continue;
      const result = gradeAnswers(questions, answers(questions));
      assert.ok(result?.total && result.score === result.total);
      for (const { activity } of questions) {
        if (activity.diagramId) assert.ok(getEducationalSign(activity.diagramId).handDiagram);
        if (step.kind === 'assessment' && lesson.id !== 'numeros') assert.ok(activity.explanation);
      }
    }
  }
  assert.equal(vocabulary.size, 24);
  assert.equal(targets.length, 10);
  assert.deepEqual(targets.toSorted(), Array.from({ length: 10 }, (_, i) => `LSP-${String(i + 1).padStart(3, '0')}`));
  assert.ok(getLessonLocation('expresiones').lesson.plan.steps.find(step => step.targetId === 'LSP-007')?.notice);
  assert.ok(getLessonLocation('elecciones-y-compania').lesson.plan.steps.find(step => step.targetId === 'LSP-009')?.notice);
});

test('ordering rejects duplicate selections and grades each position', () => {
  const { questions } = getLessonLocation('comunicacion-visual').lesson.plan.steps.find(step => step.kind === 'question');
  assert.equal(gradeAnswers(questions, { secuencia: { 0: '1', 1: '1', 2: '0' } }), null);
  assert.equal(gradeAnswers(questions, { secuencia: { 0: '2', 1: '1', 2: '0' } }).score, 1);
  assert.equal(gradeAnswers(questions, answers(questions)).score, 3);
});

test('historical rewards stay intact while the route restores a new lesson and stores assessment retries', () => {
  const lessonId = 'saludos';
  const { lesson: { plan } } = getLessonLocation(lessonId);
  const progress = restoreProgress(null, '["saludos"]');
  const save = (state, type, stepId, input, at = time) => recordProgressEvent(state, { type, lessonId, stepId, input }, at);
  let state = save(progress, 'lesson-start');
  assert.equal(save(state, 'lesson-review', 'evaluacion', { method: 'answers', answers: {} }), state);
  state = save(state, 'lesson-step', 'objetivos', { method: 'read' });
  state = restoreProgress(JSON.stringify(state));
  assert.equal(nextStudyStep(plan, state.lessonStudy.saludos), 1);
  assert.equal(getCurriculumProgress(state).done, 0);
  for (const step of plan.steps.slice(1, -1)) {
    state = save(state, 'lesson-step', step.id, step.questions
      ? { method: 'answers', answers: answers(step.questions) } : { method: 'read' });
  }
  const assessment = plan.steps.at(-1);
  const wrong = { ...answers(assessment.questions), demostracion: { choice: '0' } };
  state = save(state, 'lesson-step', assessment.id, { method: 'answers', answers: wrong });
  state = save(state, 'lesson-finish');
  assert.equal(overview(state).evaluations[0].score, 2);
  assert.equal(overview(state).xp, 80);
  assert.equal(save(state, 'lesson-review', 'ejercicio', { method: 'answers', answers: {} }), state);
  state = save(state, 'lesson-review', assessment.id, { method: 'answers', answers: answers(assessment.questions) }, later);
  state = restoreProgress(JSON.stringify(state));
  assert.equal(state.lessonStudy.saludos.completedAt, time);
  assert.equal(state.lessonStudy.saludos.steps.evaluacion.attempts[0].grade.score, 2);
  assert.equal(overview(state).evaluations[0].score, 3);
  assert.equal(overview(state).evaluations[0].attempts, 2);
  assert.deepEqual(state.activities, progress.activities);
  assert.equal(overview(state).xp, 80);
  assert.equal(overview(state).curriculum.percent, 8);
});
