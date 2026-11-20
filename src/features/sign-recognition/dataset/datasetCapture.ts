import type { FreshHandInference } from '../types';
import { expectedHandsMatch, signConfigurationErrors } from './signCatalog.ts';
import { calculateQuality, workerResultFrame } from './datasetValidation.ts';
import type { CountdownSeconds } from './countdownPreferences';
import { CAPTURE_DEFAULTS, CONSENT_VERSION, MODEL_METADATA, type CaptureIncident, type DatasetFrame, type DatasetParticipant, type DatasetSample, type DatasetSign } from './datasetTypes.ts';

export type DatasetCapturePhase = 'idle' | 'countdown' | 'recording' | 'finishing' | 'review';
export type CaptureSelection = { participant: DatasetParticipant; sign: DatasetSign; repetition: number; sessionConsent: boolean };
type Clock = { now: () => number; isoNow: () => string; id: () => string };
export type DatasetCaptureView = { phase: DatasetCapturePhase; countdownRemainingMs: number; elapsedMs: number; frameCount: number; warning: string; draft: DatasetSample | null };

/** Collects only the fresh-inference channel. It has no camera, model or persistence of its own. */
export class DatasetCapture {
  private clock: Clock;
  private phase: DatasetCapturePhase = 'idle';
  private selection: CaptureSelection | null = null;
  private frames: DatasetFrame[] = [];
  private incidents: CaptureIncident[] = [];
  private startAt = 0;
  private endAt = 0;
  private recordedAt = '';
  private lastInferenceTimestamp = -Infinity;
  private lastCapturedAt = -Infinity;
  private configuration: FreshHandInference['configuration'] | null = null;
  private draft: DatasetSample | null = null;
  private warning = '';
  private gapActive = false;

  constructor(clock: Clock = { now: () => performance.now(), isoNow: () => new Date().toISOString(), id: () => `sample-${crypto.randomUUID()}` }) { this.clock = clock; }

  start(selection: CaptureSelection, countdownSeconds: CountdownSeconds = 0) {
    if (this.phase !== 'idle') throw new Error('Revisa o descarta la captura anterior antes de iniciar otra.');
    if (!selection.sessionConsent || !selection.participant.consentedAt || selection.participant.consentVersion !== CONSENT_VERSION) throw new Error('Confirma el consentimiento de esta persona para la sesión.');
    const errors = signConfigurationErrors(selection.sign);
    if (errors.length) throw new Error(errors.join(' '));
    this.selection = structuredClone(selection);
    this.frames = []; this.incidents = []; this.configuration = null; this.draft = null; this.warning = '';
    this.lastInferenceTimestamp = -Infinity; this.lastCapturedAt = -Infinity; this.gapActive = false;
    const delayMs = countdownSeconds * 1000;
    this.startAt = this.clock.now() + delayMs;
    this.endAt = this.startAt + selection.sign.durationMs;
    this.recordedAt = new Date(Date.parse(this.clock.isoNow()) + delayMs).toISOString();
    this.phase = delayMs ? 'countdown' : 'recording';
  }

  advance() {
    const now = this.clock.now();
    if (this.phase === 'countdown' && now >= this.startAt) this.phase = 'recording';
    if (this.phase === 'recording') {
      const last = Number.isFinite(this.lastCapturedAt) ? this.lastCapturedAt : this.startAt;
      if (now - last > 250 && !this.gapActive && now < this.endAt) {
        this.incidents.push({ timestampMs: now - this.startAt, type: 'result-gap' });
        this.warning = 'No están llegando resultados frescos. Revisa o repite la muestra.';
        this.gapActive = true;
      }
      if (now >= this.endAt) this.phase = 'finishing';
    }
    // Briefly drain real in-flight results whose capture belongs to the recording interval.
    if (this.phase === 'finishing' && now >= this.endAt + CAPTURE_DEFAULTS.maxFreshAgeMs) this.finish();
    return this.view();
  }

