import { gameVocabulary, normalizeGameSettings, type GameSettings, type Minigame } from './minigames.ts';
import { getEducationalSign } from './library.ts';
import { getHandCountExercise, type SignPractice } from './signExercises.ts';

export const POINTS_PER_SUCCESS = 10;
export const TIMED_ROUNDS = 30;
export const CHALLENGE_CHECKPOINT_KEY = 'senaverse-minigame-challenge-v1';

type Score = { correct: number; errors: number; streak: number; bestStreak: number };
type Round = { signId: string; options: string[] };
type Card = { signId: string; side: 'diagram' | 'meaning' };
export type PracticeMethod = 'camera' | 'alternative';
type Memory = { kind: 'memory'; cards: Card[]; open: number[]; matched: number[] };
type Quiz = { kind: 'visual-quiz' | 'timed-quiz' | 'meaning-quiz'; rounds: Round[]; step: number; selected?: string };
type Challenge = { kind: 'challenge'; targets: string[]; methods: PracticeMethod[] };
export type GameRun = { id: string; settings: GameSettings; started: number; ended?: number; limit: number; score: Score; board: Memory | Quiz | Challenge };

type GameAction = { type: 'tick' | 'hide' | 'next'; at: number }
  | { type: 'flip'; at: number; index: number }
  | { type: 'answer'; at: number; choice: string; step: number }
  | { type: 'practice'; at: number; signId: string; input: SignPractice };

export type GameOutcome = { settings: GameSettings; limit: number; elapsedMs: number; correct: number; errors: number; bestStreak: number;
  camera: number; alternative: number };

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const ordered = [...items];
  for (let index = ordered.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [ordered[index], ordered[other]] = [ordered[other], ordered[index]];
  }
  return ordered;
}

export function gameSize(game: Minigame, settings: GameSettings) {
  const available = gameVocabulary(game, settings.category).length;
  return settings.duration ? TIMED_ROUNDS : Math.min(available, settings.difficulty === 'intermedio' ? 5 : 3);
}

