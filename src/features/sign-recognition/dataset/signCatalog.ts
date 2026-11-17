import { CAPTURE_DEFAULTS, MAX_RECORDING_MS, MIN_RECORDING_MS, type DatasetSign } from './datasetTypes.ts';

/** Ten empty slots, not a proposed or linguistically validated vocabulary. IDs remain stable. */
export function createInitialSignCatalog(): DatasetSign[] {
  return Array.from({ length: 10 }, (_, index) => ({
    id: `sign-${String(index + 1).padStart(2, '0')}`, name: '', description: '', type: 'static', expectedHands: 1,
    durationMs: CAPTURE_DEFAULTS.staticDurationMs, instructions: '', referenceUrl: '', validationStatus: 'unconfigured',
  }));
}

export function isSafeReference(value: string) {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}

export function signConfigurationErrors(sign: DatasetSign): string[] {
  const errors: string[] = [];
  if (!sign.name.trim()) errors.push('Escribe un nombre para la etiqueta.');
  if (!sign.description.trim() || !sign.instructions.trim()) errors.push('Completa la descripción y las instrucciones.');
  if (!['static', 'dynamic'].includes(sign.type) || ![1, 2].includes(sign.expectedHands)) errors.push('Revisa el tipo y las manos esperadas.');
  if (!Number.isFinite(sign.durationMs) || sign.durationMs < MIN_RECORDING_MS || sign.durationMs > MAX_RECORDING_MS) errors.push('La duración debe estar entre 0.5 y 10 segundos.');
  if (!isSafeReference(sign.referenceUrl)) errors.push('La referencia debe ser una dirección HTTP(S) o una ruta local.');
  if (sign.validationStatus === 'unconfigured') errors.push('Marca la etiqueta como pendiente o validada por revisión humana.');
  return errors;
}

export function signDisplayName(sign: DatasetSign) { return sign.name.trim() || `Espacio ${sign.id.slice(-2)} · sin configurar`; }
