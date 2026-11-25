import { libraryEntries, type LibraryCategory } from './library.ts';
import { localIllustration, type IllustrationAsset } from './illustrations.ts';

export type MinigameKind = 'memory' | 'visual-quiz' | 'timed-quiz' | 'meaning-quiz' | 'challenge';
export type GameDifficulty = 'basico' | 'intermedio' | 'avanzado';
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
  { id: 'desafio', title: 'Reto contrarreloj', description: 'Ejecuta o interpreta señas en una sucesión de objetivos.',
    cover: localIllustration('minijuegos/juego-03-contrarreloj', 960, 640),
    objective: 'Encadena aciertos con números del Uno al Cinco, con reloj o a tu ritmo.', tone: 'mint', kind: 'timed-quiz', rewardXp },
  { id: 'senas', title: 'Desafío de señas', description: 'Memoriza una secuencia y reprodúcela en orden.',
    cover: localIllustration('minijuegos/juego-04-desafio-senas', 960, 640),
    objective: 'Recuerda el orden y reconstruye la secuencia con tarjetas o con gestos.', tone: 'lavender', kind: 'challenge', rewardXp },
  { id: 'relaciona', title: 'Relaciona y aprende', description: 'Conecta señas con sus cantidades en un tablero.',
    cover: localIllustration('minijuegos/juego-05-relaciona', 960, 640),
    objective: 'Comprueba qué cantidad representa cada configuración de la mano.', tone: 'peach', kind: 'meaning-quiz', rewardXp },
];

export function getMinigame(id: unknown) {
  return minigames.find(game => game.id === id);
}

export function getMinigamePath(id: string) {
  return `/minijuegos/${encodeURIComponent(id)}`;
}

export function gameVocabulary(game: Minigame, category: GameSettings['category'] = 'todas') {
  // Keep the vocabulary for saved games from before the current boards.
  return libraryEntries.filter(sign => (category === 'todas' || sign.category === category) && (game.kind === 'challenge'
    ? !!(sign.recognitionClassId && sign.reference && sign.instructions && sign.hands)
    : game.kind === 'meaning-quiz' || !!sign.media.quizVisual));
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
