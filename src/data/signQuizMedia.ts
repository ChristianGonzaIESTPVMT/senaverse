import type { QuizMedia } from './educationalMedia.ts';
import type { LibraryEntry } from './library.ts';

const descriptions: Record<string, string> = {
  'LSP-001': 'El índice está extendido y los demás dedos se recogen.',
  'LSP-002': 'El índice y el medio están extendidos y el pulgar queda recogido.',
  'LSP-003': 'El pulgar, el índice y el medio están extendidos.',
  'LSP-004': 'El índice, el medio, el anular y el meñique están extendidos. El pulgar queda recogido.',
  'LSP-005': 'La palma está abierta y el pulgar se extiende junto a los demás dedos.',
  'LSP-006': 'Una mano cerrada se mueve desde la muñeca.',
  'LSP-007': 'Una mano junta las puntas del pulgar y del índice y mantiene abiertos los demás dedos.',
  'LSP-008': 'Las dos manos tienen las puntas de los dedos reunidas y realizan el movimiento.',
  'LSP-009': 'Una mano extiende el índice y traza un giro.',
  'LSP-010': 'Las dos manos están cerradas con los pulgares extendidos y se desplazan una hacia la otra.',
};

export function signQuizMedia(sign: LibraryEntry, kind: QuizMedia['kind']): QuizMedia | undefined {
  const { visual, video, quizVisual } = sign.media;
  const resource = kind === 'video' ? video : kind === 'photo' ? visual : quizVisual;
  const description = resource?.availability === 'available' ? resource.quizDescription ?? descriptions[sign.id] : undefined;
  if (!description) return;
  if (kind === 'photo' && !(visual.kind === 'image' && visual.availability === 'available')) return;
  if (kind === 'video' && video.availability !== 'available') return;
  if (kind === 'diagram' && !quizVisual) return;
  return { signId: sign.id, kind, description };
}
