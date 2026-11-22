import { gradeAnswers, type Answers, type LessonPlan, type StudyStep } from './lessonPlan.ts';
import { recognitionSignsById } from '../features/sign-recognition/recognitionCatalog.ts';

export type StudyInput = { method: 'read' } | { method: 'camera'; signId: string }
  | { method: 'answers' | 'alternative'; answers: Answers };
export type Attempt = { at: string; input: StudyInput; grade?: { score: number; total: number } };
export type StepProgress = { attempts: Attempt[]; complete: boolean };
export type StudyRun = { startedAt: string; steps: Record<string, StepProgress>; completedAt?: string };

export function nextStudyStep(plan: LessonPlan, run?: StudyRun) {
  const index = plan.steps.findIndex(step => !run?.steps[step.id]?.complete);
  return index === -1 ? plan.steps.length : index;
}

function validateInput(step: StudyStep, value: unknown, at: string) {
  if (!value || typeof value !== 'object' || !('method' in value)) return null;
  if ((step.kind === 'intro' || step.kind === 'study') && value.method === 'read') {
    const attempt: Attempt = { at, input: { method: 'read' } };
    return { attempt, complete: true };
  }
  if (step.kind === 'practice' && value.method === 'camera' && 'signId' in value && value.signId === step.targetId
    && recognitionSignsById.has(step.targetId)) {
    const attempt: Attempt = { at, input: { method: 'camera', signId: step.targetId } };
    return { attempt, complete: true };
  }
  if (!('answers' in value)) return null;
  const questions = step.kind === 'practice' && value.method === 'alternative' ? step.alternative
    : (step.kind === 'question' || step.kind === 'assessment') && value.method === 'answers' ? step.questions : null;
  const graded = questions && gradeAnswers(questions, value.answers);
  if (!graded || (value.method !== 'alternative' && value.method !== 'answers')) return null;
  const { answers, score, total } = graded;
  const attempt: Attempt = { at, input: { method: value.method, answers }, grade: { score, total } };
  return { attempt, complete: step.kind === 'assessment' || score === total };
}

export function submitStudyStep(plan: LessonPlan, run: StudyRun, stepId: string, input: unknown, at: string): StudyRun {
  const step = plan.steps[nextStudyStep(plan, run)];
  if (!step || step.id !== stepId || run.completedAt) return run;
  const valid = validateInput(step, input, at);
  if (!valid) return run;
  const attempts = run.steps[stepId]?.attempts ?? [];
  const last = attempts.at(-1);
  if (last && JSON.stringify(last.input) === JSON.stringify(valid.attempt.input)) return run;
  return { ...run, steps: { ...run.steps, [stepId]: { attempts: [...attempts, valid.attempt], complete: valid.complete } } };
}

function hasTime(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function restoreStudyRun(plan: LessonPlan, value: unknown) {
  if (!value || typeof value !== 'object' || !('startedAt' in value) || !hasTime(value.startedAt)
    || !('steps' in value) || !value.steps || typeof value.steps !== 'object') return null;
  let run: StudyRun = { startedAt: value.startedAt, steps: {} };
  const steps = value.steps as Record<string, unknown>;
  for (const { id } of plan.steps) {
    const step = steps[id];
    if (!step || typeof step !== 'object' || !('attempts' in step) || !Array.isArray(step.attempts)) break;
    for (const attempt of step.attempts) {
      if (hasTime(attempt?.at)) run = submitStudyStep(plan, run, id, attempt.input, attempt.at);
    }
    if (!run.steps[id]?.complete) break;
  }
  if ('completedAt' in value && hasTime(value.completedAt) && nextStudyStep(plan, run) === plan.steps.length) {
    run.completedAt = value.completedAt;
  }
  return run;
}
