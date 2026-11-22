import { functionalLessons, getCurriculumProgress, getLessonLocation, getLessonPath, legacyUnitLessonIds } from './curriculum.ts';
import { summarizeLearningDays } from './learningCalendar.ts';
import { nextStudyStep } from './lessonStudy.ts';
import { getEducationalSign } from './library.ts';
import { getMinigame, getMinigamePath, minigames } from './minigames.ts';
import { describeActivity, getProgressTotals, summarizeMinigame, LESSON_XP, EXPLORER_SIGN_COUNT, CONSISTENCY_UNIT_COUNT,
  type StudentProgress } from './progress.ts';
import { nextSituationScene } from './situationStudy.ts';
import { getSituation, getSituationPath, situations } from './situations.ts';

export const studentLevels = [
  { name: 'Exploración', xp: 0 }, { name: 'Primer avance', xp: 80 }, { name: 'Práctica activa', xp: 200 },
  { name: 'Aprendizaje continuo', xp: 320 }, { name: 'Trayectoria activa', xp: 420 },
] as const;

export function getStudentLevel(xp: number) {
  xp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const index = studentLevels.findLastIndex(level => xp >= level.xp);
  const level = studentLevels[Math.max(0, index)];
  const next = studentLevels[index + 1];
  return { ...level, number: Math.max(0, index) + 1, next, remaining: next ? next.xp - xp : 0,
    percent: next ? Math.floor(100 * (xp - level.xp) / (next.xp - level.xp)) : 100 };
}

export type StudentHistoryEntry = { id: string; module: 'lesson' | 'situation' | 'minigame' | 'camera' | 'library';
  at: string | null; label: string; detail?: string; learning: boolean };
type Evidence = { at: string | null; amount?: number };
export type StudentAchievement = { id: string; name: string; description: string; obtained: boolean;
  obtainedAt?: string; goal: number; value: number };

const time = (at: string | null | undefined) => at ? Date.parse(at) : -Infinity;

function milestone(id: string, name: string, description: string, goal: number, evidence: Evidence[]): StudentAchievement {
  let value = 0;
  let obtainedAt: string | undefined;
  for (const item of evidence.toSorted((a, b) => time(a.at) - time(b.at))) {
    const before = value;
    value += item.amount ?? 1;
    if (before < goal && value >= goal) obtainedAt = item.at ?? undefined;
  }
  return { id, name, description, goal, value, obtained: value >= goal,
    ...(obtainedAt && evidence.every(item => item.at !== null) && { obtainedAt }) };
}

