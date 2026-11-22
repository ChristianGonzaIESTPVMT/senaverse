import { createRoot } from 'react-dom/client';
import { SignMediaViewer } from '../../src/components/SignMediaViewer';
import type { EducationalVideo, IllustratedSequence } from '../../src/data/educationalMedia';
import type { LibraryEntry } from '../../src/data/library';
import '../../src/index.css';

const attribution = {
  source: { title: 'Material geométrico de prueba', publisher: 'SeñaVerse', url: '/__media-test/' },
  usage: { label: 'Solo pruebas aisladas' },
  validation: 'validated', availability: 'available',
} as const;

const frames = [
  { location: { type: 'local', url: '/__media-test/frame.svg' }, width: 64, height: 64, alt: 'Cuadrado violeta' },
  { location: { type: 'local', url: '/__media-test/frame.svg?second' }, width: 64, height: 64, alt: 'Cuadrado verde' },
] as const;

function sample(id: string, word: string, path: `/${string}`): LibraryEntry {
  const visual: IllustratedSequence = {
    ...attribution, id: `${id}:sequence`, signId: id, kind: 'sequence', frames, alt: 'Dos figuras geométricas',
  };
  const video: EducationalVideo = {
    ...attribution, id: `${id}:video`, signId: id, kind: 'video',
    location: { type: 'local', url: path }, alt: word,
  };
  return { id, word, description: word, meaning: word, category: 'numeros', tone: 'mint',
    validation: 'validated', media: { visual, video } };
}

createRoot(document.getElementById('root')!).render(<main>
  <SignMediaViewer sign={sample('fixture-video', 'Video de colores', '/__media-test/sample.webm')} />
  <SignMediaViewer sign={sample('fixture-missing', 'Archivo ausente', '/__media-test/missing.webm')} />
</main>);
