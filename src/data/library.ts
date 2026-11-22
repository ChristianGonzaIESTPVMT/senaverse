import { mineduGuidePdf, recognitionSigns } from '../features/sign-recognition/recognitionCatalog.ts';

export const libraryCategories = [
  { id: 'saludo', label: 'Saludo' },
  { id: 'familia', label: 'Familia' },
  { id: 'emociones', label: 'Emociones' },
  { id: 'numeros', label: 'Números' },
  { id: 'respuestas', label: 'Respuestas' },
  { id: 'alimentos', label: 'Alimentos' },
  { id: 'cotidiano', label: 'Vida cotidiana' },
] as const;

export type LibraryCategory = typeof libraryCategories[number]['id'];

export type LibraryEntry = {
  id: string;
  word: string;
  description: string;
  meaning: string;
  category: LibraryCategory;
  tone: 'lavender' | 'peach' | 'mint' | 'blue';
  keywords?: string[];
  thumbnailSrc?: string;
  videoSrc?: string;
  captionsSrc?: string;
  instructions?: string;
  type?: 'static' | 'dynamic';
  hands?: 1 | 2;
  source?: { title: string; publisher: string; url: string; page?: number };
  reference?: { title: string; url: string };
  validation: 'pending' | 'validated';
  recognitionClassId?: string;
  lesson?: { unitId: number; lessonId: string; title: string };
};

// Original entries keep their order for existing browsing and bookmarks.
const originalEntries: Omit<LibraryEntry, 'validation'>[] = [
  { id: 'hola', word: 'Hola', description: 'Saludo básico', meaning: 'Una expresión para saludar al iniciar un encuentro.', category: 'saludo', tone: 'lavender', keywords: ['saludar', 'bienvenida'] },
  { id: 'gracias', word: 'Gracias', description: 'Expresión de gratitud', meaning: 'Una palabra para expresar agradecimiento por una acción o un gesto.', category: 'saludo', tone: 'peach', keywords: ['agradecer', 'agradecimiento'] },
  { id: 'adios', word: 'Adiós', description: 'Despedida', meaning: 'Una expresión para despedirse al terminar un encuentro.', category: 'saludo', tone: 'blue', keywords: ['despedirse', 'hasta luego'] },
  { id: 'familia', word: 'Familia', description: 'Grupo familiar', meaning: 'Un grupo de personas unidas por vínculos familiares.', category: 'familia', tone: 'mint' },
  { id: 'si', word: 'Sí', description: 'Respuesta afirmativa', meaning: 'Una respuesta para expresar afirmación o acuerdo.', category: 'respuestas', tone: 'lavender', keywords: ['afirmar', 'aceptar'] },
  { id: 'no', word: 'No', description: 'Respuesta negativa', meaning: 'Una respuesta para expresar negación o desacuerdo.', category: 'respuestas', tone: 'peach', keywords: ['negar'] },
  { id: 'mama', word: 'Mamá', description: 'Vínculo familiar', meaning: 'Una forma cercana de referirse a la madre.', category: 'familia', tone: 'peach', keywords: ['madre'] },
  { id: 'papa', word: 'Papá', description: 'Vínculo familiar', meaning: 'Una forma cercana de referirse al padre.', category: 'familia', tone: 'blue', keywords: ['padre'] },
  { id: 'hermano', word: 'Hermano', description: 'Parte de la familia', meaning: 'Una persona que comparte contigo uno o ambos progenitores.', category: 'familia', tone: 'mint', keywords: ['hermana', 'hermanos'] },
  { id: 'feliz', word: 'Feliz', description: 'Alegría y bienestar', meaning: 'Un estado de ánimo de alegría o satisfacción.', category: 'emociones', tone: 'peach', keywords: ['alegre', 'alegria', 'felicidad'] },
  { id: 'triste', word: 'Triste', description: 'Expresión de tristeza', meaning: 'Un estado de ánimo relacionado con la pena o el desánimo.', category: 'emociones', tone: 'blue', keywords: ['tristeza', 'pena'] },
  { id: 'sorpresa', word: 'Sorpresa', description: 'Una emoción inesperada', meaning: 'La emoción que puede surgir ante algo inesperado.', category: 'emociones', tone: 'lavender', keywords: ['sorprendido', 'sorprendida', 'asombro'] },
  { id: 'uno', word: 'Uno', description: 'Número 1', meaning: 'El número que representa una unidad.', category: 'numeros', tone: 'lavender', keywords: ['1'] },
  { id: 'dos', word: 'Dos', description: 'Número 2', meaning: 'El número que representa dos unidades.', category: 'numeros', tone: 'blue', keywords: ['2'] },
  { id: 'tres', word: 'Tres', description: 'Número 3', meaning: 'El número que representa tres unidades.', category: 'numeros', tone: 'mint', keywords: ['3'] },
  { id: 'agua', word: 'Agua', description: 'Una bebida esencial', meaning: 'Una palabra de uso cotidiano para referirse al agua.', category: 'alimentos', tone: 'blue', keywords: ['beber', 'bebida'] },
  { id: 'comida', word: 'Comida', description: 'Alimentos del día a día', meaning: 'Una palabra para referirse a los alimentos o a una ocasión de comer.', category: 'alimentos', tone: 'peach', keywords: ['comer', 'alimento', 'almuerzo'] },
  { id: 'ayuda', word: 'Ayuda', description: 'Apoyo cuando lo necesitas', meaning: 'Una palabra para solicitar u ofrecer apoyo a otra persona.', category: 'cotidiano', tone: 'mint', keywords: ['apoyo', 'ayudar'] },
];

