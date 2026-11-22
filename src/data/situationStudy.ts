import type { LessonActivity } from './curriculum.ts';
import { getEducationalSign, type LibraryEntry } from './library.ts';
import { allSituations, type Situation, type SituationScene } from './situations.ts';

export const LEGACY_SITUATION_KEY = 'senaverse-situation-answers-v1';

export type SituationPractice = { method: 'camera'; signId: string } | { method: 'alternative'; response: string };
export type SceneStudy = { choiceId: string; attempts: string[]; checked: boolean; practice?: SituationPractice };
export type SituationRun = { startedAt: string | null; scenes: Record<string, SceneStudy>; completedAt?: string };
export type SituationStudyEvent = { type: 'situation-start' | 'situation-finish' | 'situation-repeat'; situationId: string }
  | { type: 'situation-select'; situationId: string; sceneId: string; choiceId: string }
  | { type: 'situation-check'; situationId: string; sceneId: string }
  | { type: 'situation-practice'; situationId: string; sceneId: string; input: SituationPractice };

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function date(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function optionId(scene: SituationScene, value: unknown) {
  const sign = typeof value === 'string' && getEducationalSign(value);
  return sign && scene.optionIds.includes(sign.id) ? sign.id : undefined;
}

export function getSituationExercise(scene: SituationScene, sign: LibraryEntry): LessonActivity & { type: 'choice' } {
  if (sign.hands) return {
    type: 'choice', question: '¿Cuántas manos indica la ficha para esta seña?',
    options: [{ id: 'one', label: 'Una mano' }, { id: 'two', label: 'Dos manos' }],
    correctId: sign.hands === 1 ? 'one' : 'two', success: 'Identificaste la cantidad de manos indicada en la ficha.',
  };
  return {
    type: 'choice', question: `¿Qué significado corresponde a «${sign.word}»?`,
    options: scene.optionIds.flatMap(id => {
      const option = getEducationalSign(id);
      return option ? [{ id: option.id, label: option.meaning }] : [];
    }),
    correctId: sign.id, success: 'Relacionaste la palabra con su significado.',
  };
}

function restorePractice(scene: SituationScene, choiceId: string, value: unknown): SituationPractice | undefined {
  const sign = getEducationalSign(choiceId);
  if (!sign || !object(value)) return;
  if (value.method === 'camera' && sign.recognitionClassId && value.signId === sign.recognitionClassId) {
    return { method: 'camera', signId: sign.recognitionClassId };
  }
  if (value.method === 'alternative' && value.response === getSituationExercise(scene, sign).correctId) {
    return { method: 'alternative', response: value.response };
  }
}

export function nextSituationScene(situation: Situation, run?: SituationRun) {
  return situation.scenes.find(scene => !run?.scenes[scene.id]?.practice);
}

export function summarizeSituation(situation: Situation, run?: SituationRun) {
  let completed = 0, correct = 0, incorrect = 0, camera = 0, alternative = 0, errors = 0;
  for (const scene of situation.scenes) {
    const answer = run?.scenes[scene.id];
    if (!answer) continue;
    if (answer.checked) {
      if (answer.choiceId === scene.expectedSignId) correct++;
      else incorrect++;
    }
    errors += answer.attempts.filter(choice => choice !== scene.expectedSignId).length;
    if (answer.practice) {
      completed++;
      if (answer.practice.method === 'camera') camera++;
      else alternative++;
    }
  }
  return { completed, correct, incorrect, camera, alternative, errors };
}

export function updateSituationRun(situation: Situation, run: SituationRun | undefined, event: SituationStudyEvent, at: string): SituationRun | undefined {
  if (event.type === 'situation-start') return run ?? { startedAt: at, scenes: {} };
  if (event.type === 'situation-repeat') return run?.completedAt ? { startedAt: at, scenes: {} } : run;
  if (!run || run.completedAt) return run;
  const scene = nextSituationScene(situation, run);
  if (event.type === 'situation-finish') return scene ? run : { ...run, completedAt: at };
  if (!scene || !('sceneId' in event) || event.sceneId !== scene.id) return run;

  const current = run.scenes[scene.id];
  let answer: SceneStudy;
  if (event.type === 'situation-select') {
    const choiceId = optionId(scene, event.choiceId);
    if (!choiceId || choiceId === current?.choiceId) return run;
    answer = { choiceId, checked: false, attempts: current?.attempts ?? [] };
  } else if (!current) return run;
  else if (event.type === 'situation-check') {
    if (current.checked) return run;
    answer = { ...current, checked: true, attempts: [...current.attempts, current.choiceId] };
  } else {
    if (!current.checked) return run;
    const practice = restorePractice(scene, current.choiceId, event.input);
    if (!practice) return run;
    answer = { ...current, practice };
  }
  return { ...run, scenes: { ...run.scenes, [scene.id]: answer } };
}

export function restoreSituationRun(situation: Situation, value: unknown): SituationRun | undefined {
  if (!object(value) || !(value.startedAt === null || date(value.startedAt)) || !object(value.scenes)) return;
  const run: SituationRun = { startedAt: value.startedAt, scenes: {} };
  let ordered = true;
  for (const scene of situation.scenes) {
    const saved = value.scenes[scene.id];
    const choiceId = object(saved) ? optionId(scene, saved.choiceId) : undefined;
    if (!choiceId || !object(saved)) { ordered = false; continue; }
    const attempts = Array.isArray(saved.attempts) ? saved.attempts.flatMap(id => optionId(scene, id) ?? []) : [];
    const checked = saved.checked === true && attempts.at(-1) === choiceId;
    const practice = ordered && checked ? restorePractice(scene, choiceId, saved.practice) : undefined;
    run.scenes[scene.id] = { choiceId, attempts, checked, ...(practice && { practice }) };
    ordered = !!practice;
  }
  if (ordered && date(value.completedAt)) run.completedAt = value.completedAt;
  return run;
}

/** Recover answers from the prototype without attributing practice or dates. */
export function restoreLegacySituations(stored: string | null) {
  const runs: Record<string, SituationRun> = {};
  try {
    const parsed: unknown = JSON.parse(stored ?? 'null');
    if (!object(parsed)) return runs;
    for (const situation of allSituations) {
      const saved = parsed[situation.id];
      if (!object(saved) || !object(saved.answers)) continue;
      const scenes: Record<string, SceneStudy> = {};
      for (const scene of situation.scenes) {
        const answer = saved.answers[scene.id];
        const choiceId = object(answer) && optionId(scene, answer.choiceId);
        if (!choiceId || !object(answer)) continue;
        const checked = answer.checked === true;
        scenes[scene.id] = { choiceId, checked, attempts: checked ? [choiceId] : [] };
      }
      if (Object.keys(scenes).length) runs[situation.id] = { startedAt: null, scenes };
    }
  } catch { /* Unreadable prototype data has no effect on shared progress. */ }
  return runs;
}
