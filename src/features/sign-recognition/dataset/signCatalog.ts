import { MAX_RECORDING_MS, MIN_RECORDING_MS, type DatasetSign, type SignSourceReference } from './datasetTypes.ts';

export const LSP_SOURCE = {
  title: 'Lengua de Señas Peruana: guía para el aprendizaje de la lengua de señas peruana, vocabulario básico',
  publisher: 'Ministerio de Educación del Perú', year: 2015,
  repositoryUrl: 'https://repositorio.minedu.gob.pe/handle/20.500.12799/5545',
};
export const NEGATIVE_CATEGORY_ID = 'NEG-001';
export const isLegacySignId = (id: string) => /^sign-(0[1-9]|10)$/.test(id);

/** Catalog configuration supplied for Hito 2; expert linguistic review is still pending. */
export function createInitialSignCatalog(): DatasetSign[] {
  const entries: { name: string; type: 'static' | 'dynamic'; hands: 1 | 2; duration: number; page: number; execution: string }[] = [
    { name: 'Uno', type: 'static', hands: 1, duration: 1500, page: 73, execution: 'Reproduce con una mano la postura de «Uno» ilustrada en la página 73 de la guía MINEDU. Mantén esa postura durante todo el intervalo.' },
    { name: 'Dos', type: 'static', hands: 1, duration: 1500, page: 73, execution: 'Reproduce con una mano la postura de «Dos» ilustrada en la página 73 de la guía MINEDU. Mantén esa postura durante todo el intervalo.' },
    { name: 'Tres', type: 'static', hands: 1, duration: 1500, page: 73, execution: 'Mantén pulgar, índice y medio extendidos en una mano durante todo el intervalo. Consulta la configuración y orientación de «Tres» en la página 73 de la guía MINEDU.' },
    { name: 'Cuatro', type: 'static', hands: 1, duration: 1500, page: 73, execution: 'Reproduce con una mano la postura de «Cuatro» ilustrada en la página 73 de la guía MINEDU. Mantén esa postura durante todo el intervalo.' },
    { name: 'Cinco', type: 'static', hands: 1, duration: 1500, page: 73, execution: 'Reproduce con una mano la postura de «Cinco» ilustrada en la página 73 de la guía MINEDU. Mantén esa postura durante todo el intervalo.' },
    { name: 'Sí', type: 'dynamic', hands: 1, duration: 2500, page: 134, execution: 'Según la referencia: puño derecho vertical, con movimiento de muñeca de arriba hacia abajo. Registra el movimiento completo durante el intervalo.' },
    { name: 'Nada', type: 'dynamic', hands: 1, duration: 2500, page: 134, execution: 'Según la referencia: pulgar e índice derechos juntos, los demás dedos extendidos y desplazamiento lateral de derecha a izquierda. Registra la secuencia completa.' },
    { name: 'Mucho', type: 'dynamic', hands: 2, duration: 3000, page: 134, execution: 'Abre y cierra las yemas de los dedos de ambas manos. Mantén las dos manos visibles y registra su movimiento simultáneo completo.' },
    { name: 'Solo', type: 'dynamic', hands: 1, duration: 2500, page: 135, execution: 'Según la referencia: índice derecho extendido verticalmente, realizando un movimiento giratorio. Registra el movimiento completo.' },
    { name: 'Con', type: 'dynamic', hands: 2, duration: 3000, page: 135, execution: 'Coloca ambas manos en puño, con los pulgares extendidos, aproximándolas entre sí. Registra el acercamiento completo con las dos manos visibles.' },
  ];
  return entries.map((entry, index) => ({
    id: `LSP-${String(index + 1).padStart(3, '0')}`, name: entry.name, category: 'lsp',
    description: `${entry.type === 'static' ? 'Seña estática' : 'Seña dinámica'} del catálogo inicial de LSP. Referencia MINEDU (2015), página ${entry.page}. Pendiente de revisión lingüística.`,
    type: entry.type, expectedHands: entry.hands, durationMs: entry.duration, instructions: entry.execution,
    referenceUrl: LSP_SOURCE.repositoryUrl, sourceReference: { ...LSP_SOURCE, page: entry.page }, validationStatus: 'pending',
  }));
}

