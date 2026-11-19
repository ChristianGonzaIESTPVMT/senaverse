import { CAPTURE_DEFAULTS, type CaptureIncident, type DatasetFrame, type DatasetSample, type QualityMetrics, type SampleSummary } from './datasetTypes.ts';
import type { HandDetectionResult } from '../types';

export function workerResultFrame(result: HandDetectionResult, timestampMs: number): DatasetFrame | null {
  if (!Array.isArray(result.landmarks) || result.landmarks.length > 2) return null;
  const validPoints = (points: { x: number; y: number; z: number }[]) => Array.isArray(points) && points.length === 21
    && points.every(point => point && [point.x, point.y, point.z].every(Number.isFinite));
  if (result.landmarks.some(points => !validPoints(points))) return null;
  const hands: DatasetFrame['hands'] = [];
  for (let index = 0; index < result.landmarks.length; index++) {
    const categories = result.handedness?.[index] ?? [];
    if (!Array.isArray(categories) || categories.some(category => !Number.isFinite(category.score) || category.score < 0 || category.score > 1
      || !Number.isInteger(category.index) || typeof category.categoryName !== 'string' || typeof category.displayName !== 'string')) return null;
    const world = result.worldLandmarks?.[index];
    if (world?.length && !validPoints(world)) return null;
    // JSON represents -0 as 0; canonicalize that equal numeric value before persistence.
    const clonePoint = ({ x, y, z }: { x: number; y: number; z: number }) => ({ x: x === 0 ? 0 : x, y: y === 0 ? 0 : y, z: z === 0 ? 0 : z });
    hands.push({ handedness: categories.map(({ score, index, categoryName, displayName }) => ({ score, index, categoryName, displayName })),
      landmarks: result.landmarks[index].map(clonePoint), ...(world?.length ? { worldLandmarks: world.map(clonePoint) } : {}) });
  }
  return { timestampMs, handCount: hands.length, hands };
}

type QualityContext = { incidents?: CaptureIncident[]; completed?: boolean; requestedDurationMs?: number };

function integrityWarnings(quality: Pick<QualityMetrics, 'minimumHands' | 'observedDurationMs'>, durationMs: number, expectedHands: number, context: QualityContext) {
  const warnings: string[] = [];
  if (expectedHands > 0 && quality.minimumHands < expectedHands) warnings.push('Falta al menos una mano necesaria en alguna observación.');
  if (context.incidents?.some(incident => incident.type === 'duplicate-timestamp')) warnings.push('Se recibieron timestamps repetidos; los resultados duplicados no se guardaron como fotogramas.');
  if (context.incidents?.some(incident => incident.type === 'out-of-order-timestamp')) warnings.push('Se recibieron timestamps desordenados; esos resultados no se guardaron como fotogramas.');
  if (context.incidents?.some(incident => incident.type === 'result-gap')) warnings.push('Hubo pérdidas significativas de detección durante la captura.');
  if (context.incidents?.some(incident => incident.type === 'invalid-result')) warnings.push('Se descartaron resultados incompletos del detector.');
  if (context.completed === false || durationMs < (context.requestedDurationMs ?? durationMs)) warnings.push('La muestra está incompleta respecto al intervalo solicitado.');
  if (quality.observedDurationMs < (context.requestedDurationMs ?? durationMs) * CAPTURE_DEFAULTS.minimumCoverageRatio) warnings.push('La duración real observada es insuficiente.');
  return warnings;
}