export const numbersReference = {
  title: 'Ver la lámina del MINEDU · figura 2, página impresa 72',
  url: 'https://formacionenservicio.minedu.gob.pe/sifods/centro-recurso/2022/Lineas-de-formacion-priorizadas/Mejora-de-Aprendizajes/Atencion-a-la-diversidad/Cartilla/orientaciones-discapacidad-auditiva.pdf#page=14',
};
const numbersSource = { title: 'Orientaciones para la atención de estudiantes con discapacidad auditiva',
  publisher: 'Ministerio de Educación del Perú', url: numbersReference.url, page: 72 };
const numbersGuide = new Map<string, { number: string; tone: LibraryEntry['tone']; instructions: string }>([
  ['LSP-001', { number: '1', tone: 'lavender', instructions: 'Queda extendido el índice. Los demás dedos se mantienen flexionados.' }],
  ['LSP-002', { number: '2', tone: 'blue', instructions: 'Quedan extendidos el índice y el medio, uno al lado del otro.' }],
  ['LSP-003', { number: '3', tone: 'mint', instructions: 'Se extienden el pulgar, el índice y el medio.' }],
  ['LSP-004', { number: '4', tone: 'peach', instructions: 'Se extienden índice, medio, anular y meñique, con el pulgar recogido.' }],
  ['LSP-005', { number: '5', tone: 'lavender', instructions: 'Se abre la mano y quedan extendidos los cinco dedos.' }],
]);
const numbersLink = { unitId: 2, lessonId: 'numeros', title: 'Números básicos' };
const greetingsLink = { unitId: 1, lessonId: 'saludos', title: 'Saludos básicos' };
const linkedLessons = new Map([
  ['hola', greetingsLink], ['adios', greetingsLink], ['gracias', { unitId: 1, lessonId: 'cortesia', title: 'Expresiones de cortesía' }],
]);
const recognitionDescriptions = new Map([
  ['LSP-006', { description: 'Respuesta afirmativa', meaning: 'Una expresión de afirmación o acuerdo.' }],
  ['LSP-007', { description: 'Ausencia de algo', meaning: 'Expresa que no hay algo.' }],
  ['LSP-008', { description: 'Cantidad abundante', meaning: 'Expresa una cantidad grande.' }],
  ['LSP-009', { description: 'Sin compañía', meaning: 'Describe a alguien que está sin compañía.' }],
  ['LSP-010', { description: 'Compañía o relación', meaning: 'Vincula aquello que acompaña a alguien o algo.' }],
]);
const legacyIds = new Map([['uno', 'LSP-001'], ['dos', 'LSP-002'], ['tres', 'LSP-003'], ['si', 'LSP-006']]);
const formerClassIds = new Set(legacyIds.values());

