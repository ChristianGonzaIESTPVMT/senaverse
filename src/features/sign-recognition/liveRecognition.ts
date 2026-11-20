import { createLiveWindow, type LiveInference } from '../../../ml/web/features.mjs';
import { LAB_SIGNS_BY_ID, type LabModel } from './labModel.ts';

export const RECOGNITION_STATES = {
  off: 'Cámara desactivada',
  searching: 'Buscando manos',
  collecting: 'Recopilando información',
  analyzing: 'Analizando seña',
  recognized: 'Seña reconocida',
  unknown: 'Gesto no reconocido',
  tracking: 'Seguimiento insuficiente',
} as const;

type Status = keyof typeof RECOGNITION_STATES;
type Rejection = 'low-score' | 'low-margin' | 'hand-count' | 'coverage' | 'stale';
type Score = { id: string; name: string; score: number };
export type RecognitionSettings = {
  frequencyHz: number;
  score: number;
  margin: number;
  handRatio: number;
  confirmMs: number;
  switchMs: number;
  releaseMs: number;
};
export type RecognitionSnapshot = {
  status: Status;
  reason: Rejection | null;
  stableId: string | null;
  top: Score[];
  hands: number;
  window: { frames: number; spanMs: number };
  handRatio: number | null;
  margin: number | null;
  classifierMs: number | null;
  captureToDecisionMs: number | null;
};

export const initialRecognition = (status: Status = 'off'): RecognitionSnapshot => ({
  status, reason: null, stableId: null, top: [], hands: 0, window: { frames: 0, spanMs: 0 }, handRatio: null,
  margin: null, classifierMs: null, captureToDecisionMs: null,
});

export function recognitionDefaults(model: LabModel): RecognitionSettings {
  return { frequencyHz: 10, score: model.thresholds.confidence, margin: model.thresholds.margin, handRatio: .8,
    confirmMs: 180, switchMs: 300, releaseMs: 180 };
}

export function directedOutcome(snapshot: RecognitionSnapshot, target: string) {
  if (snapshot.status === 'recognized' && snapshot.stableId) return snapshot.stableId === target ? 'matched' : 'different';
  return snapshot.status === 'unknown' ? 'unknown' : 'waiting';
}

/** Causal, single-consumer recognizer. Only a new Worker result may generate a vote. */
export function createRecognitionSession(model: LabModel, clock = () => performance.now()) {
  const config = model.preprocessing;
  const buffer = createLiveWindow(config);
  let settings = recognitionDefaults(model);
  let running = false;
  let last: { captured: number; inference: number; geometry: string; hands: number } | null = null;
  let lastAnalysis = -Infinity;
  let lastProgress = -Infinity;
  let stableId: string | null = null;
  let stableAt = -Infinity;
  let candidate: { id: string; since: number; observations: number; requiredMs: number } | null = null;

  function clearDecision() {
    stableId = null;
    stableAt = -Infinity;
    candidate = null;
  }

  function clearWindow() {
    buffer.reset();
    clearDecision();
    lastAnalysis = -Infinity;
    lastProgress = -Infinity;
  }

  function reset(status: Status = running ? 'searching' : 'off') {
    last = null;
    clearWindow();
    return initialRecognition(status);
  }

  function stabilize(id: string | null, at: number): Status {
    if (stableId && at - stableAt > settings.releaseMs && !id) stableId = null;
    if (!id) {
      candidate = null;
      return 'unknown';
    }
    if (id === stableId) {
      candidate = null;
      stableAt = at;
      return 'recognized';
    }
    if (candidate?.id !== id) {
      candidate = { id, since: at, observations: 0, requiredMs: stableId ? settings.switchMs : settings.confirmMs };
    }
    candidate.observations++;
    if (stableId && at - stableAt > settings.releaseMs) stableId = null;
    if (candidate.observations < 2 || at - candidate.since < candidate.requiredMs) return 'analyzing';
    stableId = id;
    stableAt = at;
    candidate = null;
    return 'recognized';
  }

  function observe(event: LiveInference, now = clock()): RecognitionSnapshot | null {
    if (!running || (last && (event.capturedAtMs <= last.captured || event.inferenceTimestampMs <= last.inference))) return null;
    if (!buffer.push(event, now)) return null;
    const at = event.capturedAtMs;
    const { processingWidth, processingHeight, profile } = event.configuration;
    const geometry = [processingWidth, processingHeight, profile].join('/');
    const discontinuity = last && (at - last.captured > config.maxGapMs || geometry !== last.geometry);
    const hands = event.result.landmarks.length;
    const hadHands = last?.hands;
    last = { captured: at, inference: event.inferenceTimestampMs, geometry, hands };
    if (hands === 0) {
      clearWindow();
      return hadHands === 0 ? null : initialRecognition('searching');
    }
    if (discontinuity) {
      clearWindow();
      buffer.push(event, now);
    }
    const window = buffer.summary();
    const lostExpectedHands = stableId !== null && LAB_SIGNS_BY_ID.get(stableId)?.expectedHands !== hands;
    if (lostExpectedHands) clearDecision();
    if (window.spanMs < config.windowMs) {
      if (now - lastProgress < 100) return null;
      lastProgress = now;
      return { ...initialRecognition('collecting'), hands, window };
    }
    if (at - lastAnalysis < 1000 / settings.frequencyHz) {
      return lostExpectedHands ? { ...initialRecognition('tracking'), reason: 'hand-count', hands, window } : null;
    }
    lastAnalysis = at;
    const started = clock();
    const prepared = buffer.read(now);
    if (!prepared.features || !prepared.handCounts) {
      clearDecision();
      return { ...initialRecognition('tracking'), reason: 'coverage', hands, window };
    }
    // The published predictor owns scaling and the SVM. Apply the laboratory policy to its raw scores.
    const scores = model.predictor.scores(prepared.features);
    const ended = clock();
    if (ended - at > config.maxFreshAgeMs) {
      clearDecision();
      return { ...initialRecognition('tracking'), reason: 'stale', hands, window };
    }
    if (!scores.every(Number.isFinite)) {
      clearDecision();
      return { ...initialRecognition('tracking'), reason: 'coverage', hands, window };
    }
    const top = model.labels.map(({ id, name }, i) => ({ id, name, score: scores[i] }))
      .sort((a, b) => b.score - a.score).slice(0, 3);
    const [winner, next] = top;
    const expected = LAB_SIGNS_BY_ID.get(winner.id)?.expectedHands;
    const handRatio = expected ? prepared.handCounts[expected] / config.steps : 0;
    const margin = winner.score - next.score;
    const reason: Rejection | null = expected !== hands || handRatio < settings.handRatio ? 'hand-count'
      : winner.score < settings.score ? 'low-score' : margin < settings.margin ? 'low-margin' : null;
    const status = reason === 'hand-count' ? 'tracking' : stabilize(reason ? null : winner.id, at);
    if (reason === 'hand-count') clearDecision();
    return { status, reason, stableId, top, hands, window, handRatio, margin,
      classifierMs: Math.max(0, ended - started), captureToDecisionMs: Math.max(0, clock() - at) };
  }

  return {
    start() { running = true; return reset(); },
    stop() { running = false; return reset(); },
    reset: () => reset(),
    interrupt: () => reset(running ? 'tracking' : 'off'),
    configure(next: RecognitionSettings) { settings = { ...next }; return reset(); },
    observe,
    expire(now = clock()): RecognitionSnapshot | null {
      if (!running || !last || now - last.captured <= config.maxFreshAgeMs || !buffer.summary().frames) return null;
      clearWindow();
      return { ...initialRecognition('tracking'), reason: 'stale' };
    },
  };
}
