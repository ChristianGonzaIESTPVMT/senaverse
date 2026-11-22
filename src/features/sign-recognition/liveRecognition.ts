import { createLiveWindow, type LiveInference } from '../../../ml/web/features.mjs';
import { passesMovement } from '../../../ml/web/movement.mjs';
import { NEGATIVE_CATEGORY_ID } from './dataset/signCatalog.ts';
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
type Rejection = 'low-score' | 'low-margin' | 'hand-count' | 'coverage' | 'stale' | 'negative-class' | 'movement' | 'laterality';
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
  side?: 'Left' | 'Right' | null;
  canonical?: boolean;
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

function rankedScores(model: LabModel, features: number[]) {
  const scores = model.predictor.scores(features);
  if (scores.length !== model.labels.length || !scores.every(Number.isFinite)) return [];
  return scores.map((score, i) => ({ ...model.labels[i], score }))
    .sort((a, b) => b.score - a.score).slice(0, 3);
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
    const hands = event.result.landmarks.length;
    const discontinuity = last && (at - last.captured > config.maxGapMs || geometry !== last.geometry
      || (model.policy && hands !== last.hands));
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
    const prepared = buffer.read(now, !!model.policy);
    if (!prepared.features || !prepared.handCounts) {
      clearDecision();
      return { ...initialRecognition(model.policy ? 'unknown' : 'tracking'), reason: 'coverage', hands, window };
    }
    const canonicalTop = prepared.canonicalFeatures ? rankedScores(model, prepared.canonicalFeatures) : null;
    const canonical = !!canonicalTop?.length && LAB_SIGNS_BY_ID.get(canonicalTop[0].id)?.type === 'static';
    const top = canonical ? canonicalTop : rankedScores(model, prepared.features);
    const ended = clock();
    if (ended - at > config.maxFreshAgeMs) {
      clearDecision();
      return { ...initialRecognition('tracking'), reason: 'stale', hands, window };
    }
    if (top.length < 2) {
      clearDecision();
      return { ...initialRecognition('tracking'), reason: 'coverage', hands, window };
    }
    const [winner, next] = top;
    const sign = LAB_SIGNS_BY_ID.get(winner.id);
    const expected = sign?.expectedHands;
    const handRatio = expected ? prepared.handCounts[expected] / config.steps : 0;
    const margin = winner.score - next.score;
    const thresholds = model.policy?.byLabel[winner.id];
    const reason: Rejection | null = model.policy && winner.id === NEGATIVE_CATEGORY_ID ? 'negative-class'
      : expected !== hands || handRatio < settings.handRatio ? 'hand-count'
      : model.policy && prepared.side === 'Left' && sign?.type === 'static' && !canonical ? 'laterality'
      : winner.score < Math.max(settings.score, thresholds?.confidence ?? 0) ? 'low-score'
      : margin < Math.max(settings.margin, thresholds?.margin ?? 0) ? 'low-margin'
      : model.policy && !passesMovement(winner.id, prepared.movement) ? 'movement' : null;
    const status = reason === 'hand-count' && !model.policy ? 'tracking' : stabilize(reason ? null : winner.id, at);
    if (reason === 'hand-count' || (model.policy && reason)) clearDecision();
    return { status, reason, stableId, top, hands, window, handRatio, margin,
      ...(model.policy && { side: prepared.side, canonical }),
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
