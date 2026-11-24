import { getEducationalSign, getEducationalSignForClass, type LibraryEntry } from './library.ts';
import { getHandCountExercise, type ChoiceExercise, type SignPractice } from './signExercises.ts';
import { allSituations, type Situation, type SituationScene } from './situations.ts';
import { signQuizMedia } from './signQuizMedia.ts';
import type { RecognitionObservation } from '../features/sign-recognition/recognitionResult.ts';

export const LEGACY_SITUATION_KEY = 'senaverse-situation-answers-v1';

export type SituationPractice = SignPractice;
type AttemptInput = { method: 'camera'; observation: RecognitionObservation } | { method: 'visual'; response: string };
export type SituationAttempt = AttemptInput & { id: string; choiceId: string; contextCorrect: boolean; matched: boolean; passed: boolean };
type ActiveAttempt = { id: string; method: AttemptInput['method'] };
export type SceneStudy = { choiceId: string; attempts: string[]; checked: boolean; practice?: SituationPractice; practiceAt?: string;
  active?: ActiveAttempt; evaluations?: SituationAttempt[] };
export type SituationRun = { startedAt: string | null; scenes: Record<string, SceneStudy>; completedAt?: string };
export type SituationStudyEvent = { type: 'situation-start' | 'situation-finish' | 'situation-repeat'; situationId: string }
  | { type: 'situation-select'; situationId: string; sceneId: string; choiceId: string }
  | { type: 'situation-check'; situationId: string; sceneId: string }
  | { type: 'situation-practice'; situationId: string; sceneId: string; input: SituationPractice }
  | { type: 'situation-attempt-start'; situationId: string; sceneId: string; attempt: ActiveAttempt }
  | { type: 'situation-attempt-result'; situationId: string; sceneId: string; attemptId: string; input: AttemptInput };

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

function legacyExercise(scene: SituationScene, sign: LibraryEntry): ChoiceExercise {
  if (sign.hands) return getHandCountExercise(sign.hands);
  return {
    type: 'choice', question: `¿Qué significado corresponde a «${sign.word}»?`,
    options: scene.optionIds.flatMap(id => {
      const option = getEducationalSign(id);
      return option ? [{ id: option.id, label: option.meaning }] : [];
    }),
    correctId: sign.id, success: 'Relacionaste la palabra con su significado.',
  };
}

export function getSituationVisualExercise(scene: SituationScene, sign: LibraryEntry): ChoiceExercise | undefined {
  const kind = ['LSP-001', 'LSP-002', 'LSP-003', 'LSP-004', 'LSP-005'].includes(sign.id) ? 'photo' : 'video';
  // The food scenes include Uno alongside two clips, so its photo needs comparable distractors.
  const supplemental = kind === 'photo' && scene.dialogue === 'visual' ? ['LSP-002', 'LSP-003']
    : !scene.dialogue && kind === 'video' ? ['LSP-007', 'LSP-009'] : [];
  const candidates = [...new Set([...scene.optionIds, ...supplemental])];
  const options = candidates.flatMap(id => {
    const entry = getEducationalSign(id);
    const media = entry && signQuizMedia(entry, kind);
    return media ? [{ id, label: '', media }] : [];
  }).map((option, index) => ({ ...option, label: `Demostración ${String.fromCharCode(65 + index)}` }));
  if (options.length < 2 || !options.some(option => option.id === sign.id)) return;
  return { type: 'choice', question: `¿Qué demostración corresponde a «${sign.word}»?`,
    options, correctId: sign.id, success: 'Identificaste la demostración de la seña elegida.',
    explanation: signQuizMedia(sign, kind)?.description };
}

export function getSituationCameraTarget(scene: SituationScene, sign: LibraryEntry | undefined) {
  return scene.dialogue === 'camera' ? sign?.recognitionClassId : undefined;
}

export function getSituationExercise(scene: SituationScene, sign: LibraryEntry) {
  return getSituationVisualExercise(scene, sign) ?? legacyExercise(scene, sign);
}

function restorePractice(scene: SituationScene, choiceId: string, value: unknown): SituationPractice | undefined {
  const sign = getEducationalSign(choiceId);
  if (!sign || !object(value)) return;
  if (value.method === 'camera' && sign.recognitionClassId && value.signId === sign.recognitionClassId) {
    return { method: 'camera', signId: sign.recognitionClassId };
  }
  if (value.method === 'alternative' && (value.response === getSituationExercise(scene, sign).correctId
    || value.response === legacyExercise(scene, sign).correctId)) {
    return { method: 'alternative', response: value.response };
  }
}

