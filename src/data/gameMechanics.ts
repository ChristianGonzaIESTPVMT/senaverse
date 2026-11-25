import { getEducationalSign, libraryEntries } from './library.ts';
import { gameDurations, type GameSettings, type Minigame } from './minigames.ts';

export const numberIds = ['LSP-001', 'LSP-002', 'LSP-003', 'LSP-004', 'LSP-005'] as const;
const allNumbers = ['cero', ...numberIds, 'seis', 'siete', 'ocho', 'nueve', 'diez'];
export const numberQuantity = (id: string) => allNumbers.indexOf(id);
const visualSigns = libraryEntries.filter(sign => sign.media.visual.kind === 'image').map(sign => sign.id);
export type GameMode = 'visual' | 'camera';
export type PlaySettings = GameSettings & { mode: GameMode; vocabulary?: 'ampliado' };
export const pointsPerMatch = 10;
export const countdownMs = 3000;

export function shuffle<T>(items: readonly T[], random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function playSettings(game: Minigame, value: Partial<PlaySettings> = {}): PlaySettings {
  const mode = (game.id === 'senas' || game.id === 'desafio') && value.mode === 'camera' ? 'camera' : 'visual';
  return {
    category: 'numeros',
    difficulty: value.difficulty === 'intermedio' || value.difficulty === 'avanzado' ? value.difficulty : 'basico',
    duration: game.id === 'desafio' ? gameDurations.find(duration => duration === value.duration) ?? 0 : 0,
    mode,
    ...(mode === 'visual' && value.vocabulary === 'ampliado' && { vocabulary: 'ampliado' }),
  };
}

export function playLimit(game: Minigame, settings: PlaySettings) {
  const level = settings.difficulty === 'avanzado' ? 2 : settings.difficulty === 'intermedio' ? 1 : 0;
  if (game.id === 'desafio') return settings.duration || [5, 8, 12][level];
  return 3 + level;
}

type MatchBoard = { kind: 'association'; sources: string[]; destinations: string[]; pairs: Record<string, string>; checked: boolean; locked: string[] };
type MemoryBoard = { kind: 'memory'; cards: { id: string; visual: boolean }[]; open: number[]; matched: number[] };
type QuizBoard = { kind: 'guess' | 'sprint'; targets: string[]; options: string[][]; step: number; answer?: string };
type SequenceBoard = { kind: 'sequence'; targets: string[]; choices: string[]; ordered: string[]; step: number; phase: 'study' | 'recall' | 'hint' };
export type GameBoard = MatchBoard | MemoryBoard | QuizBoard | SequenceBoard;
export type Play = {
  id: string; settings: PlaySettings; limit: number; board: GameBoard; ended: boolean;
  correct: number; errors: number; streak: number; bestStreak: number; assisted: boolean;
  started: number; elapsedMs: number; activeSince: number | null; lastAt: number;
};

type Action = { at: number } & (
  | { type: 'tick' | 'pause' | 'resume' | 'check' | 'hide' | 'recall' | 'hint' | 'undo' }
  | { type: 'link'; source: string; destination: string }
  | { type: 'flip'; index: number }
  | { type: 'answer' | 'gesture'; id: string; step: number }
  | { type: 'next'; step: number }
  | { type: 'pick'; id: string }
);

function targetsFor(limit: number, random: () => number, pool: readonly string[] = numberIds) {
  const targets: string[] = [];
  while (targets.length < limit) {
    const cycle = shuffle(pool, random);
    if (cycle[0] === targets.at(-1)) [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
    targets.push(...cycle.slice(0, limit - targets.length));
  }
  return targets;
}

function alternatives(id: string, count: number, random: () => number, pool: readonly string[]) {
  const target = getEducationalSign(id);
  const distance = (candidate: string) => getEducationalSign(candidate)?.category !== target?.category ? 20
    : target?.category === 'numeros' ? Math.abs(numberQuantity(candidate) - numberQuantity(id)) : 0;
  const similar = shuffle(pool.filter(candidate => candidate !== id), random).sort((a, b) => distance(a) - distance(b));
  return shuffle([id, ...similar.slice(0, count - 1)], random);
}

function visualVocabulary(game: Minigame, settings: PlaySettings) {
  return settings.mode === 'visual' && settings.vocabulary === 'ampliado'
    ? game.id === 'adivina' ? visualSigns : allNumbers : numberIds;
}

export function startPlay(game: Minigame, settings: PlaySettings, id: string, at: number, random = Math.random): Play {
  const limit = playLimit(game, settings);
  const vocabularySize = settings.difficulty === 'basico' ? 3 : settings.difficulty === 'intermedio' ? 4 : 5;
  const pool = game.id === 'desafio' && settings.mode === 'camera' ? numberIds.slice(0, vocabularySize) : visualVocabulary(game, settings);
  const targets = targetsFor(limit, random, pool);
  let board: GameBoard;
  if (game.id === 'relaciona') {
    const destinations = shuffle(targets, random);
    if (destinations.every((target, index) => target === targets[index])) destinations.push(destinations.shift()!);
    board = { kind: 'association', sources: targets, destinations, locked: [], pairs: {}, checked: false };
  } else if (game.id === 'memoria') {
    board = { kind: 'memory', cards: shuffle(targets.flatMap(id => [{ id, visual: true }, { id, visual: false }]), random), open: [], matched: [] };
  } else if (game.id === 'senas') {
    const candidates = settings.vocabulary === 'ampliado'
      ? [...targets, ...shuffle(pool.filter(item => !targets.includes(item)), random).slice(0, 5 - targets.length)] : pool;
    board = { kind: 'sequence', targets, choices: shuffle(candidates, random), ordered: [], step: 0, phase: 'study' };
  } else {
    const kind = game.id === 'desafio' ? 'sprint' : 'guess';
    const count = settings.difficulty === 'basico' ? 2 : settings.difficulty === 'intermedio' ? 3 : 4;
    board = { kind, targets, options: targets.map(target => alternatives(target, count, random, settings.mode === 'camera' ? numberIds : pool)), step: 0 };
  }
  const activeSince = board.kind === 'sequence' || (board.kind === 'sprint' && settings.mode === 'camera') ? null
    : board.kind === 'sprint' ? at + countdownMs : at;
  return { id, settings, limit, board, correct: 0, errors: 0, streak: 0, bestStreak: 0, assisted: false,
    started: at, lastAt: at, activeSince, elapsedMs: 0, ended: false };
}

export function playElapsed(run: Play, at: number) {
  return run.elapsedMs + (run.activeSince === null ? 0 : Math.max(0, at - run.activeSince));
}

function finish(run: Play, at: number): Play {
  const elapsedMs = playElapsed(run, at);
  return { ...run, ended: true, activeSince: null, lastAt: at,
    elapsedMs: run.settings.duration ? Math.min(elapsedMs, run.settings.duration * 1000) : elapsedMs };
}

function score(run: Play, correct: boolean): Play {
  const streak = correct ? run.streak + 1 : 0;
  return { ...run, streak, bestStreak: Math.max(run.bestStreak, streak),
    correct: run.correct + Number(correct), errors: run.errors + Number(!correct) };
}

export function playMove(run: Play, action: Action): Play {
  const { at } = action;
  if (run.ended || !Number.isSafeInteger(at) || at < run.lastAt) return run;
  if (run.settings.duration && playElapsed(run, at) >= run.settings.duration * 1000) return finish(run, at);
  const board = run.board;
  const changed = (next: GameBoard, updated = run) => ({ ...updated, board: next, lastAt: at });
  switch (action.type) {
    case 'tick': return run;
    case 'resume':
      if (run.activeSince !== null || (board.kind !== 'sprint' && (board.kind !== 'sequence' || board.phase !== 'recall'))) return run;
      return { ...run, activeSince: at + (board.kind === 'sprint' && run.elapsedMs === 0 ? countdownMs : 0), lastAt: at };
    case 'pause':
      if (run.activeSince === null) return run;
      return { ...run, activeSince: null, elapsedMs: playElapsed(run, at), lastAt: at };
    case 'link': {
      if (board.kind !== 'association' || !board.sources.includes(action.source) || !board.destinations.includes(action.destination)
        || board.locked.includes(action.source) || board.locked.includes(action.destination)) return run;
      const pairs = Object.fromEntries(Object.entries(board.pairs).filter(([, id]) => id !== action.destination));
      pairs[action.source] = action.destination;
      return changed({ ...board, pairs, checked: false });
    }
    case 'check': {
      if (board.kind === 'association') {
        if (board.checked || Object.keys(board.pairs).length !== run.limit) return run;
        const newlyCorrect = board.sources.filter(id => !board.locked.includes(id) && board.pairs[id] === id);
        const locked = [...board.locked, ...newlyCorrect];
        let updated = run;
        for (const id of board.sources.filter(id => !board.locked.includes(id))) updated = score(updated, board.pairs[id] === id);
        const next = changed({ ...board, locked, checked: true }, updated);
        return locked.length === run.limit ? finish(next, at) : next;
      }
      if (board.kind !== 'sequence' || board.phase !== 'recall' || run.settings.mode !== 'visual' || board.ordered.length !== run.limit) return run;
      const wrong = board.targets.findIndex((id, index) => board.ordered[index] !== id);
      if (wrong !== -1) return changed({ ...board, ordered: board.ordered.slice(0, wrong), step: wrong }, score(run, false));
      return finish(changed(board, { ...run, correct: run.limit, streak: run.limit, bestStreak: run.limit }), at);
    }
    case 'flip': {
      if (board.kind !== 'memory' || !board.cards[action.index] || board.open.length === 2
        || board.open.includes(action.index) || board.matched.includes(action.index)) return run;
      const open = [...board.open, action.index];
      if (open.length === 1) return changed({ ...board, open });
      const correct = board.cards[open[0]].id === board.cards[open[1]].id;
      const matched = correct ? [...board.matched, ...open] : board.matched;
      const next = changed({ ...board, open: correct ? [] : open, matched }, score(run, correct));
      return matched.length === board.cards.length ? finish(next, at) : next;
    }
    case 'hide':
      return board.kind === 'memory' && board.open.length === 2 ? changed({ ...board, open: [] }) : run;
    case 'recall':
      if (board.kind !== 'sequence' || board.phase === 'recall') return run;
      return changed({ ...board, phase: 'recall' }, { ...run, activeSince: run.settings.mode === 'visual' ? at : null });
    case 'hint':
      if (board.kind !== 'sequence' || board.phase !== 'recall') return run;
      return changed({ ...board, phase: 'hint' }, { ...run, assisted: true, activeSince: null, elapsedMs: playElapsed(run, at) });
    case 'pick':
      if (board.kind !== 'sequence' || board.phase !== 'recall' || run.settings.mode !== 'visual'
        || board.ordered.length >= run.limit || !board.choices.includes(action.id) || board.ordered.includes(action.id)) return run;
      return changed({ ...board, ordered: [...board.ordered, action.id] });
    case 'undo':
      return board.kind === 'sequence' && board.ordered.length > board.step ? changed({ ...board, ordered: board.ordered.slice(0, -1) }) : run;
    case 'gesture': {
      if (run.settings.mode !== 'camera' || run.activeSince === null || at < run.activeSince
        || (board.kind !== 'sprint' && (board.kind !== 'sequence' || board.phase !== 'recall')) || action.step !== board.step) return run;
      if (action.id !== board.targets[board.step]) return score({ ...run, lastAt: at }, false);
      const next = changed({ ...board, step: board.step + 1 }, score(run, true));
      return next.correct === run.limit ? finish(next, at) : next;
    }
    case 'answer': {
      if (run.settings.mode !== 'visual' || (board.kind !== 'guess' && board.kind !== 'sprint')
        || run.activeSince === null || at < run.activeSince || action.step !== board.step || board.answer !== undefined
        || !board.options[board.step].includes(action.id)) return run;
      return changed({ ...board, answer: action.id }, score(run, action.id === board.targets[board.step]));
    }
    case 'next': {
      if ((board.kind !== 'guess' && board.kind !== 'sprint') || action.step !== board.step || board.answer === undefined) return run;
      return board.step + 1 === board.targets.length ? finish(run, at) : changed({ ...board, step: board.step + 1, answer: undefined });
    }
  }
}

export function playResult(run: Play) {
  if (!run.ended) return;
  const seen = run.board.kind === 'sequence' ? run.board.targets.slice(0, run.correct) : undefined;
  return {
    rules: 2 as const, settings: run.settings, limit: run.limit, elapsedMs: run.elapsedMs, correct: run.correct,
    errors: run.errors, bestStreak: run.bestStreak, camera: run.settings.mode === 'camera' ? run.correct : 0,
    alternative: run.board.kind === 'sequence' && run.settings.mode === 'visual' ? run.correct : 0,
    assisted: run.assisted, ...(run.board.kind === 'memory' && { moves: run.correct + run.errors }),
    ...(seen && { practicedSignIds: seen }),
  };
}

export type PlayResult = NonNullable<ReturnType<typeof playResult>>;

export function validatePlayResult(game: Minigame, value: Record<string, unknown>): PlayResult | undefined {
  if (value.rules !== 2 || !value.settings || typeof value.settings !== 'object') return;
  const raw = value.settings as Partial<PlaySettings>;
  const settings = playSettings(game, raw);
  if (raw.vocabulary !== settings.vocabulary || Object.entries(settings).some(([key, item]) => raw[key as keyof PlaySettings] !== item)) return;
  const { limit, elapsedMs, correct, errors, bestStreak, camera, alternative, assisted, moves, practicedSignIds } = value;
  const count = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  if (!count(limit) || !count(elapsedMs) || !count(correct) || !count(errors) || !count(bestStreak) || !count(camera) || !count(alternative)
    || limit !== playLimit(game, settings) || correct > limit || bestStreak > correct || (correct > 0 && bestStreak === 0)
    || camera !== (settings.mode === 'camera' ? correct : 0)
    || alternative !== (game.id === 'senas' && settings.mode === 'visual' ? correct : 0)
    || typeof assisted !== 'boolean' || (assisted && game.id !== 'senas')) return;
  if (settings.duration && elapsedMs > settings.duration * 1000) return;
  if (game.id === 'desafio' && settings.mode === 'visual' && correct + errors > limit) return;
  if (game.id === 'desafio' && (settings.mode === 'camera' ? correct : correct + errors) !== limit
    && (!settings.duration || elapsedMs !== settings.duration * 1000)) return;
  if (game.id === 'adivina' && correct + errors !== limit) return;
  if (['memoria', 'relaciona', 'senas'].includes(game.id) && correct !== limit) return;
  if (game.id === 'memoria' ? moves !== correct + errors : moves !== undefined) return;
  if (game.id === 'senas' && (!Array.isArray(practicedSignIds) || practicedSignIds.length !== correct
    || new Set(practicedSignIds).size !== correct || !practicedSignIds.every(id => visualVocabulary(game, settings).some(number => number === id)))) return;
  return { rules: 2, settings, limit, elapsedMs, correct, errors, bestStreak, camera, alternative, assisted,
    ...(typeof moves === 'number' && { moves }), ...(Array.isArray(practicedSignIds) && game.id === 'senas' && { practicedSignIds }) };
}
