export type HomeVisualName = 'brand' | 'welcome' | 'hero' | 'lessons' | 'experience' | 'progress' | 'learning' | 'library' | 'games';

type HomeVisual = {
  src?: string;
  alt: string;
  fit?: 'contain' | 'cover';
};

/**
 * Para reemplazar un ícono, guarda la imagen en public/images/ y agrega su src.
 * Ejemplo: hero: { src: '/images/bienvenida.webp', alt: 'Bienvenida a SeñaVerse' }.
 * Usa fit: 'cover' para fotografías que deban llenar su espacio.
 * Sin src se muestra la ilustración de respaldo.
 */
export const homeVisuals: Record<HomeVisualName, HomeVisual> = {
  brand: { alt: 'SeñaVerse' },
  welcome: { alt: 'Mano saludando' },
  hero: { alt: 'Una mano para darte la bienvenida' },
  lessons: { alt: 'Libro abierto' },
  experience: { alt: 'Estrella de experiencia' },
  progress: { alt: 'Meta de aprendizaje' },
  learning: { alt: 'Mapa de la ruta de aprendizaje' },
  library: { alt: 'Libros de la biblioteca' },
  games: { alt: 'Control de videojuegos' },
};