const recognizedEntries = recognitionSigns
  .filter(sign => numbersGuide.has(sign.id) || recognitionDescriptions.has(sign.id))
  .map<LibraryEntry>(sign => {
    const shared = { id: sign.id, word: sign.name, type: sign.type, hands: sign.expectedHands || undefined,
      validation: 'pending' as const, recognitionClassId: sign.id };
    const numberSign = numbersGuide.get(sign.id);
    if (numberSign) {
      return { ...shared, tone: numberSign.tone, instructions: numberSign.instructions, category: 'numeros',
        description: `Número ${numberSign.number}`, meaning: `Representa la cantidad ${numberSign.number}.`,
        reference: numbersReference, source: numbersSource, lesson: numbersLink, keywords: [numberSign.number] };
    }
    const original = sign.sourceReference;
    const description = recognitionDescriptions.get(sign.id);
    const instructions = sign.instructions.split(/(?<=\.) (?:Registra|Mantén las dos manos visibles y registra)\b/u)[0]
      .replace(' y conserva la secuencia completa.', '.');
    return { ...shared, category: sign.id === 'LSP-006' ? 'respuestas' : 'cotidiano',
      tone: 'lavender', description: description?.description ?? sign.name,
      meaning: description?.meaning ?? sign.name, instructions,
      ...(original && { reference: { title: `Ver la guía ilustrada del MINEDU · página ${original.page}`, url: `${mineduGuidePdf}#page=${original.page}` },
        source: { title: original.title, publisher: original.publisher, url: original.repositoryUrl, page: original.page } }),
    };
  });

const zero: LibraryEntry = {
  id: 'cero', word: 'Cero', category: 'numeros', description: 'Número 0', meaning: 'Representa una cantidad nula.',
  instructions: 'En la lámina, la mano queda cerrada en un puño. Observa la posición del pulgar en el dibujo de Cero.',
  type: 'static', hands: 1, validation: 'pending', reference: numbersReference, source: numbersSource,
  tone: 'blue', keywords: ['0'],
};

/** The educational catalogue includes entries with no corresponding model class. */
export const libraryEntries: LibraryEntry[] = [
  ...originalEntries.map<LibraryEntry>(entry => recognizedEntries.find(sign => sign.id === legacyIds.get(entry.id))
    ?? { ...entry, validation: 'pending', lesson: linkedLessons.get(entry.id) }),
  ...recognizedEntries.filter(entry => !formerClassIds.has(entry.id)),
  zero,
];

const byId = new Map(libraryEntries.map(entry => [entry.id, entry]));
const byClass = new Map(recognizedEntries.map(entry => [entry.recognitionClassId, entry]));

export function getEducationalSign(id: string) {
  return byId.get(legacyIds.get(id) ?? id);
}

export function getEducationalSignForClass(classId: string) {
  return byClass.get(classId);
}

export function getLibrarySignPath(id: string) {
  return `/biblioteca?sena=${encodeURIComponent(id)}`;
}

export function normalizeLibrarySignIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.flatMap(id => {
    const sign = typeof id === 'string' && getEducationalSign(id);
    return sign ? [sign.id] : [];
  }))] : [];
}

function searchWords(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

export function searchLibrary({ query, category, compatible, favorites }: {
  query: string; category: LibraryCategory | 'all'; compatible: boolean; favorites?: readonly string[];
}) {
  const terms = searchWords(query);
  return libraryEntries.filter(entry => {
    const words = searchWords([entry.word, entry.description, ...(entry.keywords ?? [])].join(' '));
    return (category === 'all' || entry.category === category) && (!compatible || !!entry.recognitionClassId)
      && (!favorites || favorites.includes(entry.id)) && terms.every(term => words.some(word => word.startsWith(term)));
  });
}