/** A technical label, deliberately outside the ten LSP entries. Zero means no required hand count. */
export function createNegativeExampleCategory(): DatasetSign {
  return { id: NEGATIVE_CATEGORY_ID, name: 'Ejemplos negativos', category: 'negative', type: 'dynamic', expectedHands: 0,
    durationMs: 2500, description: 'Categoría técnica independiente. No es una seña oficial de LSP.',
    instructions: 'Registra manos en reposo, movimientos ajenos al catálogo o gestos desconocidos. No ejecutes intencionalmente ninguna de las diez señas. Conserva la secuencia real, incluso si no hay manos visibles.',
    referenceUrl: '', validationStatus: 'not-applicable' };
}

export function createDatasetCatalog() { return [...createInitialSignCatalog(), createNegativeExampleCategory()]; }

/** Add only missing entries. Never infer a mapping or modify a historical label/sample. */
export function catalogAdditions(existing: DatasetSign[]) {
  const ids = new Set(existing.map(sign => sign.id));
  return createDatasetCatalog().filter(sign => !ids.has(sign.id));
}

export function isSafeReference(value: string) {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}

export function sameSource(a: SignSourceReference | undefined, b: SignSourceReference | undefined) {
  return !!a && !!b && (Object.keys(LSP_SOURCE) as (keyof typeof LSP_SOURCE)[]).every(key => a[key] === b[key]) && a.page === b.page;
}

export function signConfigurationErrors(sign: DatasetSign): string[] {
  const errors: string[] = [];
  if (!sign.name.trim()) errors.push('Escribe un nombre para la etiqueta.');
  if (!sign.description.trim() || !sign.instructions.trim()) errors.push('Completa la descripción y las instrucciones.');
  const allowedHands = sign.category === 'negative' ? [0, 1, 2] : [1, 2];
  if (!['static', 'dynamic'].includes(sign.type) || !allowedHands.includes(sign.expectedHands)) errors.push('Revisa el tipo y las manos esperadas.');
  if (!Number.isFinite(sign.durationMs) || sign.durationMs < MIN_RECORDING_MS || sign.durationMs > MAX_RECORDING_MS) errors.push('La duración debe estar entre 0.5 y 10 segundos.');
  if (!isSafeReference(sign.referenceUrl)) errors.push('La referencia debe ser una dirección HTTP(S) o una ruta local.');
  if (sign.validationStatus === 'unconfigured') errors.push('Marca la etiqueta como pendiente de revisión.');
  const canonical = createInitialSignCatalog().find(item => item.id === sign.id);
  if (canonical && (sign.category !== 'lsp' || sign.name !== canonical.name || sign.type !== canonical.type || sign.expectedHands !== canonical.expectedHands
    || sign.referenceUrl !== canonical.referenceUrl || !sameSource(sign.sourceReference, canonical.sourceReference) || sign.validationStatus !== 'pending')) {
    errors.push('Conserva la identidad LSP, la referencia y el estado pendiente de revisión lingüística.');
  }
  if (sign.category === 'negative' && (sign.id !== NEGATIVE_CATEGORY_ID || sign.validationStatus !== 'not-applicable' || sign.sourceReference !== undefined)) errors.push('La categoría negativa es técnica; la validación lingüística no aplica.');
  return errors;
}

export function expectedHandsMatch(sign: DatasetSign, count: number) { return sign.expectedHands === 0 || count === sign.expectedHands; }
export function signDisplayName(sign: DatasetSign) { return sign.name.trim() || `Espacio ${sign.id.slice(-2)} · sin configurar`; }
