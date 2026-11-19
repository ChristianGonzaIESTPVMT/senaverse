import type { Category } from '@mediapipe/tasks-vision';
import type { HandCaptureConfiguration } from '../types';
import { MAX_RESULT_AGE_MS } from '../config.ts';

export type SignSourceReference = { title: string; publisher: string; year: number; page: number; repositoryUrl: string };
export type DatasetSign = {
  id: string; name: string; description: string; type: 'static' | 'dynamic'; expectedHands: 0 | 1 | 2;
  durationMs: number; instructions: string; referenceUrl: string; validationStatus: 'unconfigured' | 'pending' | 'validated' | 'not-applicable';
  /** Absent on legacy labels: their identity and linguistic status must be preserved. */
  category?: 'lsp' | 'negative'; sourceReference?: SignSourceReference;
};
export type DatasetParticipant = { id: string; createdAt: string; consentedAt: string | null; consentVersion: number | null };
export type DatasetPoint = { x: number; y: number; z: number };
export type DatasetHand = { handedness: Category[]; landmarks: DatasetPoint[]; worldLandmarks?: DatasetPoint[] };
export type DatasetFrame = { timestampMs: number; handCount: number; hands: DatasetHand[];
  sourceTimestamps?: { capturedAtMs: number; inferenceTimestampMs: number; receivedAtMs: number } };
export type CaptureIncident = { timestampMs: number; type: 'hand-count-mismatch' | 'result-gap' | 'invalid-result' | 'duplicate-timestamp' | 'out-of-order-timestamp'; };
export type QualityMetrics = {
  frameCount: number; validLandmarkFrames: number; expectedHandFrames: number; expectedHandsRatio: number;
  observedDurationMs: number; averageFps: number; minimumHands: number; maximumHands: number;
  trackingLosses: number; warnings: string[]; sufficient: boolean;
};
export type ModelMetadata = {
  package: string; packageVersion: string; task: string; model: string; modelVersion: string; quantization: string; sha256: string;
};
export type DatasetCaptureMetadata = {
  configuration: HandCaptureConfiguration;
  model: ModelMetadata;
  labelSnapshot: DatasetSign;
  consentedAt: string;
  consentVersion: number;
  requestedDurationMs: number;
  completed: true;
  /** Optional additions keep historical samples and their quality metrics unchanged. */
  qualityPolicyVersion?: 2;
  recordingStartedAtMs?: number;
  coordinates?: 'mediapipe-original';
  visualMirrored?: true;
};
export type DatasetSample = {
  sampleId: string; labelId: string; participantId: string; repetition: number; recordedAt: string;
  durationMs: number; frames: DatasetFrame[]; incidents: CaptureIncident[]; qualityMetrics: QualityMetrics;
  captureMetadata: DatasetCaptureMetadata; reviewStatus: 'pending' | 'accepted' | 'rejected';
};
export type SampleSummary = Omit<DatasetSample, 'frames'>;
export type CaptureDefaults = { staticDurationMs: number; dynamicDurationMs: number; countdownMs: number;
  minimumFps: number; minimumFrames: number; minimumExpectedHandsRatio: number; minimumCoverageRatio: number; maxFreshAgeMs: number;
  timestamps: 'milliseconds-relative-to-recording-start'; inputMirrored: false };
export type DatasetMeta = { datasetId: string; createdAt: string; schemaVersion: 1; nextParticipantNumber: number; captureConfiguration: CaptureDefaults; mediaPipeModel: ModelMetadata };
export type DatasetSnapshot = { meta: DatasetMeta; participants: DatasetParticipant[]; signs: DatasetSign[]; samples: SampleSummary[] };
export type DatasetDocument = DatasetMeta & { exportType: 'dataset' | 'backup'; collectedAt: string | null; exportedAt: string;
  participants: DatasetParticipant[]; signs: DatasetSign[]; samples: DatasetSample[] };

export const CONSENT_VERSION = 1;
export const DATASET_SCHEMA_VERSION = 1;
export const DATASET_DATABASE_NAME = 'senaverse-dataset-studio';
export const MODEL_METADATA: ModelMetadata = {
  package: '@mediapipe/tasks-vision', packageVersion: '1.2.3', task: 'HandLandmarker', model: 'Hand Landmarker Full',
  modelVersion: '1', quantization: 'float16', sha256: 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1',
};
export const CAPTURE_DEFAULTS: CaptureDefaults = {
  staticDurationMs: 1500, dynamicDurationMs: 2500, countdownMs: 3000,
  minimumFps: 10, minimumFrames: 8, minimumExpectedHandsRatio: 0.8, minimumCoverageRatio: 0.7,
  maxFreshAgeMs: MAX_RESULT_AGE_MS, timestamps: 'milliseconds-relative-to-recording-start', inputMirrored: false,
};
export const MIN_RECORDING_MS = 500;
export const MAX_RECORDING_MS = 10000;
export const MAX_IMPORT_BYTES = 100 * 1024 * 1024;
