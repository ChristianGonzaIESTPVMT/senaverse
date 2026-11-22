import { checkFeatureConfig, type FeatureConfig } from '../../../ml/web/features.mjs';
import { createPredictor, type Predictor } from '../../../ml/web/model.mjs';
import { createNegativeExampleCategory, NEGATIVE_CATEGORY_ID } from './dataset/signCatalog.ts';
import { recognitionSigns } from './recognitionCatalog.ts';
import { MODEL_METADATA } from './dataset/datasetTypes.ts';
import { LAB_MODEL_PATH, LAB_MODEL_VERSION, LAB_V2_MODEL_PATH, LAB_V2_MODEL_VERSION, LAB_V2_POLICY,
  type LabVersion } from './labProtocol.ts';

export const LAB_SIGNS = recognitionSigns.map(({ id, name, expectedHands, type }) => ({ id, name, expectedHands, type }));
export const LAB_SIGNS_BY_ID = new Map(LAB_SIGNS.map(sign => [sign.id, sign]));

export type LabModel = {
  modelVersion: string;
  preprocessing: FeatureConfig;
  labels: { id: string; name: string }[];
  thresholds: { confidence: number; margin: number };
  predictor: Predictor;
  policy?: { version: typeof LAB_V2_POLICY; byLabel: Record<string, LabModel['thresholds']> };
};

export function parseLabModel(document: unknown, version: LabVersion = 'v1'): LabModel {
  if (!document || typeof document !== 'object') throw new TypeError('Modelo de laboratorio inválido.');
  const data = document as Record<string, unknown>;
  const { modelVersion, preprocessing, kind, labels, detector } = data;
  checkFeatureConfig(preprocessing);
  const v2 = version === 'v2';
  const catalog = v2 ? [...LAB_SIGNS, createNegativeExampleCategory()] : LAB_SIGNS;
  const validVersion = v2 ? typeof modelVersion === 'string' && LAB_V2_MODEL_VERSION.test(modelVersion)
    : modelVersion === LAB_MODEL_VERSION;
  if (typeof modelVersion !== 'string' || !validVersion || kind !== 'linear-svm' || preprocessing.steps !== 24
    || !Array.isArray(labels) || labels.length !== catalog.length
    || (v2 ? new Set(labels.map(label => label?.id)).size !== catalog.length
      || labels.some(label => !catalog.some(item => item.id === label?.id && item.name === label?.name))
      : labels.some((label, index) => label?.id !== catalog[index].id || label?.name !== catalog[index].name))
    || !detector || typeof detector !== 'object' || !Object.entries(MODEL_METADATA).every(
      ([key, value]) => (detector as Record<string, unknown>)[key] === value,
    )) {
    throw new TypeError(`El modelo no coincide con la ${version.toUpperCase()} del laboratorio o con MediaPipe.`);
  }
  const predictor = createPredictor(document);
  const thresholds = data.thresholds as LabModel['thresholds'];
  const policy = data.policy as LabModel['policy'];
  if (v2 && (data.negativeLabelId !== NEGATIVE_CATEGORY_ID || policy?.version !== LAB_V2_POLICY
    || !policy.byLabel || Object.keys(policy.byLabel).length !== LAB_SIGNS.length
    || LAB_SIGNS.some(({ id }) => !['confidence', 'margin'].every(key => {
      const value = policy.byLabel[id]?.[key as keyof LabModel['thresholds']];
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
    })))) throw new TypeError('La política V2 del laboratorio es incompatible.');
  return { modelVersion, preprocessing, labels, thresholds, predictor, ...(v2 && { policy }) };
}

export async function loadLabModel(base: string, signal: AbortSignal, request = fetch, version: LabVersion = 'v1') {
  const response = await request(base + (version === 'v2' ? LAB_V2_MODEL_PATH : LAB_MODEL_PATH), {
    signal,
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 503) throw new Error(version === 'v2'
    ? 'V2 pendiente. El laboratorio podrá cargarla cuando se exporte un modelo V2 válido.'
    : 'No se encuentra el artefacto V1 verificado en ml/artifacts/hito-3/model.json.');
  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    throw new Error(`El modelo ${version.toUpperCase()} no está disponible. Verifica la configuración de desarrollo.`);
  }
  const document: unknown = await response.json();
  return parseLabModel(document, version);
}
