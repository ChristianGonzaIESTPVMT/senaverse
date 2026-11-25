import type { MediaSource, PublishableMedia, Usage } from './educationalMedia.ts';

// These numbers identify media files. Educational IDs and camera classes are defined independently.
const importedAssets: Record<string, readonly [number, string, string]> = {
  cero: [11, 'Los dedos forman un contorno redondo en una mano levantada.', 'La mano sube, mantiene la forma redonda y regresa al reposo.'],
  seis: [12, 'La palma mira al frente. El meñique queda recogido.', 'La mano sube con el meñique recogido y sostiene la posición.'],
  siete: [13, 'La palma mira al frente. El anular queda recogido.', 'La mano sube con el anular recogido y sostiene la posición.'],
  ocho: [14, 'La palma mira al frente. El dedo medio queda recogido.', 'La mano sube con el dedo medio recogido y sostiene la posición.'],
  nueve: [15, 'La palma mira al frente. El índice queda recogido.', 'La mano sube con el índice recogido y sostiene la posición.'],
  diez: [16, 'La mano está cerrada con el pulgar extendido.', 'La muñeca gira con el pulgar extendido y la mano baja.'],
  hola: [17, 'Una mano abierta queda inclinada junto a la frente.', 'Una mano abierta sube hasta la frente y luego se aleja.'],
  gracias: [18, 'Las manos abiertas se cruzan delante del pecho.', 'Una mano pasa por el mentón y las manos abiertas se cruzan delante del pecho.'],
  adios: [19, 'Una mano se levanta junto a la cabeza con los dedos curvados.', 'Una mano se levanta junto a la cabeza y los dedos se abren y se flexionan.'],
  no: [20, 'Dos dedos extendidos se acercan al pulgar en una mano levantada.', 'Dos dedos de la mano levantada se acercan al pulgar.'],
  agua: [21, 'De perfil, una mano se acerca a la boca con el pulgar extendido.', 'De perfil, la mano sube hacia la boca con el pulgar extendido y vuelve a bajar.'],
  ayuda: [23, 'Una mano cerrada con el pulgar arriba se apoya sobre la palma de la otra.', 'La mano cerrada se coloca sobre la palma abierta y ambas se desplazan juntas.'],
  'buenos-dias': [24, 'Un antebrazo queda elevado junto a la cabeza y el otro cruza el pecho.', 'La mano parte del mentón, las manos se cruzan y un antebrazo sube.'],
  'buenas-noches': [25, 'Los antebrazos se cruzan y una mano cae con los dedos hacia abajo.', 'La mano parte del mentón, las manos se cruzan y una termina con los dedos hacia abajo.'],
  disculpa: [26, 'Una mano abierta se coloca sobre la palma de la otra.', 'Una mano abierta se desliza sobre la palma de la otra.'],
  familia: [27, 'Ambas manos se muestran a la altura del pecho con los dedos hacia arriba.', 'Ambas manos recorren un arco hasta encontrarse delante del rostro.'],
  mama: [28, 'Una mano se muestra con los dedos juntos y flexionados.', 'Una mano con los dedos flexionados se desplaza de lado a lado.'],
  papa: [29, 'Una mano queda a la altura del hombro con dos dedos orientados hacia abajo.', 'La mano se mueve lateralmente con los dedos orientados hacia abajo.'],
  hermano: [30, 'Una mano se coloca junto a la muñeca opuesta.', 'El gesto pasa de la zona del labio a la muñeca de la otra mano.'],
  casa: [31, 'Las dos manos unen las yemas en lo alto y forman un ángulo.', 'Las manos suben y se juntan por las yemas antes de volver al reposo.'],
  colegio: [32, 'Las dos manos están próximas al pecho, con los dedos semiflexionados.', 'Las manos juntas y semiflexionadas recorren un círculo frente al torso.'],
  feliz: [33, 'Las dos manos se acercan al pecho, con los dedos reunidos.', 'Las manos parten del pecho, se separan y giran hacia arriba.'],
  triste: [34, 'Una mano cubre parte del rostro.', 'Una mano desciende desde el rostro hacia el pecho con un cambio de expresión.'],
  sorpresa: [35, 'Ambas manos están levantadas cerca del rostro.', 'Las manos se separan a los lados del rostro mientras cambia la expresión.'],
  carne: [36, 'Dos dedos flexionados se acercan a la mejilla.', 'Dos dedos flexionados se acercan a la mejilla antes de bajar la mano.'],
};

const confirmed = new Set(['ayuda', 'no', 'adios', 'gracias']);
const source: MediaSource = { title: 'Colección audiovisual educativa', publisher: 'Proyecto SeñaVerse' };
const usage: Usage = { label: 'Material de uso educativo en SeñaVerse' };

export function importedEducationalAssets(signId: string, word: string): readonly PublishableMedia[] | undefined {
  const entry = importedAssets[signId];
  if (!entry) return;
  const [number, photoDescription, videoDescription] = entry;
  const path = `/media/signs/lsp-${String(number).padStart(3, '0')}-${signId}` as const;
  const common = { signId, availability: 'available', validation: 'pending', source, usage,
    identification: confirmed.has(signId) ? 'user-confirmed' : 'inventory' } as const;
  return [
    { ...common, id: `${signId}:foto`, kind: 'image', location: { type: 'local', url: `${path}.jpeg` },
      thumbnail: { location: { type: 'local', url: `${path}-mini.webp` }, width: 512, height: 288 },
      width: 1280, height: 720, quizSafe: true, quizDescription: photoDescription, alt: `${word}. ${photoDescription}` },
    { ...common, id: `${signId}:video`, kind: 'video', location: { type: 'local', url: `${path}.mp4` },
      quizDescription: videoDescription, alt: `Video de ${word}. ${videoDescription}` },
  ];
}
