import { getEducationalSign } from './library';

// Catálogo de demostración para preparar las vistas de práctica.
export const practiceSigns = ['hola', 'gracias', 'adios', 'si', 'no'].flatMap(id => getEducationalSign(id) ?? []);

export function getFreePracticePath(signId: string) {
  return `/camara/libre?sena=${encodeURIComponent(signId)}`;
}
