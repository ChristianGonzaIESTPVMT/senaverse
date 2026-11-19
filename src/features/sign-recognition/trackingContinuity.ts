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
  private lossReason: 'model-empty' | 'result-gap' | 'partial' | null = null;

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
    this.lossReason = this.observedCount > 0 ? (this.observedCount < this.expectedCount ? 'partial' : null) : this.hadHands ? 'model-empty' : null;
    return this.view(now);
  }

  view(now: number) {
    if (this.observedCount > 0 && now - this.capturedAt >= MAX_RESULT_AGE_MS) {
      this.observedCount = 0;
      this.lostAt = this.capturedAt + MAX_RESULT_AGE_MS;
      this.lossReason = 'result-gap';
    }
    const lossDuration = this.lostAt === null ? 0 : now - this.lostAt;
    const missing = Math.max(0, this.expectedCount - this.observedCount);
    const state: HandDetectionState = this.observedCount > 0
      ? { status: 'detected', handCount: this.observedCount, ...(missing && lossDuration < TEMPORARY_LOSS_MS ? { missingHands: missing } : {}) }
      : { status: !this.hadHands ? 'searching' : this.lostAt !== null && lossDuration >= TEMPORARY_LOSS_MS ? 'out-of-frame' : 'lost', handCount: 0 };
    const held = this.observedCount === 0 && this.lostAt !== null && lossDuration < LOST_OVERLAY_HOLD_MS;
    // The capture admission limit and the visual hold are distinct. Expiry must
    // first become an attenuated loss, never an immediate blank or a new detection.
    const visible = this.lastValid && (this.observedCount > 0
      ? now - this.capturedAt < MAX_RESULT_AGE_MS
      : held && now - this.capturedAt < MAX_RESULT_AGE_MS + LOST_OVERLAY_HOLD_MS);
    const transitions = [
      ...(visible ? [this.capturedAt + (held ? MAX_RESULT_AGE_MS + LOST_OVERLAY_HOLD_MS : MAX_RESULT_AGE_MS)] : []),
      ...(held ? [this.lostAt! + LOST_OVERLAY_HOLD_MS] : []),
      ...(this.lostAt !== null ? [this.lostAt + TEMPORARY_LOSS_MS] : []),
    ].filter(at => at > now);
    return { state, result: visible ? this.lastValid : null, opacity: held ? 0.45 : 1, lossReason: this.lossReason,
      nextChangeMs: transitions.length ? Math.min(...transitions) - now : null };
  }
}
