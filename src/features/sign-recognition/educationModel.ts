import { parseLabModel } from './labModel';
import type { RecognitionModelLoader } from './useRecognition';

/** Change the deployed model here when a new version is validated. */
export const loadEducationModel: RecognitionModelLoader = async signal => {
  const response = await fetch(import.meta.env.BASE_URL + 'models/lsp-v1.json', { signal });
  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    throw new Error('El modelo de reconocimiento no está disponible. Vuelve a intentar la carga.');
  }
  return parseLabModel(await response.json());
};
