import type { LessonActivity } from './curriculum.ts';

export type LessonReference = { title: string; url: string };
export type Question = { id: string; activity: LessonActivity };
export type Answers = Record<string, Record<string, string>>;

type Step = { id: string; title: string };
export type StudyStep = Step & (
  | { kind: 'intro'; text: string }
  | { kind: 'study'; text: string; signs: { id: string; name: string; explanation: string }[]; reference: LessonReference }
  | { kind: 'question' | 'assessment'; questions: Question[] }
  | { kind: 'practice'; targetId: string; instruction: string; reference: LessonReference; alternative: Question[] }
);
export type LessonPlan = { objectives: string[]; steps: StudyStep[] };

export function questionFields(activity: LessonActivity) {
  return activity.type === 'association'
    ? activity.pairs.map(pair => ({ id: pair.id, correctId: pair.answerId }))
    : [{ id: 'choice', correctId: activity.correctId }];
}

export function gradeAnswers(questions: Question[], value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const answers: Answers = {};
  let score = 0, total = 0;
  for (const { id, activity } of questions) {
    const group = (value as Record<string, unknown>)[id];
    if (!group || typeof group !== 'object' || Array.isArray(group)) return null;
    const responses: Record<string, string> = {};
    for (const field of questionFields(activity)) {
      const answer = (group as Record<string, unknown>)[field.id];
      if (typeof answer !== 'string' || !activity.options.some(option => option.id === answer)) return null;
      responses[field.id] = answer;
      total++;
      if (answer === field.correctId) score++;
    }
    answers[id] = responses;
  }
  return total ? { answers, score, total } : null;
}