/** Without context, preserve the original policy so historical metrics still round-trip exactly. */
export function calculateQuality(frames: DatasetFrame[], durationMs: number, expectedHands: number, context?: QualityContext): QualityMetrics {
  const expectedHandFrames = frames.filter(frame => expectedHands === 0 || frame.handCount === expectedHands).length;
  const validLandmarkFrames = frames.filter(frame => frame.handCount > 0).length;
  const observedDurationMs = frames.length > 1 ? frames.at(-1)!.timestampMs - frames[0].timestampMs : 0;
  const averageFps = observedDurationMs > 0 ? (frames.length - 1) * 1000 / observedDurationMs : 0;
  let trackingLosses = 0;
  for (let i = 1; i < frames.length; i++) if (frames[i - 1].handCount >= expectedHands && frames[i].handCount < expectedHands) trackingLosses++;
  const expectedHandsRatio = frames.length ? expectedHandFrames / frames.length : 0;
  const warnings: string[] = [];
  if (frames.length < CAPTURE_DEFAULTS.minimumFrames) warnings.push('Hay pocos fotogramas para revisar esta repetición.');
  if (averageFps < CAPTURE_DEFAULTS.minimumFps) warnings.push(`La frecuencia real es inferior a ${CAPTURE_DEFAULTS.minimumFps} observaciones/s.`);
  if (expectedHandsRatio < CAPTURE_DEFAULTS.minimumExpectedHandsRatio) warnings.push(`Menos del ${CAPTURE_DEFAULTS.minimumExpectedHandsRatio * 100}% de las observaciones tiene las manos esperadas.`);
  if (!durationMs || observedDurationMs / durationMs < CAPTURE_DEFAULTS.minimumCoverageRatio) warnings.push(`Los datos cubren menos del ${CAPTURE_DEFAULTS.minimumCoverageRatio * 100}% del intervalo.`);
  if (frames.some(frame => frame.hands.some(hand => hand.handedness.length === 0))) warnings.push('Falta lateralidad de MediaPipe en alguna mano.');
  if (frames.some((frame, index) => index > 0 && frame.timestampMs - frames[index - 1].timestampMs > 250)) warnings.push('Hubo interrupciones entre resultados del Worker.');
  if (context) {
    warnings.push(...integrityWarnings({ minimumHands: frames.length ? Math.min(...frames.map(frame => frame.handCount)) : 0, observedDurationMs }, durationMs, expectedHands, context));
    if (frames.some((frame, index) => index > 0 && frame.timestampMs <= frames[index - 1].timestampMs)) warnings.push('La secuencia contiene timestamps repetidos o desordenados.');
    if (frames.length && (frames[0].timestampMs > 250 || durationMs - frames.at(-1)!.timestampMs > 250)) warnings.push('Faltan observaciones al inicio o al final de la muestra.');
  }
  return { frameCount: frames.length, validLandmarkFrames, expectedHandFrames, expectedHandsRatio, observedDurationMs, averageFps,
    minimumHands: frames.length ? Math.min(...frames.map(frame => frame.handCount)) : 0,
    maximumHands: frames.length ? Math.max(...frames.map(frame => frame.handCount)) : 0,
    trackingLosses, warnings, sufficient: warnings.length === 0 };
}

export function sampleCanBeSaved(sample: DatasetSample) {
  return sample.captureMetadata.completed === true && sample.frames.length >= 2 && (sample.qualityMetrics.validLandmarkFrames > 0
    || (sample.captureMetadata.labelSnapshot.category === 'negative' && sample.captureMetadata.labelSnapshot.expectedHands === 0));
}

export function sampleReviewWarnings(sample: SampleSummary) {
  return [...new Set([...sample.qualityMetrics.warnings, ...integrityWarnings(sample.qualityMetrics, sample.durationMs,
    sample.captureMetadata.labelSnapshot.expectedHands, { ...sample.captureMetadata, incidents: sample.incidents })])];
}

export function sameQuality(a: QualityMetrics, b: QualityMetrics) {
  return (Object.keys(a) as (keyof QualityMetrics)[]).every(key => {
    const left = a[key], right = b[key];
    return Array.isArray(left) ? JSON.stringify(left) === JSON.stringify(right)
      : typeof left === 'number' && typeof right === 'number' ? Math.abs(left - right) < 1e-8 : left === right;
  });
}
