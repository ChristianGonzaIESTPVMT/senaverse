import { createInitialSignCatalog } from './dataset/signCatalog.ts';

export const recognitionSigns = createInitialSignCatalog();
export const recognitionSignsById = new Map(recognitionSigns.map(sign => [sign.id, sign]));
export const mineduGuidePdf = 'https://repositorio.minedu.gob.pe/bitstream/20.500.12799/5545/1/Lengua%20de%20se%c3%b1as%20peruana%20gu%c3%ada%20para%20el%20aprendizaje%20de%20la%20lengua%20de%20se%c3%b1as%20peruana%2c%20vocabulario%20b%c3%a1sico.pdf';

export function resolvePracticeSign(value: string) {
  const normalized = value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return recognitionSignsById.get(value)
    ?? recognitionSigns.find(sign => sign.name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() === normalized);
}
