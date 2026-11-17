import { LOST_OVERLAY_HOLD_MS, MAX_RESULT_AGE_MS, TEMPORARY_LOSS_MS } from './config.ts';
import type { HandDetectionResult, HandDetectionState } from './types.ts';

/** Only retains real landmarks briefly, explicitly marked as lost. Never predicts positions. */
export class HandTrackingContinuity {
  private lastValid: HandDetectionResult | null = null;
  private capturedAt = -Infinity;
  private observedCount = 0;
  private expectedCount = 0;
  private lostAt: number | null = null;
  private hadHands = false;

  observe(result: HandDetectionResult, capturedAt: number, now: number) {
    this.observedCount = result.landmarks.length;
    if (this.observedCount < this.expectedCount && this.lostAt === null) this.lostAt = now;
    if (this.observedCount >= this.expectedCount) {
      this.expectedCount = this.observedCount;
      this.lostAt = null;
    }
    if (this.observedCount > 0) {
      if (this.lostAt !== null && now - this.lostAt >= TEMPORARY_LOSS_MS) {
        this.expectedCount = this.observedCount;
        this.lostAt = null;
      }
      this.hadHands = true;
      this.lastValid = result;
      this.capturedAt = capturedAt;
    }
    return this.view(now);
  }

  view(now: number) {
    if (this.observedCount > 0 && now - this.capturedAt >= MAX_RESULT_AGE_MS) {
      this.observedCount = 0;
      this.lostAt ??= this.capturedAt + MAX_RESULT_AGE_MS;
    }
    const lossDuration = this.lostAt === null ? 0 : now - this.lostAt;
    const missing = Math.max(0, this.expectedCount - this.observedCount);
    const state: HandDetectionState = this.observedCount > 0
      ? { status: 'detected', handCount: this.observedCount, ...(missing && lossDuration < TEMPORARY_LOSS_MS ? { missingHands: missing } : {}) }
      : { status: !this.hadHands ? 'searching' : this.lostAt !== null && lossDuration >= TEMPORARY_LOSS_MS ? 'out-of-frame' : 'lost', handCount: 0 };
    const held = this.observedCount === 0 && this.lostAt !== null && lossDuration < LOST_OVERLAY_HOLD_MS;
    const visible = this.lastValid && now - this.capturedAt < MAX_RESULT_AGE_MS && (this.observedCount > 0 || held);
    const transitions = [
      ...(visible ? [this.capturedAt + MAX_RESULT_AGE_MS] : []),
      ...(held ? [this.lostAt! + LOST_OVERLAY_HOLD_MS] : []),
      ...(this.lostAt !== null ? [this.lostAt + TEMPORARY_LOSS_MS] : []),
    ].filter(at => at > now);
    return { state, result: visible ? this.lastValid : null, opacity: held ? 0.45 : 1,
      nextChangeMs: transitions.length ? Math.min(...transitions) - now : null };
  }
}