function questions(pool: string[], size: number, options: number, random: () => number): Round[] {
  const result: Round[] = [];
  while (result.length < size) {
    const cycle = shuffle(pool, random);
    if (cycle[0] === result.at(-1)?.signId) [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
    for (const signId of cycle.slice(0, size - result.length)) {
      const distractors = shuffle(pool.filter(id => id !== signId), random).slice(0, options - 1);
      result.push({ signId, options: shuffle([signId, ...distractors], random) });
    }
  }
  return result;
}

const emptyScore = (): Score => ({ correct: 0, errors: 0, streak: 0, bestStreak: 0 });

export function createGameRun(game: Minigame, settings: GameSettings, id: string, started: number, random = Math.random): GameRun | undefined {
  settings = normalizeGameSettings(game, settings);
  const pool = gameVocabulary(game, settings.category).map(sign => sign.id);
  if (pool.length < (game.kind === 'challenge' ? 1 : 2)) return;
  const limit = gameSize(game, settings);
  const selected = shuffle(pool, random).slice(0, limit);
  let board: GameRun['board'];
  if (game.kind === 'memory') {
    const cards = selected.flatMap((signId): Card[] => [{ signId, side: 'diagram' }, { signId, side: 'meaning' }]);
    board = { kind: game.kind, cards: shuffle(cards, random), open: [], matched: [] };
  } else if (game.kind === 'challenge') board = { kind: game.kind, targets: selected, methods: [] };
  else board = { kind: game.kind, rounds: questions(pool, limit, settings.difficulty === 'intermedio' ? 4 : 3, random), step: 0 };
  return { id, settings, started, limit, board, score: emptyScore() };
}

function scored(score: Score, correct: boolean): Score {
  const streak = correct ? score.streak + 1 : 0;
  return { correct: score.correct + Number(correct), errors: score.errors + Number(!correct), streak, bestStreak: Math.max(streak, score.bestStreak) };
}

export function updateGameRun(run: GameRun, action: GameAction): GameRun {
  if (run.ended !== undefined || !Number.isFinite(action.at) || action.at < run.started) return run;
  const deadline = run.started + run.settings.duration * 1000;
  if (run.settings.duration && action.at >= deadline) return { ...run, ended: deadline };
  const board = run.board;
  switch (action.type) {
    case 'tick': return run;
    case 'flip': {
      if (board.kind !== 'memory' || !board.cards[action.index] || board.open.length >= 2
        || board.open.includes(action.index) || board.matched.includes(action.index)) return run;
      if (!board.open.length) return { ...run, board: { ...board, open: [action.index] } };
      const open = [board.open[0], action.index];
      const correct = board.cards[open[0]].signId === board.cards[open[1]].signId;
      const matched = correct ? [...board.matched, ...open] : board.matched;
      return { ...run, score: scored(run.score, correct), board: { ...board, matched, open: correct ? [] : open },
        ...(matched.length === board.cards.length && { ended: action.at }) };
    }
    case 'hide': return board.kind === 'memory' && board.open.length === 2 ? { ...run, board: { ...board, open: [] } } : run;
    case 'practice': {
      if (board.kind !== 'challenge' || action.signId !== board.targets[board.methods.length]) return run;
      const sign = getEducationalSign(action.signId);
      const { input } = action;
      if (!sign?.recognitionClassId || !sign.hands || (input.method === 'camera' ? input.signId !== sign.recognitionClassId
        : input.method !== 'alternative' || input.response !== getHandCountExercise(sign.hands).correctId)) return run;
      const methods = [...board.methods, input.method];
      return { ...run, board: { ...board, methods }, score: scored(run.score, true),
        ...(methods.length === board.targets.length && { ended: action.at }) };
    }
    case 'answer': {
      if (board.kind === 'memory' || board.kind === 'challenge' || board.step !== action.step || board.selected !== undefined) return run;
      const round = board.rounds[board.step];
      if (!round.options.includes(action.choice)) return run;
      return { ...run, board: { ...board, selected: action.choice }, score: scored(run.score, round.signId === action.choice) };
    }
    case 'next': {
      if (board.kind === 'memory' || board.kind === 'challenge' || board.selected === undefined) return run;
      return board.step + 1 === board.rounds.length ? { ...run, ended: action.at }
        : { ...run, board: { ...board, step: board.step + 1, selected: undefined } };
    }
  }
}

export function gameOutcome(run: GameRun): GameOutcome | undefined {
  if (run.ended === undefined) return;
  const methods = run.board.kind === 'challenge' ? run.board.methods : [];
  const camera = methods.filter(method => method === 'camera').length;
  return { settings: run.settings, limit: run.limit, elapsedMs: run.ended - run.started, correct: run.score.correct, errors: run.score.errors,
    bestStreak: run.score.bestStreak, camera, alternative: methods.length - camera };
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function restoreChallenge(game: Minigame, stored: string | null, now: number): GameRun | undefined {
  try {
    const value: unknown = JSON.parse(stored ?? 'null');
    if (game.kind !== 'challenge' || !object(value) || typeof value.id !== 'string' || !value.id || value.id.length > 100
      || typeof value.started !== 'number' || !Number.isFinite(value.started) || value.started > now || value.started < 0
      || !object(value.board) || !Array.isArray(value.board.targets) || !Array.isArray(value.board.methods)) return;
    const settings = normalizeGameSettings(game, value.settings), limit = gameSize(game, settings);
    const ids = gameVocabulary(game, settings.category).map(sign => sign.id);
    const { targets, methods } = value.board;
    if (targets.length !== limit || new Set(targets).size !== limit || !targets.every(id => typeof id === 'string' && ids.includes(id))
      || methods.length >= limit || !methods.every(method => method === 'camera' || method === 'alternative')) return;
    const count = methods.length;
    return { id: value.id, started: value.started, settings, limit, score: { ...emptyScore(), correct: count, streak: count, bestStreak: count },
      board: { kind: 'challenge', targets: targets as string[], methods: methods as PracticeMethod[] } };
  } catch { /* A damaged checkpoint can be replaced by a new game. */ }
}

export function validateGameOutcome(game: Minigame, value: unknown): GameOutcome | undefined {
  if (!object(value) || !object(value.settings)) return;
  const settings = normalizeGameSettings(game, value.settings);
  if (settings.difficulty !== value.settings.difficulty || settings.duration !== value.settings.duration || settings.category !== value.settings.category) return;
  const { limit, elapsedMs, correct, errors, bestStreak, camera, alternative } = value;
  if (typeof elapsedMs !== 'number' || !Number.isSafeInteger(elapsedMs) || elapsedMs < 0
    || typeof correct !== 'number' || !Number.isSafeInteger(correct) || correct < 0
    || typeof errors !== 'number' || !Number.isSafeInteger(errors) || errors < 0
    || typeof bestStreak !== 'number' || !Number.isSafeInteger(bestStreak) || bestStreak < (correct ? 1 : 0) || bestStreak > correct
    || typeof camera !== 'number' || !Number.isSafeInteger(camera) || camera < 0
    || typeof alternative !== 'number' || !Number.isSafeInteger(alternative) || alternative < 0) return;
  const minimum = game.kind === 'challenge' ? 1 : 2;
  if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < minimum || (settings.duration ? limit !== TIMED_ROUNDS
    : limit > (settings.difficulty === 'intermedio' ? 5 : 3))) return;
  const tally = correct + errors;
  switch (game.kind) {
    case 'memory': if (correct !== limit || camera || alternative) return; break;
    case 'challenge': if (correct !== limit || camera + alternative !== correct || errors) return; break;
    default:
      if (camera || alternative || tally > limit || (settings.duration ? elapsedMs > settings.duration * 1000
        || (tally !== limit && elapsedMs !== settings.duration * 1000) : tally !== limit)) return;
  }
  return { settings, limit, elapsedMs, correct, errors, bestStreak, camera, alternative };
}
