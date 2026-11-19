import type { HandDetectionFailure, HandDetectionResult, HandDiagnosticSnapshot } from './types.ts';
import { getHandLandmarkerOptions, LOST_OVERLAY_HOLD_MS, MAX_RESULT_AGE_MS } from './config.ts';

type Sample = { at: number; count: number };
const WINDOW_MS = 2000;

export class HandPerformanceMetrics {
  private cameraSamples: Sample[] = [];
  private inferenceSamples: Sample[] = [];
  private acceptedSamples: Sample[] = [];
  private firstCameraAt: number | null = null;
  private firstInferenceAt: number | null = null;
  private firstAcceptedAt: number | null = null;
  private latencySum = 0;
  private inferenceSum = 0;
  private inferenceCount = 0;
  private maximumLatency: number | null = null;
  private lastHandCount = 0;
  private lostAt: number | null = null;
  private recoveryTarget = 0;
  private lastRecovery: number | null = null;
  private losses = 0;
  private recoveries = 0;
  private acceptedCount = 0;
  private emptyModelFrames = 0;
  private emptyAcceptedFrames = 0;
  private rawHandCount: number | null = null;
  private handednessScores: HandDiagnosticSnapshot['handednessScores'] = [];
  private lastTrackingEvent: HandDiagnosticSnapshot['lastTrackingEvent'] = 'none';
  droppedFrames = 0;
  staleResults = 0;
  staleByAge = 0;
  staleByOrder = 0;
  pausedResults = 0;
  expiredCaptures = 0;
  skippedCameraFrames = 0;
  supersededFrames = 0;
  throttledFrames = 0;
  freshnessExpirations = 0;
  visualHolds = 0;
  canvasDraws = 0;
  failures = 0;
  lastError: HandDetectionFailure | null = null;

  private startedAt: number;
  constructor(startedAt: number, initialHandCount = 0) { this.startedAt = startedAt; this.lastHandCount = initialHandCount; }

  cameraFrame(now: number, count: number) {
    this.firstCameraAt ??= now;
    this.cameraSamples.push({ at: now, count });
    this.cameraSamples = this.cameraSamples.filter(sample => sample.at > now - WINDOW_MS);
  }

  inference(now: number, latencyMs: number, inferenceMs: number, result?: HandDetectionResult) {
    this.firstInferenceAt ??= now;
    this.inferenceSamples.push({ at: now, count: 1 });
    this.inferenceSamples = this.inferenceSamples.filter(sample => sample.at > now - WINDOW_MS);
    this.inferenceCount++;
    this.latencySum += latencyMs;
    this.inferenceSum += inferenceMs;
    this.maximumLatency = Math.max(this.maximumLatency ?? 0, latencyMs);
    if (result) {
      this.rawHandCount = result.landmarks.length;
      if (this.rawHandCount === 0) this.emptyModelFrames++;
      // These are handedness classification scores, never hand-detection confidence.
      this.handednessScores = (result.handedness ?? []).flatMap(categories => {
        const category = categories[0];
        return category && Number.isFinite(category.score) ? [{ label: category.categoryName, score: category.score }] : [];
      });
    }
  }

  accepted(now: number, count: number, capturedAt: number) {
    this.firstAcceptedAt ??= now;
    this.acceptedSamples.push({ at: now, count: 1 });
    this.acceptedSamples = this.acceptedSamples.filter(sample => sample.at > now - WINDOW_MS);
    this.acceptedCount++;
    if (count === 0) this.emptyAcceptedFrames++;
    this.hands(count, capturedAt);
  }

  hands(count: number, capturedAt: number) {
    if (this.lostAt !== null && count >= this.recoveryTarget) {
      this.lastRecovery = capturedAt - this.lostAt;
      this.lostAt = null;
      this.recoveryTarget = 0;
      this.recoveries++;
      this.lastTrackingEvent = 'recovery';
    }
    if (count < this.lastHandCount) {
      this.lostAt ??= capturedAt;
      this.recoveryTarget = Math.max(this.recoveryTarget, this.lastHandCount);
      this.losses++;
      this.lastTrackingEvent = 'loss';
    } else if (this.lastHandCount === 0 && count > 0 && this.lostAt === null && this.lastTrackingEvent !== 'recovery') {
      this.lastTrackingEvent = 'detection';
    }
    this.lastHandCount = count;
  }

  snapshot(now: number) {
    const fps = (samples: Sample[], first: number | null) => first === null || now - first < 1000 ? null
      : samples.filter(sample => sample.at > now - WINDOW_MS).reduce((count, sample) => count + sample.count, 0) / (Math.min(WINDOW_MS, now - first) / 1000);
    return { elapsedSeconds: (now - this.startedAt) / 1000,
      cameraFps: fps(this.cameraSamples, this.firstCameraAt), inferenceFps: fps(this.inferenceSamples, this.firstInferenceAt),
      averageLatencyMs: this.inferenceCount ? this.latencySum / this.inferenceCount : null,
      maximumLatencyMs: this.maximumLatency,
      averageInferenceMs: this.inferenceCount ? this.inferenceSum / this.inferenceCount : null,
      recoveryMs: this.lastRecovery, detectionLosses: this.losses, detectionRecoveries: this.recoveries,
      lastTrackingEvent: this.lastTrackingEvent, rawHandCount: this.rawHandCount, handednessScores: this.handednessScores,
      inferenceCount: this.inferenceCount, acceptedFrames: this.acceptedCount, emptyModelFrames: this.emptyModelFrames,
      emptyAcceptedFrames: this.emptyAcceptedFrames, acceptedFps: fps(this.acceptedSamples, this.firstAcceptedAt),
      droppedFrames: this.droppedFrames, staleResults: this.staleResults, staleByAge: this.staleByAge, staleByOrder: this.staleByOrder,
      pausedResults: this.pausedResults, expiredCaptures: this.expiredCaptures, skippedCameraFrames: this.skippedCameraFrames,
      supersededFrames: this.supersededFrames, throttledFrames: this.throttledFrames,
      freshnessExpirations: this.freshnessExpirations, visualHolds: this.visualHolds, canvasDraws: this.canvasDraws,
      failures: this.failures, lastError: this.lastError };
  }
}

/** A separate diagnostic artifact: no images, landmarks, samples or inferred false positives. */
export function createHandDiagnosticReport(snapshot: HandDiagnosticSnapshot, context: {
  scenario: string | null; expectedHands: number | null; observedFalsePositives: number | null;
}, exportedAt = new Date().toISOString()) {
  return { schemaVersion: 1, reportType: 'hand-tracking-diagnostics', source: 'runtime-counters', exportedAt,
    context: structuredClone(context), configuration: { ...getHandLandmarkerOptions(snapshot.profile), profile: snapshot.profile,
      maxResultAgeMs: MAX_RESULT_AGE_MS, visualHoldMs: LOST_OVERLAY_HOLD_MS }, snapshot: structuredClone(snapshot),
    confidenceNote: 'MediaPipe expone scores de lateralidad; no expone aquí confianza de detección, presencia o IoU por fotograma.' };
}
