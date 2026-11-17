import type { HandDiagnosticSnapshot } from './types.ts';

type Sample = { at: number; count: number };
const WINDOW_MS = 2000;

export class HandPerformanceMetrics {
  private cameraSamples: Sample[] = [];
  private inferenceSamples: Sample[] = [];
  private firstCameraAt: number | null = null;
  private firstInferenceAt: number | null = null;
  private latencySum = 0;
  private inferenceSum = 0;
  private inferenceCount = 0;
  private maximumLatency: number | null = null;
  private lastHandCount = 0;
  private lostAt: number | null = null;
  private recoveryTarget = 0;
  private lastRecovery: number | null = null;
  private losses = 0;
  droppedFrames = 0;
  staleResults = 0;

  private startedAt: number;
  constructor(startedAt: number) { this.startedAt = startedAt; }

  cameraFrame(now: number, count: number) {
    this.firstCameraAt ??= now;
    this.cameraSamples.push({ at: now, count });
    this.cameraSamples = this.cameraSamples.filter(sample => sample.at > now - WINDOW_MS);
  }

  inference(now: number, latencyMs: number, inferenceMs: number) {
    this.firstInferenceAt ??= now;
    this.inferenceSamples.push({ at: now, count: 1 });
    this.inferenceSamples = this.inferenceSamples.filter(sample => sample.at > now - WINDOW_MS);
    this.inferenceCount++;
    this.latencySum += latencyMs;
    this.inferenceSum += inferenceMs;
    this.maximumLatency = Math.max(this.maximumLatency ?? 0, latencyMs);
  }

  hands(count: number, capturedAt: number) {
    if (this.lostAt !== null && count >= this.recoveryTarget) {
      this.lastRecovery = capturedAt - this.lostAt;
      this.lostAt = null;
    }
    if (count < this.lastHandCount && this.lostAt === null) {
      this.lostAt = capturedAt;
      this.recoveryTarget = this.lastHandCount;
      this.losses++;
    }
    this.lastHandCount = count;
  }

  snapshot(now: number): Pick<HandDiagnosticSnapshot, 'elapsedSeconds' | 'cameraFps' | 'inferenceFps' | 'averageLatencyMs' | 'maximumLatencyMs' | 'averageInferenceMs' | 'recoveryMs' | 'detectionLosses' | 'droppedFrames' | 'staleResults'> {
    const fps = (samples: Sample[], first: number | null) => first === null || now - first < 1000 ? null
      : samples.filter(sample => sample.at > now - WINDOW_MS).reduce((count, sample) => count + sample.count, 0) / (Math.min(WINDOW_MS, now - first) / 1000);
    return { elapsedSeconds: (now - this.startedAt) / 1000,
      cameraFps: fps(this.cameraSamples, this.firstCameraAt), inferenceFps: fps(this.inferenceSamples, this.firstInferenceAt),
      averageLatencyMs: this.inferenceCount ? this.latencySum / this.inferenceCount : null,
      maximumLatencyMs: this.maximumLatency,
      averageInferenceMs: this.inferenceCount ? this.inferenceSum / this.inferenceCount : null,
      recoveryMs: this.lastRecovery, detectionLosses: this.losses, droppedFrames: this.droppedFrames, staleResults: this.staleResults };
  }
}
