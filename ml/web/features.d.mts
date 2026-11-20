export type FeatureConfig = {
  version: string;
  steps: number;
  bins: number;
  windowMs: number;
  windowStrideMs: number;
  maxGapMs: number;
  maxFreshAgeMs: number;
  minPresenceRatio: number;
};
type Point = { x: number; y: number; z: number };
type Handedness = { categoryName: string; score: number };
type Frame = { timestampMs: number; hands: { landmarks: Point[]; handedness?: Handedness[] }[] };
export type WindowReason = 'insufficient-window' | 'no-hands' | 'stale-or-missing-result';
export type PreparedWindow = {
  features: number[] | null;
  reason: WindowReason | null;
  motion: number;
  handCounts?: [number, number, number];
};
export type LiveInference = {
  source: 'worker';
  capturedAtMs: number;
  inferenceTimestampMs: number;
  receivedAtMs: number;
  configuration: { processingWidth: number; processingHeight: number; inputMirrored: false; profile?: string };
  result: { landmarks: Point[][]; handedness?: Handedness[][] };
};
export type WindowBuffer = {
  push(event: LiveInference, nowMs?: number): boolean;
  read(nowMs?: number): PreparedWindow;
  reset(): void;
  summary(): { frames: number; spanMs: number };
};
export const FEATURE_CONFIG: Readonly<FeatureConfig>;
export function featureCount(config: FeatureConfig): number;
export function checkFeatureConfig(config: unknown): asserts config is FeatureConfig;
export function recordedWindow(frames: Frame[], aspect: number, config?: FeatureConfig): PreparedWindow;
export function trailingWindow(frames: Frame[], aspect: number, config?: FeatureConfig): PreparedWindow;
export function createLiveWindow(config?: FeatureConfig): WindowBuffer;
