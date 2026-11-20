import { checkFeatureConfig, type FeatureConfig } from '../../../ml/web/features.mjs';
import { createPredictor, type Predictor } from '../../../ml/web/model.mjs';
import { createInitialSignCatalog } from './dataset/signCatalog.ts';
import { MODEL_METADATA } from './dataset/datasetTypes.ts';
import { LAB_MODEL_PATH, LAB_MODEL_VERSION } from './labProtocol.ts';

export const LAB_SIGNS = createInitialSignCatalog().map(({ id, name, expectedHands, type }) => ({ id, name, expectedHands, type }));
export const LAB_SIGNS_BY_ID = new Map(LAB_SIGNS.map(sign => [sign.id, sign]));

export type LabModel = {
  modelVersion: string;
  preprocessing: FeatureConfig;
  labels: { id: string; name: string }[];
  thresholds: { confidence: number; margin: number };
  predictor: Predictor;
};

export function parseLabModel(document: unknown): LabModel {
  if (!document || typeof document !== 'object') throw new TypeError('Modelo V1 inválido.');
  const data = document as Record<string, unknown>;
  const { modelVersion, preprocessing, kind, labels, detector } = data;
  checkFeatureConfig(preprocessing);
  if (modelVersion !== LAB_MODEL_VERSION || kind !== 'linear-svm' || preprocessing.steps !== 24
    || !Array.isArray(labels) || labels.length !== LAB_SIGNS.length
    || labels.some((label, index) => label?.id !== LAB_SIGNS[index].id || label?.name !== LAB_SIGNS[index].name)
    || !detector || typeof detector !== 'object' || !Object.entries(MODEL_METADATA).every(
      ([key, value]) => (detector as Record<string, unknown>)[key] === value,
    )) {
    throw new TypeError('El modelo no coincide con la V1 del laboratorio o con MediaPipe.');
  }
  const predictor = createPredictor(document);
  return { modelVersion, preprocessing, labels, thresholds: data.thresholds as LabModel['thresholds'], predictor };
}

export async function loadLabModel(base: string, signal: AbortSignal, request = fetch) {
  const response = await request(base + LAB_MODEL_PATH, {
    signal,
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 503) throw new Error('No se encuentra el artefacto V1 verificado en ml/artifacts/hito-3/model.json.');
  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    throw new Error('El modelo V1 no está disponible. Verifica la configuración de desarrollo.');
  }
  const document: unknown = await response.json();
  return parseLabModel(document);
}
