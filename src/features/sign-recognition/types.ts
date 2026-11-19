import type { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { HandDetectionProfile } from './config';

export type HandDetectionResult = HandLandmarkerResult;
export type HandDetector = Pick<HandLandmarker, 'detectForVideo' | 'close'>;
export type DetectionDelegate = 'GPU' | 'CPU';
export type InitializedHandDetector = { detector: HandDetector; delegate: DetectionDelegate };
export type HandDetectionStatus = 'idle' | 'loading' | 'searching' | 'detected' | 'lost' | 'out-of-frame' | 'error';
export type HandFailurePhase = 'initialization' | 'capture' | 'inference' | 'render' | 'worker';
export type HandDetectionFailure = { phase: HandFailurePhase; detail: string };
export type HandDetectionState = { status: HandDetectionStatus; handCount: number; missingHands?: number; error?: HandDetectionFailure };
export type HandDetectionSession = { stop: () => void; redraw: () => void; resetDiagnostics: () => void; readDiagnostics: () => HandDiagnosticSnapshot };

export const HAND_DETECTION_MESSAGES: Record<HandDetectionStatus, string> = {
  idle: 'Activa tu cámara para detectar tus manos',
  loading: 'Inicializando detector de manos...',
  searching: 'Buscando manos...',
  detected: '',
  lost: 'Seguimiento temporalmente perdido',
  'out-of-frame': 'No hay manos visibles en el encuadre',
  error: 'No se pudo inicializar el detector. Inténtalo nuevamente',
};

export function handDetectionMessage(state: HandDetectionState) {
  if (state.status === 'error' && state.error && state.error.phase !== 'initialization') return 'Se interrumpió el seguimiento de manos. Reintenta el detector.';
  return state.status === 'detected'
    ? `${state.handCount} ${state.handCount === 1 ? 'mano detectada' : 'manos detectadas'}${state.missingHands ? ' · otra mano sin seguimiento temporalmente' : ''}`
    : HAND_DETECTION_MESSAGES[state.status];
}

export type CapturedHandFrame = ImageBitmap;
export type InferenceOutput = { result: HandDetectionResult; inferenceMs: number };
export type HandInferenceBackend = {
  kind: 'worker';
  delegate: DetectionDelegate;
  infer: (frame: CapturedHandFrame, timestamp: number) => Promise<InferenceOutput>;
  close: () => void;
  diagnostics?: () => { mismatchedResponses: number };
};
export type BackendOptions = { profile: HandDetectionProfile };
export type HandCaptureConfiguration = {
  delegate: DetectionDelegate;
  profile: HandDetectionProfile;
  runningMode: 'VIDEO';
  numHands: 2;
  minHandDetectionConfidence: number;
  minHandPresenceConfidence: number;
  minTrackingConfidence: number;
  processingWidth: number;
  processingHeight: number;
  cameraWidth: number;
  cameraHeight: number;
  cameraFrameRate: number | null;
  inputMirrored: false;
};
/** Emitted once per accepted Worker inference, independently of visual retention/redraws. */
export type FreshHandInference = {
  source: 'worker';
  inferenceTimestampMs: number;
  capturedAtMs: number;
  receivedAtMs: number;
  result: HandDetectionResult;
  configuration: HandCaptureConfiguration;
};
export type HandDiagnosticSnapshot = {
  elapsedSeconds: number;
  cameraFps: number | null;
  inferenceFps: number | null;
  averageLatencyMs: number | null;
  maximumLatencyMs: number | null;
  averageInferenceMs: number | null;
  recoveryMs: number | null;
  detectionLosses: number;
  handCount: number;
  droppedFrames: number;
  staleResults: number;
  delegate: DetectionDelegate | null;
  backend: HandInferenceBackend['kind'] | null;
  processingWidth: number;
  processingHeight: number;
  cameraWidth: number | null;
  cameraHeight: number | null;
  configuredCameraFps: number | null;
  cameraFpsSource: 'video-callback' | 'playback-quality' | 'sampled';
  profile: HandDetectionProfile;
  acceptedFps: number | null;
  inferenceCount: number;
  acceptedFrames: number;
  emptyModelFrames: number;
  emptyAcceptedFrames: number;
  rawHandCount: number | null;
  handednessScores: { label: string; score: number }[];
  detectionRecoveries: number;
  lastTrackingEvent: 'none' | 'detection' | 'loss' | 'recovery';
  staleByAge: number;
  staleByOrder: number;
  pausedResults: number;
  expiredCaptures: number;
  skippedCameraFrames: number;
  supersededFrames: number;
  throttledFrames: number;
  mismatchedResponses: number;
  freshnessExpirations: number;
  visualHolds: number;
  canvasDraws: number;
  failures: number;
  lastError: HandDetectionFailure | null;
  trackingStatus: HandDetectionStatus;
  visualState: 'none' | 'live' | 'held';
  lossReason: 'model-empty' | 'result-gap' | 'partial' | null;
  lastAcceptedAgeMs: number | null;
};