function evaluateAttempt(scene: SituationScene, id: string, choiceId: string, input: unknown): SituationAttempt | undefined {
  const sign = getEducationalSign(choiceId);
  if (!scene.dialogue || !sign || !object(input)) return;
  const contextCorrect = choiceId === scene.expectedSignId;
  const cameraTarget = getSituationCameraTarget(scene, sign);
  if (input.method === 'camera' && cameraTarget && object(input.observation)) {
    const { status, signId } = input.observation;
    let observation: RecognitionObservation;
    if (status === 'recognized' && typeof signId === 'string' && getEducationalSignForClass(signId)) observation = { status, signId };
    else if (status === 'unknown' || status === 'tracking') observation = { status };
    else return;
    const matched = observation.status === 'recognized' && observation.signId === cameraTarget;
    return { id, choiceId, contextCorrect, matched, passed: contextCorrect && matched, method: 'camera', observation };
  }
  const exercise = getSituationVisualExercise(scene, sign);
  const response = input.response;
  if (input.method === 'visual' && exercise && typeof response === 'string' && exercise.options.some(option => option.id === response)) {
    const matched = response === exercise.correctId;
    return { id, choiceId, contextCorrect, matched, passed: contextCorrect && matched, method: 'visual', response };
  }
}

function passedPractice(attempt: SituationAttempt | undefined): SituationPractice | undefined {
  if (!attempt?.passed) return;
  if (attempt.method === 'visual') return { method: 'alternative', response: attempt.response };
  if (attempt.observation.status === 'recognized') return { method: 'camera', signId: attempt.observation.signId };
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
    answer = { choiceId, checked: false, attempts: current?.attempts ?? [],
      ...(current?.evaluations && { evaluations: current.evaluations }) };
  } else if (!current) return run;
  else if (event.type === 'situation-attempt-start') {
    const { id, method } = event.attempt;
    const sign = getEducationalSign(current.choiceId);
    if (!scene.dialogue || !id || id === current.active?.id || current.evaluations?.some(item => item.id === id) || !sign) return run;
    if (method === 'camera' ? !getSituationCameraTarget(scene, sign)
      : method !== 'visual' || !getSituationVisualExercise(scene, sign)) return run;
    answer = { ...current, checked: false, active: { id, method } };
  } else if (event.type === 'situation-attempt-result') {
    if (current.active?.id !== event.attemptId || current.active.method !== event.input.method) return run;
    const evaluation = evaluateAttempt(scene, event.attemptId, current.choiceId, event.input);
    if (!evaluation) return run;
    const practice = passedPractice(evaluation);
    answer = { choiceId: current.choiceId, checked: true, attempts: [...current.attempts, current.choiceId],
      evaluations: [...(current.evaluations ?? []), evaluation], ...(practice && { practice, practiceAt: at }) };
  } else if (event.type === 'situation-check') {
    if (scene.dialogue || current.checked) return run;
    answer = { ...current, checked: true, attempts: [...current.attempts, current.choiceId] };
  } else {
    if (scene.dialogue || !current.checked || current.choiceId !== scene.expectedSignId || event.input.method === 'camera') return run;
    const sign = getEducationalSign(current.choiceId);
    if (!sign || event.input.response !== getSituationExercise(scene, sign).correctId) return run;
    const practice = restorePractice(scene, current.choiceId, event.input);
    if (!practice) return run;
    answer = { ...current, practice, practiceAt: at };
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
    const evaluations: SituationAttempt[] = [];
    if (Array.isArray(saved.evaluations)) for (const item of saved.evaluations) {
      if (!object(item) || typeof item.id !== 'string' || !item.id || evaluations.some(attempt => attempt.id === item.id)) continue;
      const selection = optionId(scene, item.choiceId);
      const attempt = selection && evaluateAttempt(scene, item.id, selection, item);
      if (attempt) evaluations.push(attempt);
    }
    const latest = evaluations.at(-1);
    const practice: SituationPractice | undefined = ordered && checked
      ? Array.isArray(saved.evaluations)
        ? latest?.choiceId === choiceId ? passedPractice(latest) : undefined
        : restorePractice(scene, choiceId, saved.practice)
      : undefined;
    const practiceAt = practice && date(saved.practiceAt) && (!run.startedAt || Date.parse(saved.practiceAt) >= Date.parse(run.startedAt))
      && (!date(value.completedAt) || Date.parse(saved.practiceAt) <= Date.parse(value.completedAt)) ? saved.practiceAt : undefined;
    run.scenes[scene.id] = { choiceId, attempts, checked, ...(evaluations.length > 0 && { evaluations }),
      ...(practice && { practice }), ...(practiceAt && { practiceAt }) };
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
