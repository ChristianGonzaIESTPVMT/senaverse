import { getCurriculumProgress, getLessonLocation, initialCompletedLessonIds, legacyUnitLessonIds } from './curriculum.ts';
import { getEducationalSign } from './library.ts';
import { getSituation } from './situations.ts';
import { getMinigame, type Minigame, type GameSettings } from './minigames.ts';
import { POINTS_PER_SUCCESS, validateGameOutcome, type GameOutcome } from './minigameRun.ts';
import { nextStudyStep, restoreStudyRun, reviewAssessment, submitStudyStep, type StudyInput, type StudyRun } from './lessonStudy.ts';
import { restoreLegacySituations, restoreSituationRun, updateSituationRun,
  type SituationRun, type SituationStudyEvent } from './situationStudy.ts';

export const PROGRESS_KEY = 'senaverse-student-progress-v1';
export const LEGACY_PROGRESS_KEY = 'senaverse-demo-completed-v1';
export const LESSON_XP = 80;
export const EXPLORER_SIGN_COUNT = 3;
export const CONSISTENCY_UNIT_COUNT = 2;

type Recognition = { recognized: true; confidence?: number };
type ActivityEvent =
  | { type: 'lesson'; lessonId: string }
  | { type: 'camera'; sessionId: string; signId: string; result: Recognition }
  | { type: 'situation-scene'; situationId: string; sceneId: string; result: Recognition }
  | { type: 'minigame'; runId: string; gameId: string; score: number; maxScore: number; completed: true; details?: GameOutcome };
type StudyEvent = { type: 'lesson-start' | 'lesson-finish'; lessonId: string }
  | { type: 'lesson-step' | 'lesson-review'; lessonId: string; stepId: string; input: StudyInput };
export type ProgressEvent = ActivityEvent | StudyEvent | SituationStudyEvent
  | { type: 'camera-saved'; sessionId: string; signId: string };

export type ProgressActivity = {
  id: string;
  type: ActivityEvent['type'] | 'situation';
  targetId: string;
  occurredAt: string | null;
  result?: Recognition | { score: number; maxScore: number; details?: GameOutcome };
  rewardXp?: number;
};
export type StudentProgress = { version: 1; activities: ProgressActivity[]; consultedSignIds: string[];
  consultedAt?: Record<string, string>; lessonStudy?: Record<string, StudyRun>;
  situationStudy?: Record<string, SituationRun>; situationArchive?: Record<string, SituationRun[]> };
export const emptyProgress = (): StudentProgress => ({ version: 1, activities: [], consultedSignIds: [] });

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function canWriteProgress(stored: string | null) {
  try {
    const value: unknown = JSON.parse(stored ?? 'null');
    return !record(value) || value.version === undefined || value.version === 1;
  } catch { return true; }
}

function validRecognition(value: unknown, allowUndetailed = false): value is Recognition {
  return record(value) && value.recognized === true && ((allowUndetailed && value.confidence === undefined)
    || (typeof value.confidence === 'number' && Number.isFinite(value.confidence) && value.confidence >= 0 && value.confidence <= 1));
}