export function selectStudentOverview(state: StudentProgress, now: number) {
  const base = getProgressTotals(state);
  const curriculum = getCurriculumProgress(state);
  const history: StudentHistoryEntry[] = [];
  const studied = new Set<string>();
  const matches: Evidence[] = [];
  const completedLessons: Evidence[] = [];
  const completedNumbers: Evidence[] = [];
  const completedSituations = new Map<string, Evidence>();
  const completedGames = new Map<string, Evidence>();
  const xp: Evidence[] = [];
  let alternatives = 0;
  let lessonSteps = 0, historicalLessons = 0, situationInteractions = 0, situationCorrect = 0, situationErrors = 0;
  let gameRuns = 0, gameCorrect = 0, gameErrors = 0;
  const evaluations: { id: string; title: string; score: number; total: number; at: string; attempts: number }[] = [];
  const pendingLessons: { title: string; path: string; detail: string; at: string }[] = [];
  const pendingSituations: { title: string; path: string; detail: string; at: string | null }[] = [];

  function rememberFirst(items: Map<string, Evidence>, id: string, at: string | null) {
    const saved = items.get(id);
    if (!saved || time(at) < time(saved.at)) items.set(id, { at });
  }

  for (const activity of state.activities) {
    const { targetId, occurredAt: at, type, result, rewardXp } = activity;
    let detail: string | undefined;
    let learning = true;
    if (type === 'lesson') {
      completedLessons.push({ at });
      learning = !!at && state.lessonStudy?.[targetId]?.completedAt === at;
      xp.push({ at, amount: LESSON_XP });
      if (!learning) { detail = 'Finalización anterior'; historicalLessons++; }
    } else if (type === 'camera' || type === 'situation-scene') {
      matches.push({ at });
      detail = 'Coincidencia experimental con cámara';
    } else if (type === 'situation') {
      learning = !!rewardXp || !!state.situationStudy?.[targetId]?.completedAt || !!state.situationArchive?.[targetId]?.length;
      if (learning && situations.some(situation => situation.id === targetId)) rememberFirst(completedSituations, targetId, at);
    } else if (type === 'minigame') {
      gameRuns++;
      const outcome = result && 'score' in result ? result : undefined;
      const details = outcome?.details;
      learning = !details || details.correct + details.errors > 0;
      if (learning) rememberFirst(completedGames, targetId, at);
      if (outcome) detail = `${outcome.score} puntos de partida`;
      if (details) {
        if (getMinigame(targetId)?.kind !== 'challenge') {
          gameCorrect += details.correct;
          gameErrors += details.errors;
        }
        for (let count = 0; count < details.camera; count++) matches.push({ at });
        alternatives += details.alternative;
        details.practicedSignIds?.forEach(id => studied.add(id));
      }
    }
    if (rewardXp) xp.push({ at, amount: rewardXp });
    history.push({ id: activity.id, module: type === 'situation-scene' ? 'situation' : type, at, label: describeActivity(activity), detail, learning });
  }

  for (const [id, run] of Object.entries(state.lessonStudy ?? {})) {
    const location = getLessonLocation(id);
    const plan = location?.lesson.plan;
    if (!location || !plan) continue;
    if (run.completedAt) {
      if (id === 'numeros') completedNumbers.push({ at: run.completedAt });
      if (!state.activities.some(item => item.type === 'lesson' && item.targetId === id && item.occurredAt === run.completedAt)) {
        history.push({ id: `lesson-run:${id}`, module: 'lesson', at: run.completedAt, label: `Completaste la lección “${location.lesson.title}”`, learning: true });
      }
    }
    let lastAt = run.startedAt;
    for (const step of plan.steps) {
      const progress = run.steps[step.id];
      const attempt = progress?.attempts.at(-1);
      if (!attempt) continue;
      if (time(attempt.at) > time(lastAt)) lastAt = attempt.at;
      if (!progress.complete) continue;
      lessonSteps++;
      if (step.kind === 'study') step.signs.forEach(sign => studied.add(sign.id));
      if (step.kind === 'assessment') {
        const reviews = progress.reviewAttempts ?? [];
        const latest = reviews.at(-1) ?? attempt;
        if (latest.grade) evaluations.push({ id: `${id}/${step.id}`, title: location.lesson.title, ...latest.grade,
          at: latest.at, attempts: 1 + reviews.length });
        reviews.forEach((review, index) => {
          if (time(review.at) > time(lastAt)) lastAt = review.at;
          if (review.grade) history.push({ id: `review:${id}/${step.id}/${index}`, module: 'lesson', at: review.at,
            label: `Repetiste la evaluación de “${location.lesson.title}”`,
            detail: `${review.grade.score} de ${review.grade.total} correctas`, learning: true });
        });
      }
      if (step.kind === 'practice') studied.add(step.targetId);
      if (attempt.input.method === 'camera') matches.push({ at: attempt.at });
      if (attempt.input.method === 'alternative') alternatives++;
      history.push({ id: `step:${id}/${step.id}`, module: 'lesson', at: attempt.at, label: step.title,
        detail: attempt.input.method === 'camera' ? 'Coincidencia experimental con cámara' : attempt.input.method === 'alternative' ? 'Ejercicio sin cámara' : location.lesson.title,
        learning: true });
    }
    if (!run.completedAt) {
      pendingLessons.push({ title: location.lesson.title, path: getLessonPath(location.unit.id, id),
        detail: plan.steps[nextStudyStep(plan, run)]?.title ?? 'Resumen de la lección', at: lastAt });
    }
  }

  const situationIds = new Set([...Object.keys(state.situationStudy ?? {}), ...Object.keys(state.situationArchive ?? {})]);
  for (const id of situationIds) {
    const situation = getSituation(id);
    if (!situation) continue;
    const current = state.situationStudy?.[id];
    const runs = [...(state.situationArchive?.[id] ?? []), ...(current ? [current] : [])];
    for (const [index, run] of runs.entries()) {
      let lastAt = run.startedAt;
      if (run.completedAt && situations.some(item => item.id === id)) rememberFirst(completedSituations, id, run.completedAt);
      if (run.completedAt && !state.activities.some(item => item.type === 'situation' && item.targetId === id && item.occurredAt === run.completedAt)) {
        history.push({ id: `situation-run:${id}/${index}`, module: 'situation', at: run.completedAt,
          label: `Completaste la situación “${situation.title}”`, learning: true });
      }
      for (const scene of situation.scenes) {
        const answer = run.scenes[scene.id];
        if (!answer) continue;
        const correct = answer.attempts.filter(choice => choice === scene.expectedSignId).length;
        situationCorrect += correct;
        situationErrors += answer.attempts.length - correct;
        if (!answer.practice) continue;
        situationInteractions++;
        studied.add(answer.choiceId);
        const at = answer.practiceAt ?? null;
        if (at && time(at) > time(lastAt)) lastAt = at;
        if (answer.practice.method === 'camera') matches.push({ at });
        else alternatives++;
        history.push({ id: `scene:${id}/${index}/${scene.id}`, module: 'situation', at, label: scene.title,
          detail: answer.practice.method === 'camera' ? 'Coincidencia experimental con cámara' : 'Ejercicio sin cámara', learning: true });
      }
      if (run === current && !run.completedAt && situations.some(item => item.id === id)) {
        pendingSituations.push({ title: situation.title, path: getSituationPath(id),
          detail: nextSituationScene(situation, run)?.title ?? 'Última interacción', at: lastAt });
      }
    }
  }

  const consults: Evidence[] = [], withReferences: Evidence[] = [];
  for (const id of state.consultedSignIds) {
    const sign = getEducationalSign(id);
    if (!sign) continue;
    const at = state.consultedAt?.[id] ?? null;
    consults.push({ at });
    if (sign.reference || sign.videoSrc || sign.thumbnailSrc || sign.handDiagram) withReferences.push({ at });
    history.push({ id: `consult:${id}`, module: 'library', at, label: `Consultaste la ficha de ${sign.word}`, learning: false });
  }

  const calendar = summarizeLearningDays(history.filter(item => item.learning).map(item => item.at), now);
  const legacyUnits = legacyUnitLessonIds.flatMap(ids => {
    if (!ids.every(id => base.completed.includes(id))) return [];
    const dates = state.activities.filter(item => item.type === 'lesson' && ids.includes(item.targetId))
      .map(item => item.occurredAt);
    return [{ at: dates.includes(null) ? null : dates.toSorted((a, b) => time(b) - time(a))[0] ?? null }];
  });
  const achievements = [
    milestone('first-step', 'Primer paso', 'Completa tu primera lección.', 1, completedLessons),
    milestone('explorer', 'Explorador', 'Consulta tres fichas distintas en Biblioteca.', EXPLORER_SIGN_COUNT, consults),
    milestone('consistency', 'Constancia del recorrido', 'Completa dos unidades del recorrido anterior.', CONSISTENCY_UNIT_COUNT, legacyUnits),
    milestone('numbers', 'Dominando los números', 'Completa la lección Números básicos.', 1, completedNumbers),
    milestone('first-practice', 'Primera práctica', 'Guarda una coincidencia experimental con cámara.', 1, matches),
    milestone('communicator', 'Comunicador', 'Completa las seis situaciones actuales.', situations.length, [...completedSituations.values()]),
    milestone('play', 'Aprender jugando', 'Termina una partida con participación en cada minijuego.', minigames.length, [...completedGames.values()]),
    { id: 'streak', name: 'Constancia', description: 'Aprende durante tres días consecutivos.', obtained: calendar.best >= 3,
      value: calendar.best, goal: 3, obtainedAt: calendar.streakAwardAt },
    milestone('reference-explorer', 'Explorador de señas', 'Consulta diez fichas distintas con referencia disponible.', 10, withReferences),
    milestone('learner', 'Aprendiz destacado', 'Acumula 400 XP en SeñaVerse.', 400, xp),
  ];
  const sortDate = <T extends { at: string | null }>(items: T[]) => items.toSorted((a, b) => time(b.at) - time(a.at));
  const firstLesson = functionalLessons.find(({ lesson }) => !curriculum.completed.includes(lesson.id)) ?? functionalLessons[0];
  const initialLesson = firstLesson && { title: firstLesson.lesson.title, path: getLessonPath(firstLesson.unit.id, firstLesson.lesson.id),
    detail: firstLesson.lesson.description, completed: curriculum.completed.includes(firstLesson.lesson.id) };
  const latestAchievements = achievements.filter(badge => badge.obtained).toSorted((a, b) => time(b.obtainedAt) - time(a.obtainedAt));
  return { xp: base.xp, level: getStudentLevel(base.xp), curriculum, calendar, achievements, latestAchievements, history: sortDate(history),
    lessonSteps, lessonStarts: Object.keys(state.lessonStudy ?? {}).length, historicalLessons,
    situationInteractions, situationStarts: situationIds.size, situationCorrect, situationErrors, gameRuns, gameCorrect, gameErrors,
    completedSituations: completedSituations.size, completedGames: completedGames.size, consulted: consults.length, studied: studied.size,
    matches: matches.length, alternatives, practices: matches.length + alternatives, evaluations,
    records: minigames.map(game => ({ game, path: getMinigamePath(game.id), ...summarizeMinigame(state, game) })),
    resumeLesson: sortDate(pendingLessons)[0], resumeSituation: sortDate(pendingSituations)[0], initialLesson };
}
