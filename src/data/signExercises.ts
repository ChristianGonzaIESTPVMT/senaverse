import type { LessonActivity } from './curriculum.ts';

export type SignPractice = { method: 'camera'; signId: string } | { method: 'alternative'; response: string };
export type ChoiceExercise = LessonActivity & { type: 'choice' };

export function getHandCountExercise(hands: 1 | 2): ChoiceExercise {
  return { type: 'choice', question: '¿Cuántas manos indica la ficha para esta seña?',
    options: [{ id: 'one', label: 'Una mano' }, { id: 'two', label: 'Dos manos' }],
    correctId: hands === 1 ? 'one' : 'two', success: 'Identificaste la cantidad de manos indicada en la ficha.' };
}
