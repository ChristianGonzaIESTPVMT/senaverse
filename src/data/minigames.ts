import { libraryEntries, type LibraryCategory } from './library.ts';
import { getQuizVisual } from './educationalMedia.ts';
import { localIllustration, type IllustrationAsset } from './illustrations.ts';

export type MinigameKind = 'memory' | 'visual-quiz' | 'timed-quiz' | 'meaning-quiz' | 'challenge';
export type GameDifficulty = 'basico' | 'intermedio';
export const gameDurations = [0, 30, 60, 90] as const;
export type GameDuration = typeof gameDurations[number];
export type GameSettings = { difficulty: GameDifficulty; duration: GameDuration; category: LibraryCategory | 'todas' };

export type Minigame = {
  id: string; title: string; description: string; objective: string;
  tone: 'lavender' | 'mint' | 'peach'; kind: MinigameKind; rewardXp: number;
};

const rewardXp = 20;
export const minigames: (Minigame & { cover: IllustrationAsset })[] = [
  { id: 'memoria', title: 'Memoria de señas', description: 'Combina cada postura ilustrada con su significado.',
    cover: localIllustration('minijuegos/juego-01-memoria', 960, 640),
    objective: 'Relaciona las configuraciones de los números en LSP con la cantidad que representan.', tone: 'lavender', kind: 'memory', rewardXp },
  { id: 'adivina', title: 'Adivina la seña', description: 'Observa una postura y decide qué significa.',
    cover: localIllustration('minijuegos/juego-02-adivina', 960, 640),
    objective: 'Distingue configuraciones de los dedos y acumula rachas de aciertos.', tone: 'peach', kind: 'visual-quiz', rewardXp },
  { id: 'desafio', title: 'Reto contrarreloj', description: 'Responde preguntas rápidas con un reloj opcional.',
    cover: localIllustration('minijuegos/juego-03-contrarreloj', 960, 640),
    objective: 'Identifica números en LSP a tu ritmo o en rondas de 30, 60 o 90 segundos.', tone: 'mint', kind: 'timed-quiz', rewardXp },
  { id: 'senas', title: 'Desafío de señas', description: 'Practica una serie de señas con cámara opcional.',
    cover: localIllustration('minijuegos/juego-04-desafio-senas', 960, 640),
    objective: 'Ejecuta una seña a la vez o estudia su configuración con un ejercicio sin cámara.', tone: 'lavender', kind: 'challenge', rewardXp },
  { id: 'relaciona', title: 'Relaciona y aprende', description: 'Asocia significados con el vocabulario de Biblioteca.',
    cover: localIllustration('minijuegos/juego-05-relaciona', 960, 640),
    objective: 'Identifica en español la palabra que corresponde a la descripción para repasar su significado.', tone: 'peach', kind: 'meaning-quiz', rewardXp },
];

export function getMinigame(id: unknown) {
  return minigames.find(game => game.id === id);
}

export function getMinigamePath(id: string) {
  return `/minijuegos/${encodeURIComponent(id)}`;
}

export function gameVocabulary(game: Minigame, category: GameSettings['category'] = 'todas') {
  return libraryEntries.filter(sign => (category === 'todas' || sign.category === category) && (game.kind === 'challenge'
    ? !!(sign.recognitionClassId && sign.reference && sign.instructions && sign.hands)
    : game.kind === 'meaning-quiz' || !!getQuizVisual(sign.media)));
}

export function gameCategories(game: Minigame) {
  const minimum = game.kind === 'challenge' ? 1 : 2;
  return [...new Set(gameVocabulary(game).map(sign => sign.category))].filter(category => gameVocabulary(game, category).length >= minimum);
}

export function normalizeGameSettings(game: Minigame, value: unknown): GameSettings {
  const configuration = value && typeof value === 'object' ? value as Partial<GameSettings> : {};
  const categories = gameCategories(game);
  const category = categories.find(item => item === configuration.category) ?? (categories.length === 1 ? categories[0] : 'todas');
  const duration = game.kind === 'timed-quiz' ? gameDurations.find(item => item === configuration.duration) ?? 0 : 0;
  return { difficulty: configuration.difficulty === 'intermedio' ? 'intermedio' : 'basico', category, duration };
}

export function getMinigameReturnPath(value: unknown) {
  return value === 'senas' ? getMinigamePath(value) : undefined;
}
