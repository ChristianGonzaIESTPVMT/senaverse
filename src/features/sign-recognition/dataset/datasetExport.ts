import { getHandLandmarkerOptions, HAND_DETECTION_PROFILES } from '../config.ts';
import { CAPTURE_DEFAULTS, CONSENT_VERSION, MAX_IMPORT_BYTES, MAX_RECORDING_MS, MIN_RECORDING_MS, MODEL_METADATA, type DatasetDocument, type DatasetSample, type DatasetSign, type ModelMetadata } from './datasetTypes.ts';
import { calculateQuality, sameQuality, sampleCanBeSaved } from './datasetValidation.ts';
import { createInitialSignCatalog, isSafeReference, signConfigurationErrors } from './signCatalog.ts';

type ObjectValue = Record<string, unknown>;
const signIds = new Set(createInitialSignCatalog().map(sign => sign.id));
function check(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`JSON inválido: ${message}`); }
function object(value: unknown, keys: string[], path: string): ObjectValue {
  check(!!value && typeof value === 'object' && !Array.isArray(value), path);
  const result = value as ObjectValue;
  check(Object.keys(result).every(key => keys.includes(key)), `${path}: hay campos no permitidos.`);
  return result;
}
function string(value: unknown, maximum = 2000): value is string { return typeof value === 'string' && value.length <= maximum; }
function id(value: unknown): value is string { return string(value, 80) && /^[A-Za-z0-9-]+$/.test(value); }
function date(value: unknown): value is string { return string(value, 40) && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)); }
function number(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number { return number(value, min, max) && Number.isInteger(value); }
function choice(value: unknown, choices: string[]): value is string { return typeof value === 'string' && choices.includes(value); }
function array(value: unknown, max: number, path: string): asserts value is unknown[] { check(Array.isArray(value) && value.length <= max, path); }

export function validateSign(value: unknown): asserts value is DatasetSign {
  const sign = object(value, ['id', 'name', 'description', 'type', 'expectedHands', 'durationMs', 'instructions', 'referenceUrl', 'validationStatus'], 'seña');
  check(typeof sign.id === 'string' && signIds.has(sign.id), 'ID de espacio de seña.');
  check(string(sign.name, 120) && string(sign.description) && string(sign.instructions) && string(sign.referenceUrl, 1000), 'textos de la seña.');
  check(choice(sign.type, ['static', 'dynamic']) && integer(sign.expectedHands, 1, 2), 'tipo o manos de la seña.');
  check(number(sign.durationMs, MIN_RECORDING_MS, MAX_RECORDING_MS) && choice(sign.validationStatus, ['unconfigured', 'pending', 'validated']), 'duración o estado de la seña.');
  check(isSafeReference(sign.referenceUrl), 'referencia audiovisual.');
  if (sign.validationStatus !== 'unconfigured') check(signConfigurationErrors(sign as unknown as DatasetSign).length === 0, 'metadatos incompletos de una seña configurada.');
}

function validateModel(value: unknown): asserts value is ModelMetadata {
  const model = object(value, ['package', 'packageVersion', 'task', 'model', 'modelVersion', 'quantization', 'sha256'], 'modelo');
  check(['package', 'packageVersion', 'task', 'model', 'modelVersion', 'quantization'].every(key => string(model[key], 120) && model[key] !== ''), 'datos del modelo.');
  check(model.task === 'HandLandmarker' && string(model.sha256, 64) && /^[a-f0-9]{64}$/.test(model.sha256), 'modelo Hand Landmarker o hash.');
}

function validatePoint(value: unknown) {
  const point = object(value, ['x', 'y', 'z'], 'landmark');
  check(['x', 'y', 'z'].every(key => typeof point[key] === 'number' && Number.isFinite(point[key])), 'coordenadas no finitas.');
}

export function validateDatasetSample(value: unknown): asserts value is DatasetSample {
  const sample = object(value, ['sampleId', 'labelId', 'participantId', 'repetition', 'recordedAt', 'durationMs', 'frames', 'incidents', 'qualityMetrics', 'captureMetadata', 'reviewStatus'], 'muestra');
  check(id(sample.sampleId) && id(sample.labelId) && string(sample.participantId, 7) && /^P\d{3,6}$/.test(sample.participantId), 'identificadores de la muestra.');
  check(integer(sample.repetition, 1, 1000000) && date(sample.recordedAt) && number(sample.durationMs, MIN_RECORDING_MS, MAX_RECORDING_MS), 'repetición, fecha o duración.');
  check(choice(sample.reviewStatus, ['pending', 'accepted', 'rejected']), 'estado de revisión.');
  array(sample.frames, 1000, 'fotogramas');
  let previous = -Infinity;
  for (const value of sample.frames) {
    const frame = object(value, ['timestampMs', 'handCount', 'hands'], 'fotograma');
    check(number(frame.timestampMs, 0, sample.durationMs) && frame.timestampMs < sample.durationMs && frame.timestampMs > previous, 'timestamps repetidos, desordenados o fuera del intervalo.');
    previous = frame.timestampMs;
    array(frame.hands, 2, 'manos');
    check(integer(frame.handCount, 0, 2) && frame.handCount === frame.hands.length, 'recuento de manos.');
    for (const value of frame.hands) {
      const hand = object(value, ['handedness', 'landmarks', 'worldLandmarks'], 'mano');
      array(hand.handedness, 4, 'lateralidad');
      for (const value of hand.handedness) {
        const category = object(value, ['score', 'index', 'categoryName', 'displayName'], 'lateralidad');
        check(number(category.score, 0, 1) && integer(category.index, -1, 100) && string(category.categoryName, 60) && string(category.displayName, 60), 'categoría de lateralidad.');
      }
      array(hand.landmarks, 21, 'landmarks'); check(hand.landmarks.length === 21, 'se requieren 21 puntos por mano.'); hand.landmarks.forEach(validatePoint);
      if (hand.worldLandmarks !== undefined) { array(hand.worldLandmarks, 21, 'world landmarks'); check(hand.worldLandmarks.length === 21, 'world landmarks incompletos.'); hand.worldLandmarks.forEach(validatePoint); }
    }
  }
  array(sample.incidents, 1000, 'incidencias');
  for (const value of sample.incidents) {
    const incident = object(value, ['timestampMs', 'type'], 'incidencia');
    check(number(incident.timestampMs, 0, sample.durationMs) && choice(incident.type, ['hand-count-mismatch', 'result-gap', 'invalid-result']), 'incidencia de captura.');
  }
  const metadata = object(sample.captureMetadata, ['configuration', 'model', 'labelSnapshot', 'consentedAt', 'consentVersion', 'requestedDurationMs', 'completed'], 'metadatos');
  validateModel(metadata.model); validateSign(metadata.labelSnapshot);
  check(metadata.labelSnapshot.id === sample.labelId && metadata.labelSnapshot.validationStatus !== 'unconfigured', 'etiqueta original.');
  check(metadata.completed === true && date(metadata.consentedAt) && metadata.consentVersion === CONSENT_VERSION
    && metadata.requestedDurationMs === sample.durationMs && metadata.labelSnapshot.durationMs === sample.durationMs, 'captura incompleta o sin consentimiento.');
  const configuration = object(metadata.configuration, ['delegate', 'profile', 'runningMode', 'numHands', 'minHandDetectionConfidence', 'minHandPresenceConfidence', 'minTrackingConfidence', 'processingWidth', 'processingHeight', 'cameraWidth', 'cameraHeight', 'cameraFrameRate', 'inputMirrored'], 'configuración de captura');
  check(choice(configuration.delegate, ['GPU', 'CPU']) && typeof configuration.profile === 'string' && Object.hasOwn(HAND_DETECTION_PROFILES, configuration.profile), 'delegado o perfil.');
  check(configuration.runningMode === 'VIDEO' && configuration.numHands === 2 && configuration.inputMirrored === false, 'modo de captura.');
  for (const key of ['processingWidth', 'processingHeight', 'cameraWidth', 'cameraHeight']) check(integer(configuration[key], 1, 16384), 'resolución de captura.');
  check(configuration.cameraFrameRate === null || number(configuration.cameraFrameRate, 0, 1000), 'FPS de cámara.');
  const thresholds = getHandLandmarkerOptions(configuration.profile as keyof typeof HAND_DETECTION_PROFILES);
  for (const key of ['minHandDetectionConfidence', 'minHandPresenceConfidence', 'minTrackingConfidence'] as const) check(configuration[key] === thresholds[key], 'umbrales no coherentes con el perfil.');
  const quality = object(sample.qualityMetrics, ['frameCount', 'validLandmarkFrames', 'expectedHandFrames', 'expectedHandsRatio', 'observedDurationMs', 'averageFps', 'minimumHands', 'maximumHands', 'trackingLosses', 'warnings', 'sufficient'], 'calidad');
  const calculated = calculateQuality(sample.frames as DatasetSample['frames'], sample.durationMs, metadata.labelSnapshot.expectedHands);
  check(sameQuality(calculated, quality as unknown as DatasetSample['qualityMetrics']), 'métricas de calidad que no coinciden con la secuencia.');
  check(sampleCanBeSaved(sample as unknown as DatasetSample), 'la muestra no contiene suficientes datos reales para guardarse.');
  check(sample.reviewStatus !== 'accepted' || calculated.sufficient, 'una muestra de calidad insuficiente no puede figurar como aceptada.');
}

export function validateDatasetDocument(value: unknown): asserts value is DatasetDocument {
  const doc = object(value, ['schemaVersion', 'datasetId', 'createdAt', 'nextParticipantNumber', 'captureConfiguration', 'mediaPipeModel', 'exportType', 'collectedAt', 'exportedAt', 'participants', 'signs', 'samples'], 'dataset');
  check(doc.schemaVersion === 1 && id(doc.datasetId) && date(doc.createdAt) && date(doc.exportedAt), 'versión, identificador o fechas.');
  check(choice(doc.exportType, ['dataset', 'backup']), 'tipo de exportación.');
  const defaults = object(doc.captureConfiguration, Object.keys(CAPTURE_DEFAULTS), 'parámetros del esquema');
  check(Object.entries(CAPTURE_DEFAULTS).every(([key, value]) => defaults[key] === value), 'configuración del esquema no compatible.');
  validateModel(doc.mediaPipeModel);
  check(Object.entries(MODEL_METADATA).every(([key, value]) => (doc.mediaPipeModel as unknown as ObjectValue)[key] === value), 'el respaldo usa otra versión del modelo o del SDK.');
  array(doc.signs, 10, 'catálogo'); check(doc.signs.length === 10, 'el catálogo necesita diez espacios.');
  doc.signs.forEach(validateSign);
  check(new Set(doc.signs.map(sign => (sign as DatasetSign).id)).size === 10, 'IDs de señas duplicados.');
  array(doc.participants, 10000, 'participantes');
  const participantIds = new Set<string>();
  for (const value of doc.participants) {
    const participant = object(value, ['id', 'createdAt', 'consentedAt', 'consentVersion'], 'participante');
    check(string(participant.id, 7) && /^P\d{3,6}$/.test(participant.id) && Number(participant.id.slice(1)) > 0 && date(participant.createdAt), 'identificador anónimo o fecha.');
    check((participant.consentedAt === null && participant.consentVersion === null) || (date(participant.consentedAt) && participant.consentVersion === CONSENT_VERSION), 'consentimiento.');
    check(!participantIds.has(participant.id), 'participantes duplicados.'); participantIds.add(participant.id);
  }
  check(integer(doc.nextParticipantNumber, 1, 1000000) && doc.nextParticipantNumber > Math.max(0, ...[...participantIds].map(id => Number(id.slice(1)))), 'contador de participantes no válido.');
  array(doc.samples, 20000, 'muestras');
  const sampleIds = new Set<string>(), repetitions = new Set<string>();
  for (const sample of doc.samples) {
    validateDatasetSample(sample);
    check(participantIds.has(sample.participantId) && doc.signs.some(sign => (sign as DatasetSign).id === sample.labelId), 'referencias de una muestra.');
    check(!sampleIds.has(sample.sampleId), 'muestras duplicadas.'); sampleIds.add(sample.sampleId);
    const repetition = `${sample.participantId}/${sample.labelId}/${sample.repetition}`;
    check(!repetitions.has(repetition), 'repeticiones duplicadas.'); repetitions.add(repetition);
    check(Object.entries(sample.captureMetadata.model).every(([key, value]) => (doc.mediaPipeModel as unknown as ObjectValue)[key] === value), 'modelo del dataset y de la muestra diferentes.');
  }
  const firstDate = (doc.samples as DatasetSample[]).map(sample => sample.recordedAt).sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;
  check(doc.collectedAt === firstDate, 'fecha inicial de recopilación.');
}

export function parseDatasetJSON(text: string): DatasetDocument {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new Error('El archivo supera el límite de importación de 100 MB.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('El archivo no contiene JSON válido.'); }
  validateDatasetDocument(value);
  return value;
}

export function serializeDataset(document: DatasetDocument): string {
  validateDatasetDocument(document);
  const json = JSON.stringify(document);
  if (new TextEncoder().encode(json).byteLength > MAX_IMPORT_BYTES) throw new Error('El JSON supera el límite de respaldo de 100 MB. No se generará un archivo que el Studio no pueda restaurar.');
  return json;
}

export function downloadDataset(document: DatasetDocument) {
  const url = URL.createObjectURL(new Blob([serializeDataset(document)], { type: 'application/json' }));
  const link = window.document.createElement('a');
  link.href = url; link.download = `senaverse-${document.exportType}-${document.datasetId}.json`;
  link.hidden = true; window.document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
