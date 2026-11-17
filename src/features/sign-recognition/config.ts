import type { HandLandmarkerOptions } from '@mediapipe/tasks-vision';

export const HAND_LANDMARKER_OPTIONS = {
  runningMode: 'VIDEO',
  numHands: 2,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
} as const satisfies HandLandmarkerOptions;

// Change one threshold at a time. Baseline remains the default until physical trials justify a change.
export const HAND_DETECTION_PROFILES = {
  baseline: { label: 'Base: 0.5 / 0.5 / 0.5', overrides: {} },
  'presence-045': { label: 'Presencia: 0.45', overrides: { minHandPresenceConfidence: 0.45 } },
  'tracking-040': { label: 'Seguimiento: 0.40', overrides: { minTrackingConfidence: 0.4 } },
  'tracking-035': { label: 'Seguimiento: 0.35', overrides: { minTrackingConfidence: 0.35 } },
} as const;
export type HandDetectionProfile = keyof typeof HAND_DETECTION_PROFILES;
export const DEFAULT_HAND_PROFILE: HandDetectionProfile = 'baseline';
export function getHandLandmarkerOptions(profile: HandDetectionProfile = DEFAULT_HAND_PROFILE) {
  return { ...HAND_LANDMARKER_OPTIONS, ...HAND_DETECTION_PROFILES[profile].overrides };
}

export const CAMERA_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 },
};
export const PROCESSING_SIZE = { width: 640, height: 480 } as const;
export const MAX_DETECTION_FPS = 30;
export const MAX_RESULT_AGE_MS = 120;
export const TEMPORARY_LOSS_MS = 300;
export const LOST_OVERLAY_HOLD_MS = 80;
export const DIAGNOSTIC_INTERVAL_MS = 500;

export function getHandLandmarkerAssets(baseUrl: string) {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return { model: `${base}models/hand_landmarker.task`, wasm: `${base}mediapipe/wasm` };
}