function validTime(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function normalizeActivity(value: unknown): ProgressActivity | null {
  if (!record(value) || typeof value.id !== 'string' || !value.id.trim() || value.id.length > 200
    || typeof value.targetId !== 'string' || !(validTime(value.occurredAt) || (value.type === 'lesson' && value.occurredAt === null))) return null;

  const base = { id: value.id, targetId: value.targetId, occurredAt: value.occurredAt as string | null };
  if (value.type === 'lesson' && getLessonLocation(value.targetId) && value.id === `lesson:${value.targetId}`) {
    return { ...base, type: 'lesson' };
  }
  if (value.type === 'camera' && value.id.startsWith('camera:') && getEducationalSign(value.targetId) && validRecognition(value.result, true)) {
    return { ...base, type: 'camera', result: { recognized: true,
      ...(value.result.confidence !== undefined && { confidence: value.result.confidence }) } };
  }
  if (value.type === 'situation-scene' && validRecognition(value.result)) {
    const [situationId, sceneId] = value.targetId.split('/');
    if (value.targetId === `${situationId}/${sceneId}` && getSituation(situationId)?.scenes.some(scene => scene.id === sceneId)
      && value.id === `situation-scene:${situationId}/${sceneId}`) {
      return { ...base, type: 'situation-scene', result: { recognized: true, confidence: value.result.confidence } };
    }
  }
  if (value.type === 'situation' && value.id === `situation:${value.targetId}`) {
    const situation = getSituation(value.targetId);
    if (situation && value.rewardXp === situation.rewardXp && situation.rewardXp) return { ...base, type: 'situation', rewardXp: situation.rewardXp };
  }
  const game = value.type === 'minigame' && getMinigame(value.targetId);
  if (game && value.id.startsWith('minigame:') && value.id.length > 'minigame:'.length
    && record(value.result) && typeof value.result.score === 'number' && typeof value.result.maxScore === 'number'
    && Number.isFinite(value.result.score) && Number.isFinite(value.result.maxScore)
    && value.result.maxScore > 0 && value.result.score >= 0 && value.result.score <= value.result.maxScore) {
    const { score, maxScore } = value.result;
    if (value.result.details === undefined) return { ...base, type: 'minigame', result: { score, maxScore } };
    const details = validateGameOutcome(game, value.result.details);
    if (details && score === details.correct * POINTS_PER_SUCCESS && maxScore === details.limit * POINTS_PER_SUCCESS) {
      return { ...base, type: 'minigame', result: { score, maxScore, details } };
    }
  }
  return null;
}

function appendActivity(state: StudentProgress, activity: ProgressActivity): StudentProgress {
  const existing = state.activities.find(item => item.id === activity.id);
  if (existing) {
    if (activity.rewardXp && !existing.rewardXp) {
      return { ...state, activities: state.activities.map(item => item === existing ? activity : item) };
    }
    return state;
  }
  if (activity.type === 'minigame' && activity.result && 'details' in activity.result && activity.result.details?.correct
    && !state.activities.some(item => item.type === 'minigame' && item.targetId === activity.targetId && item.rewardXp)) {
    activity = { ...activity, rewardXp: getMinigame(activity.targetId)?.rewardXp };
  }
  const activities = [...state.activities, activity];
  if (activity.type === 'situation-scene') {
    const situation = getSituation(activity.targetId.split('/')[0]);
    if (situation && !activities.some(item => item.id === `situation:${situation.id}`)
      && situation.scenes.every(scene => activities.some(item => item.type === 'situation-scene' && item.targetId === `${situation.id}/${scene.id}`))) {
      activities.push({ id: `situation:${situation.id}`, type: 'situation', targetId: situation.id, occurredAt: activity.occurredAt });
    }
  }
  return { ...state, activities };
}

function recordSituationEvent(state: StudentProgress, event: SituationStudyEvent, at: string) {
  const situation = getSituation(event.situationId);
  if (!situation) return state;
  const previous = state.situationStudy?.[situation.id];
  const run = updateSituationRun(situation, previous, event, at);
  if (!run || run === previous) return state;
  const next = { ...state, situationStudy: { ...state.situationStudy, [situation.id]: run } };
  if (event.type === 'situation-repeat' && previous?.completedAt) {
    next.situationArchive = { ...state.situationArchive, [situation.id]: [...(state.situationArchive?.[situation.id] ?? []), previous] };
  }
  return run.completedAt ? appendActivity(next, { id: `situation:${situation.id}`, type: 'situation', targetId: situation.id,
    occurredAt: run.completedAt, rewardXp: situation.rewardXp }) : next;
}

function recordStudyEvent(state: StudentProgress, event: StudyEvent, at: string): StudentProgress {
  const plan = getLessonLocation(event.lessonId)?.lesson.plan;
  if (!plan) return state;
  const previous = state.lessonStudy?.[event.lessonId];
  let run: StudyRun;
  switch (event.type) {
    case 'lesson-start':
      if (previous) return state;
      run = { startedAt: at, steps: {} };
      break;
    case 'lesson-step':
    case 'lesson-review':
      if (!previous) return state;
      run = event.type === 'lesson-step'
        ? submitStudyStep(plan, previous, event.stepId, event.input, at)
        : reviewAssessment(plan, previous, event.stepId, event.input, at);
      if (run === previous) return state;
      break;
    case 'lesson-finish':
      if (!previous || previous.completedAt || nextStudyStep(plan, previous) !== plan.steps.length) return state;
      run = { ...previous, completedAt: at };
      break;
  }
  const next = { ...state, lessonStudy: { ...state.lessonStudy, [event.lessonId]: run } };
  return event.type === 'lesson-finish'
    ? appendActivity(next, { id: `lesson:${event.lessonId}`, type: 'lesson', targetId: event.lessonId, occurredAt: at }) : next;
}

/** The existing completion ledger remains the source of XP for every lesson. */
export function recordProgressEvent(state: StudentProgress, event: ProgressEvent, occurredAt = new Date().toISOString()): StudentProgress {
  if (!validTime(occurredAt)) return state;
  let candidate: unknown;
  switch (event.type) {
    case 'lesson-start':
    case 'lesson-step':
    case 'lesson-review':
    case 'lesson-finish': return recordStudyEvent(state, event, occurredAt);
    case 'situation-start':
    case 'situation-select':
    case 'situation-check':
    case 'situation-practice':
    case 'situation-attempt-start':
    case 'situation-attempt-result':
    case 'situation-finish':
    case 'situation-repeat': return recordSituationEvent(state, event, occurredAt);
    case 'lesson':
      if (getLessonLocation(event.lessonId)?.lesson.plan) return state;
      candidate = { id: `lesson:${event.lessonId}`, type: event.type, targetId: event.lessonId, occurredAt };
      break;
    case 'camera':
      if (!event.sessionId?.trim() || !validRecognition(event.result)) return state;
      candidate = { id: `camera:${event.sessionId}`, type: event.type, targetId: event.signId, result: event.result, occurredAt }; break;
    case 'camera-saved':
      if (!event.sessionId?.trim() || getEducationalSign(event.signId)?.recognitionClassId !== event.signId) return state;
      candidate = { id: `camera:${event.sessionId}`, type: 'camera', targetId: event.signId, result: { recognized: true }, occurredAt }; break;
    case 'situation-scene': candidate = { id: `situation-scene:${event.situationId}/${event.sceneId}`, type: event.type, targetId: `${event.situationId}/${event.sceneId}`, result: event.result, occurredAt }; break;
    case 'minigame':
      if (event.completed !== true || !event.runId?.trim()) return state;
      candidate = { id: `minigame:${event.runId}`, type: event.type, targetId: event.gameId,
        result: { score: event.score, maxScore: event.maxScore, details: event.details }, occurredAt }; break;
    default: return state;
  }
  const activity = normalizeActivity(candidate);
  return activity ? appendActivity(state, activity) : state;
}

export function recordSignConsultation(state: StudentProgress, signId: string, at?: string): StudentProgress {
  const sign = getEducationalSign(signId);
  if (!sign || state.consultedSignIds.includes(sign.id)) return state;
  return { ...state, consultedSignIds: [...state.consultedSignIds, sign.id],
    ...(validTime(at) && { consultedAt: { ...state.consultedAt, [sign.id]: at } }) };
}

function restoreLegacyLessons(state: StudentProgress, legacy: string | null) {
  try {
    const parsed: unknown = JSON.parse(legacy ?? 'null');
    if (Array.isArray(parsed)) for (const id of parsed) {
      if (typeof id === 'string' && !initialCompletedLessonIds.includes(id) && getLessonLocation(id)) {
        state = appendActivity(state, { id: `lesson:${id}`, type: 'lesson', targetId: id, occurredAt: null });
      }
    }
  } catch { /* There are no additional legacy completions to recover. */ }
  return state;
}

/** Legacy seed lessons were always inserted automatically; they are not evidence of completion. */
export function restoreProgress(stored: string | null, legacy: string | null = null, legacySituations: string | null = null): StudentProgress {
  let state = emptyProgress();
  const migratedSituations = restoreLegacySituations(legacySituations);
  if (Object.keys(migratedSituations).length) state.situationStudy = migratedSituations;
  try {
    const parsed: unknown = JSON.parse(stored ?? 'null');
    if (record(parsed) && parsed.version === 1) {
      if (!Array.isArray(parsed.activities)) state = restoreLegacyLessons(state, legacy);
      for (const value of Array.isArray(parsed.activities) ? parsed.activities : []) {
        const activity = normalizeActivity(value);
        if (activity) state = appendActivity(state, activity);
      }
      const consultations = record(parsed.consultedAt) ? parsed.consultedAt : {};
      const knownIds = Array.isArray(parsed.consultedSignIds) ? parsed.consultedSignIds
        : Object.keys(consultations).filter(id => validTime(consultations[id]));
      for (const id of knownIds) {
        if (typeof id !== 'string') continue;
        const sign = getEducationalSign(id);
        const at = consultations[id] ?? (sign && consultations[sign.id]);
        state = recordSignConsultation(state, id, validTime(at) ? at : undefined);
      }
      if (record(parsed.lessonStudy)) {
        for (const [id, value] of Object.entries(parsed.lessonStudy)) {
          const plan = getLessonLocation(id)?.lesson.plan;
          const run = plan && restoreStudyRun(plan, value);
          if (!run) continue;
          state = { ...state, lessonStudy: { ...state.lessonStudy, [id]: run } };
          if (run.completedAt) state = appendActivity(state, { id: `lesson:${id}`, type: 'lesson', targetId: id, occurredAt: run.completedAt });
        }
      }
      if (record(parsed.situationStudy)) {
        const runs: Record<string, SituationRun> = {};
        state.situationStudy = runs;
        for (const [id, value] of Object.entries(parsed.situationStudy)) {
          const situation = getSituation(id);
          const run = situation && restoreSituationRun(situation, value);
          if (!run || !situation) continue;
          runs[id] = run;
          if (run.completedAt) state = appendActivity(state, { id: `situation:${id}`, type: 'situation', targetId: id,
            occurredAt: run.completedAt, rewardXp: situation.rewardXp });
        }
      }
      if (record(parsed.situationArchive)) {
        for (const [id, history] of Object.entries(parsed.situationArchive)) {
          const situation = getSituation(id);
          if (!situation || !Array.isArray(history)) continue;
          const runs = history.flatMap(value => {
            const run = restoreSituationRun(situation, value);
            return run?.completedAt ? [run] : [];
          });
          if (!runs.length) continue;
          state = { ...state, situationArchive: { ...state.situationArchive, [id]: runs } };
          const first = runs[0];
          if (first.completedAt) state = appendActivity(state, { id: `situation:${id}`, type: 'situation', targetId: id,
            occurredAt: first.completedAt, rewardXp: situation.rewardXp });
        }
      }
      return state;
    }
  } catch { /* Recover valid legacy completions if the new storage is damaged. */ }
  return restoreLegacyLessons(state, legacy);
}

export function getProgressTotals(state: StudentProgress) {
  const completed = state.activities.filter(item => item.type === 'lesson').map(item => item.targetId);
  const xp = completed.length * LESSON_XP + state.activities.reduce((total, item) => total + (item.rewardXp ?? 0), 0);
  return { completed, xp };
}

export function summarizeProgress(state: StudentProgress) {
  const { completed, xp } = getProgressTotals(state);
  let lessonCameraPractices = 0, lessonAlternatives = 0;
  for (const run of Object.values(state.lessonStudy ?? {})) {
    for (const step of Object.values(run.steps)) {
      if (!step.complete) continue;
      const method = step.attempts.at(-1)?.input.method;
      if (method === 'camera') lessonCameraPractices++;
      if (method === 'alternative') lessonAlternatives++;
    }
  }
  const { unitProgress, percent } = getCurriculumProgress(state);
  return {
    completed,
    unitProgress,
    percent,
    practices: state.activities.filter(item => item.type === 'camera').length + lessonCameraPractices + lessonAlternatives,
    lessonCameraPractices,
    lessonAlternatives,
    xp,
    achievements: [
      { id: 'first-step', name: 'Primer paso', description: 'Completa tu primera lección.', obtained: completed.length >= 1 },
      { id: 'explorer', name: 'Explorador', description: `Consulta las fichas de ${EXPLORER_SIGN_COUNT} señas diferentes en la Biblioteca.`, obtained: state.consultedSignIds.length >= EXPLORER_SIGN_COUNT },
      { id: 'consistency', name: 'Constancia', description: `Completa ${CONSISTENCY_UNIT_COUNT} unidades del recorrido anterior.`,
        obtained: legacyUnitLessonIds.filter(ids => ids.every(id => completed.includes(id))).length >= CONSISTENCY_UNIT_COUNT },
    ],
    recent: state.activities.toReversed().toSorted((a, b) =>
      (b.occurredAt ? Date.parse(b.occurredAt) : -Infinity) - (a.occurredAt ? Date.parse(a.occurredAt) : -Infinity)),
  };
}

export function describeActivity(activity: ProgressActivity) {
  switch (activity.type) {
    case 'lesson': return `Completaste la lección “${getLessonLocation(activity.targetId)?.lesson.title ?? activity.targetId}”`;
    case 'camera': return `Practicaste “${getEducationalSign(activity.targetId)?.word ?? activity.targetId}” en Cámara`;
    case 'situation': return `Completaste la situación “${getSituation(activity.targetId)?.title ?? activity.targetId}”`;
    case 'situation-scene': {
      const [situationId, sceneId] = activity.targetId.split('/');
      const scene = getSituation(situationId)?.scenes.find(item => item.id === sceneId);
      return `Completaste la escena “${scene?.title ?? sceneId}”`;
    }
    case 'minigame': return `Finalizaste “${getMinigame(activity.targetId)?.title ?? activity.targetId}”`;
  }
}

export function summarizeMinigame(state: StudentProgress, game: Minigame, settings?: GameSettings, limit?: number) {
  const plays = state.activities.filter(item => item.type === 'minigame' && item.targetId === game.id);
  let best: { score: number; details: GameOutcome } | undefined;
  let legacyBest: number | undefined;
  for (const play of plays) {
    if (!play.result || !('score' in play.result)) continue;
    const { score, details } = play.result;
    if (!details) { legacyBest = Math.max(legacyBest ?? 0, score); continue; }
    if (settings && (details.settings.category !== settings.category || details.settings.difficulty !== settings.difficulty
      || details.settings.duration !== settings.duration || details.limit !== limit)) continue;
    if (!best || score > best.score || (score === best.score && (details.errors < best.details.errors
      || (game.kind === 'memory' && settings && details.errors === best.details.errors && details.elapsedMs < best.details.elapsedMs)))) {
      best = { score, details };
    }
  }
  return { plays: plays.length, best, legacyBest };
}
