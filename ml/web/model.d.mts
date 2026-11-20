import type { LiveInference, PreparedWindow, WindowReason } from './features.mjs';

export const MODEL_FORMAT: string;
export type ModelDecision = {
  labelId: string | null;
  reason: WindowReason | 'negative-class' | 'low-confidence' | 'low-margin' | null;
  scores: number[];
  confidence?: number;
  margin?: number;
};
export type Predictor = {
  scores(features: number[]): number[];
  classify(window: PreparedWindow): ModelDecision;
  live(): { push(event: LiveInference, nowMs?: number): boolean; reset(): void; predict(nowMs?: number): ModelDecision };
};
export function createPredictor(document: unknown): Predictor;
