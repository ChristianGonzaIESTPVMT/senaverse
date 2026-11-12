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
export type LibraryVisual = 'wave' | 'heart' | 'family' | 'yes' | 'no' | 'person' | 'happy' | 'sad' | 'surprise' | 'number' | 'water' | 'food' | 'help';

export type LibraryEntry = {
  id: string;
  word: string;
  description: string;
  meaning: string;
  category: LibraryCategory;
  visual: LibraryVisual;
  tone: 'lavender' | 'peach' | 'mint' | 'blue';
  keywords?: string[];
  number?: string;
  thumbnailSrc?: string;
  videoSrc?: string;
  captionsSrc?: string;
};

/**
 * Catálogo de muestra. Las ilustraciones son decorativas, no demostraciones de LSP.
 * Agrega thumbnailSrc, videoSrc y, opcionalmente, captionsSrc a cada entrada:
 * thumbnailSrc: '/images/biblioteca/hola.webp',
 * videoSrc: '/videos/biblioteca/hola.mp4',
 * captionsSrc: '/videos/biblioteca/hola.es.vtt',
 * Los videos deben ser materiales de LSP revisados antes de incorporarse.
 */
export const libraryEntries: LibraryEntry[] = [
  { id: 'hola', word: 'Hola', description: 'Saludo básico', meaning: 'Una expresión para saludar al iniciar un encuentro.', category: 'saludo', visual: 'wave', tone: 'lavender', keywords: ['saludar', 'bienvenida'] },
  { id: 'gracias', word: 'Gracias', description: 'Expresión de gratitud', meaning: 'Una palabra para expresar agradecimiento por una acción o un gesto.', category: 'saludo', visual: 'heart', tone: 'peach', keywords: ['agradecer', 'agradecimiento'] },
  { id: 'adios', word: 'Adiós', description: 'Despedida', meaning: 'Una expresión para despedirse al terminar un encuentro.', category: 'saludo', visual: 'wave', tone: 'blue', keywords: ['despedirse', 'hasta luego'] },
  { id: 'familia', word: 'Familia', description: 'Grupo familiar', meaning: 'Un grupo de personas unidas por vínculos familiares.', category: 'familia', visual: 'family', tone: 'mint' },
  { id: 'si', word: 'Sí', description: 'Respuesta afirmativa', meaning: 'Una respuesta para expresar afirmación o acuerdo.', category: 'respuestas', visual: 'yes', tone: 'lavender', keywords: ['afirmar', 'aceptar'] },
  { id: 'no', word: 'No', description: 'Respuesta negativa', meaning: 'Una respuesta para expresar negación o desacuerdo.', category: 'respuestas', visual: 'no', tone: 'peach', keywords: ['negar'] },
  { id: 'mama', word: 'Mamá', description: 'Vínculo familiar', meaning: 'Una forma cercana de referirse a la madre.', category: 'familia', visual: 'person', tone: 'peach', keywords: ['madre'] },
  { id: 'papa', word: 'Papá', description: 'Vínculo familiar', meaning: 'Una forma cercana de referirse al padre.', category: 'familia', visual: 'person', tone: 'blue', keywords: ['padre'] },
  { id: 'hermano', word: 'Hermano', description: 'Parte de la familia', meaning: 'Una persona que comparte contigo uno o ambos progenitores.', category: 'familia', visual: 'family', tone: 'mint', keywords: ['hermana', 'hermanos'] },
  { id: 'feliz', word: 'Feliz', description: 'Alegría y bienestar', meaning: 'Un estado de ánimo de alegría o satisfacción.', category: 'emociones', visual: 'happy', tone: 'peach', keywords: ['alegre', 'alegria', 'felicidad'] },
  { id: 'triste', word: 'Triste', description: 'Expresión de tristeza', meaning: 'Un estado de ánimo relacionado con la pena o el desánimo.', category: 'emociones', visual: 'sad', tone: 'blue', keywords: ['tristeza', 'pena'] },
  { id: 'sorpresa', word: 'Sorpresa', description: 'Una emoción inesperada', meaning: 'La emoción que puede surgir ante algo inesperado.', category: 'emociones', visual: 'surprise', tone: 'lavender', keywords: ['sorprendido', 'sorprendida', 'asombro'] },
  { id: 'uno', word: 'Uno', description: 'Número 1', meaning: 'El número que representa una unidad.', category: 'numeros', visual: 'number', number: '1', tone: 'lavender', keywords: ['1'] },
  { id: 'dos', word: 'Dos', description: 'Número 2', meaning: 'El número que representa dos unidades.', category: 'numeros', visual: 'number', number: '2', tone: 'blue', keywords: ['2'] },
  { id: 'tres', word: 'Tres', description: 'Número 3', meaning: 'El número que representa tres unidades.', category: 'numeros', visual: 'number', number: '3', tone: 'mint', keywords: ['3'] },
  { id: 'agua', word: 'Agua', description: 'Una bebida esencial', meaning: 'Una palabra de uso cotidiano para referirse al agua.', category: 'alimentos', visual: 'water', tone: 'blue', keywords: ['beber', 'bebida'] },
  { id: 'comida', word: 'Comida', description: 'Alimentos del día a día', meaning: 'Una palabra para referirse a los alimentos o a una ocasión de comer.', category: 'alimentos', visual: 'food', tone: 'peach', keywords: ['comer', 'alimento', 'almuerzo'] },
  { id: 'ayuda', word: 'Ayuda', description: 'Apoyo cuando lo necesitas', meaning: 'Una palabra para solicitar u ofrecer apoyo a otra persona.', category: 'cotidiano', visual: 'help', tone: 'mint', keywords: ['apoyo', 'ayudar'] },
];