  accept(event: FreshHandInference): boolean {
    this.advance();
    if (!['recording', 'finishing'].includes(this.phase) || !this.selection) return false;
    const now = this.clock.now();
    if (event.source !== 'worker' || ![event.capturedAtMs, event.receivedAtMs, event.inferenceTimestampMs].every(Number.isFinite)
      || event.capturedAtMs < this.startAt || event.capturedAtMs >= this.endAt || event.inferenceTimestampMs < event.capturedAtMs || event.receivedAtMs < event.inferenceTimestampMs
      || event.receivedAtMs > now + 1 || now - event.capturedAtMs > CAPTURE_DEFAULTS.maxFreshAgeMs) return false;
    if (event.inferenceTimestampMs <= this.lastInferenceTimestamp || event.capturedAtMs <= this.lastCapturedAt) {
      const duplicate = event.inferenceTimestampMs === this.lastInferenceTimestamp || event.capturedAtMs === this.lastCapturedAt;
      this.incidents.push({ timestampMs: event.capturedAtMs - this.startAt, type: duplicate ? 'duplicate-timestamp' : 'out-of-order-timestamp' });
      this.warning = duplicate ? 'Se rechazó un resultado con timestamp repetido.' : 'Se rechazó un resultado con timestamp desordenado.';
      return false;
    }
    const frame = workerResultFrame(event.result, event.capturedAtMs - this.startAt);
    if (!frame) {
      this.incidents.push({ timestampMs: event.capturedAtMs - this.startAt, type: 'invalid-result' });
      this.warning = 'Se descartó un resultado de estructura inválida.';
      return false;
    }
    const previousCount = this.frames.at(-1)?.handCount;
    if (!expectedHandsMatch(this.selection.sign, frame.handCount) && previousCount !== frame.handCount) {
      this.incidents.push({ timestampMs: frame.timestampMs, type: 'hand-count-mismatch' });
      this.warning = 'No se detectan todas las manos esperadas. La incidencia quedará registrada.';
    } else if (expectedHandsMatch(this.selection.sign, frame.handCount)) this.warning = '';
    frame.sourceTimestamps = { capturedAtMs: event.capturedAtMs, inferenceTimestampMs: event.inferenceTimestampMs, receivedAtMs: event.receivedAtMs };
    this.configuration ??= structuredClone(event.configuration);
    this.lastInferenceTimestamp = event.inferenceTimestampMs;
    this.lastCapturedAt = event.capturedAtMs;
    this.gapActive = false;
    this.frames.push(frame);
    return true;
  }

  private finish() {
    if (!this.selection) return;
    if (!this.configuration || this.frames.length === 0) { this.cancel('No se recibieron resultados frescos; no se creó ninguna muestra.'); return; }
    const { participant, sign, repetition } = this.selection;
    this.draft = { sampleId: this.clock.id(), labelId: sign.id, participantId: participant.id, repetition,
      recordedAt: this.recordedAt, durationMs: sign.durationMs, frames: this.frames, incidents: this.incidents,
      qualityMetrics: calculateQuality(this.frames, sign.durationMs, sign.expectedHands,
        { incidents: this.incidents, completed: true, requestedDurationMs: sign.durationMs }), reviewStatus: 'pending',
      captureMetadata: { configuration: this.configuration, model: structuredClone(MODEL_METADATA), labelSnapshot: sign,
        consentedAt: participant.consentedAt!, consentVersion: CONSENT_VERSION, requestedDurationMs: sign.durationMs, completed: true,
        qualityPolicyVersion: 2, recordingStartedAtMs: this.startAt, coordinates: 'mediapipe-original', visualMirrored: true } };
    this.phase = 'review';
  }

  cancel(message = '') {
    this.phase = 'idle'; this.selection = null; this.frames = []; this.incidents = []; this.draft = null;
    this.configuration = null; this.warning = message;
  }

  view(): DatasetCaptureView {
    const now = this.clock.now();
    return { phase: this.phase,
      countdownRemainingMs: this.phase === 'countdown' ? Math.max(0, this.startAt - now) : 0,
      elapsedMs: ['recording', 'finishing', 'review'].includes(this.phase) ? Math.max(0, Math.min(this.endAt, now) - this.startAt) : 0,
      frameCount: this.frames.length, warning: this.warning, draft: this.draft };
  }
}
