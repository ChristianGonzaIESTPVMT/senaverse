import type { getHandLandmarkerAssets, HandDetectionProfile } from './config';
import type { DetectionDelegate, InferenceOutput } from './types';

export type HandWorkerRequest =
  | { type: 'init'; assets: ReturnType<typeof getHandLandmarkerAssets>; profile: HandDetectionProfile }
  | { type: 'frame'; id: number; timestamp: number; frame: ImageBitmap }
  | { type: 'dispose' };

export type HandWorkerResponse =
  | { type: 'ready'; delegate: DetectionDelegate }
  | { type: 'disposed' }
  | ({ type: 'result'; id: number; timestamp: number } & InferenceOutput)
  | { type: 'error'; message: string };
