import { libraryEntries } from './library';

// Catálogo de demostración para preparar las vistas de práctica.
export const practiceSigns = libraryEntries.filter(entry => ['hola', 'gracias', 'adios', 'si', 'no'].includes(entry.id));

export function getFreePracticePath(signId: string) {
  return `/camara/libre?sena=${encodeURIComponent(signId)}`;
}
