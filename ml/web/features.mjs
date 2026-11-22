/** Shared by offline training and the browser. Uses unmirrored MediaPipe image landmarks. */
import { movementEvidence } from './movement.mjs';

export const FEATURE_CONFIG = Object.freeze({
  version: 'lsp-geometry-1',
  steps: 24,
  bins: 4,
  windowMs: 1350,
  windowStrideMs: 180,
  maxGapMs: 150,
  maxFreshAgeMs: 120,
  minPresenceRatio: 0.6,
});

const FINGERS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const TIP_PAIRS = [[4, 8], [4, 12], [4, 16], [4, 20], [8, 12], [8, 20]];
const POSE_DIMENSIONS = 37;
const HAND_BIN_DIMENSIONS = 14;
const PAIR_BIN_DIMENSIONS = 5;
const PALM_FLOOR = 1e-5;
const ZERO = [0, 0, 0];

export function featureCount(config) {
  return 2 * (2 * POSE_DIMENSIONS + 3 + HAND_BIN_DIMENSIONS * config.bins) + PAIR_BIN_DIMENSIONS * config.bins;
}

export function checkFeatureConfig(config) {
  if (config?.version !== FEATURE_CONFIG.version || ![24, 32].includes(config.steps)
      || config.bins !== FEATURE_CONFIG.bins
      || !['windowMs', 'windowStrideMs', 'maxGapMs', 'maxFreshAgeMs', 'minPresenceRatio']
        .every(key => config[key] === FEATURE_CONFIG[key])) {
    throw new TypeError('Configuración de preprocesamiento incompatible.');
  }
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function divide(v, divisor) {
  return v.map(n => n / divisor);
}

function length(v) {
  return Math.hypot(...v);
}

function direction(v) {
  return divide(v, Math.max(length(v), PALM_FLOOR));
}

function cosine(a, b) {
  const unit = direction(b);
  return direction(a).reduce((dot, value, i) => dot + value * unit[i], 0);
}

function palmSize(points) {
  return Math.max(PALM_FLOOR, (length(subtract(points[9], points[0])) + length(subtract(points[17], points[5]))) / 2);
}

function pose(points, scale) {
  const wrist = points[0];
  const tips = FINGERS.flatMap(finger => divide(subtract(points[finger[3]], wrist), scale));
  const bends = FINGERS.flatMap(([a, b, c, d]) => [
    cosine(subtract(points[a], points[b]), subtract(points[c], points[b])),
    cosine(subtract(points[b], points[c]), subtract(points[d], points[c])),
  ]);
  const distances = TIP_PAIRS.map(([a, b]) => length(subtract(points[a], points[b])) / scale);
  const orientation = [...direction(subtract(points[9], wrist)), ...direction(subtract(points[17], points[5]))];
  return [...tips, ...bends, ...distances, ...orientation];
}

function mean(rows, dimensions) {
  const sum = Array(dimensions).fill(0);
  for (const row of rows) {
    row.forEach((value, i) => { sum[i] += value; });
  }
  return divide(sum, rows.length || 1);
}

function geometry(frame, aspect) {
  return frame.hands.map(hand => {
    const handedness = Array.isArray(hand.handedness) ? hand.handedness : [];
    const best = handedness.reduce((best, item) => item?.score > (best?.score ?? 0) ? item : best, null);
    return {
      points: hand.landmarks.map(({ x, y, z }) => [x * aspect, y, z * aspect]),
      side: best?.score >= .8 && ['Left', 'Right'].includes(best.categoryName) ? best.categoryName : null,
    };
  }).sort((a, b) => a.points[0][0] - b.points[0][0]);
}

function associationCost(hand, track, time, maxGap) {
  if (!track || time - track.time > maxGap) return .32;
  const horizon = track.previous ? Math.min(2, (time - track.time) / (track.time - track.previous.time)) : 0;
  const wrist = hand.points[0];
  const predicted = track.previous
    ? track.wrist.map((position, i) => position + horizon * (position - track.previous.wrist[i]))
    : track.wrist;
  const sidePenalty = hand.side && track.side && hand.side !== track.side ? .02 : 0;
  return Math.hypot(wrist[0] - predicted[0], wrist[1] - predicted[1]) + sidePenalty;
}

function trackFrames(frames, aspect, config) {
  const tracks = [null, null];
  let epoch = 0;
  return frames.map(frame => {
    const hands = geometry(frame, aspect);
    const timestamp = frame.timestampMs;
    const cost = (hand, slot) => associationCost(hand, tracks[slot], timestamp, config.maxGapMs);
    const reverseCost = hands.length === 2 ? cost(hands[0], 1) + cost(hands[1], 0) : null;
    const directCost = hands.length === 2 ? cost(hands[0], 0) + cost(hands[1], 1) : null;
    const slots = [null, null];
    hands.forEach((hand, i) => {
      const slot = hands.length === 2 ? (reverseCost < directCost ? 1 - i : i) : (cost(hand, 1) < cost(hand, 0) ? 1 : 0);
      const previous = tracks[slot];
      const wrist = hand.points[0];
      const linked = previous && timestamp - previous.time <= config.maxGapMs
        && Math.hypot(wrist[0] - previous.wrist[0], wrist[1] - previous.wrist[1]) <= .32;
      const id = linked ? previous.id : ++epoch;
      tracks[slot] = { id, wrist, time: timestamp, side: hand.side, previous: linked ? { wrist: previous.wrist, time: previous.time } : null };
      slots[slot] = { id, points: hand.points, side: hand.side };
    });
    return { slots, timestamp };
  });
}

function interpolate(a, b, fraction) {
  return a.map((point, i) => point.map((value, axis) => value + fraction * (b[i][axis] - value)));
}

function resample(tracked, end, config) {
  const interval = config.windowMs / (config.steps - 1);
  let cursor = 0;
  return Array.from({ length: config.steps }, (_, i) => {
    const timestamp = i === config.steps - 1 ? end : end - config.windowMs + i * interval;
    while (cursor + 1 < tracked.length && tracked[cursor + 1].timestamp <= timestamp) cursor++;
    const a = tracked[cursor], b = tracked[cursor + 1];
    if (timestamp === a.timestamp) return a.slots;
    if (timestamp < a.timestamp || !b || b.timestamp - a.timestamp > config.maxGapMs) return [null, null];
    const fraction = (timestamp - a.timestamp) / (b.timestamp - a.timestamp);
    return a.slots.map((previous, slot) => {
      const next = b.slots[slot];
      return previous && next && previous.id === next.id
        ? { id: previous.id, points: interpolate(previous.points, next.points, fraction),
          side: previous.side === next.side ? previous.side : null }
        : null;
    });
  });
}

function median(values) {
  const ordered = values.toSorted((a, b) => a - b);
  const mid = Math.floor(ordered.length / 2);
  return (ordered[mid] + ordered[Math.floor((ordered.length - 1) / 2)]) / 2;
}

function byBin(rows, bins, summarize) {
  const width = rows.length / bins;
  return Array.from({ length: bins }, (_, bin) => summarize(rows.slice(bin * width, (bin + 1) * width))).flat();
}

function describeHand(slots, config) {
  const visible = slots.filter(Boolean);
  if (visible.length === 0) {
    return { vector: Array(2 * POSE_DIMENSIONS + 3 + HAND_BIN_DIMENSIONS * config.bins).fill(0), motion: 0 };
  }
  const scale = median(visible.map(slot => palmSize(slot.points)));
  const initial = visible[0].points[0];
  const intervalSeconds = config.windowMs / (config.steps - 1) / 1000;
  let path = 0;
  let motion = 0;
  const rows = slots.map((slot, i) => {
    if (!slot) return null;
    const palm = palmSize(slot.points);
    const position = divide(subtract(slot.points[0], initial), scale);
    const articulation = pose(slot.points, palm);
    const prior = slots[i - 1];
    const connected = prior && prior.id === slot.id;
    const step = connected ? divide(subtract(slot.points[0], prior.points[0]), scale) : ZERO;
    const velocity = divide(step, intervalSeconds);
    path += length(step);
    if (connected) {
      const tipsNow = subtract(slot.points[8], slot.points[0]);
      const tipsBefore = subtract(prior.points[8], prior.points[0]);
      motion += length(step) + .6 * length(divide(subtract(tipsNow, tipsBefore), scale));
    }
    return { articulation, position, velocity, palmRatio: palm / scale };
  });
  const valid = rows.filter(Boolean);
  const postures = valid.map(row => row.articulation);
  const posture = mean(postures, POSE_DIMENSIONS);
  const deviation = mean(postures.map(row => row.map((value, i) => (value - posture[i]) ** 2)), POSE_DIMENSIONS).map(Math.sqrt);
  const temporal = byBin(rows, config.bins, bin => {
    const present = bin.filter(Boolean);
    return [present.length / bin.length, ...mean(present.map(row => [
      ...row.position, ...row.velocity, ...row.articulation.slice(0, 6), row.palmRatio,
    ]), HAND_BIN_DIMENSIONS - 1)];
  });
  return {
    vector: [...posture, ...deviation, path, Math.max(...valid.map(row => length(row.position))),
      mean(valid.map(row => [length(row.velocity)]), 1)[0], ...temporal],
    motion,
  };
}

function describePair(sequence, config) {
  return byBin(sequence, config.bins, bin => {
    const pair = bin.filter(([a, b]) => a && b).map(([a, b]) => {
      const scale = (palmSize(a.points) + palmSize(b.points)) / 2;
      const separation = divide(subtract(b.points[0], a.points[0]), scale);
      return [...separation, length(separation)];
    });
    return [pair.length / bin.length, ...mean(pair, PAIR_BIN_DIMENSIONS - 1)];
  });
}

const notReady = () => ({ features: null, reason: 'insufficient-window', motion: 0 });
const noHands = () => ({ features: null, reason: 'no-hands', motion: 0 });

function describeSequence(sequence, config) {
  const firstHand = describeHand(sequence.map(slots => slots[0]), config);
  const secondHand = describeHand(sequence.map(slots => slots[1]), config);
  return {
    features: [...firstHand.vector, ...secondHand.vector, ...describePair(sequence, config)],
    motion: firstHand.motion + secondHand.motion,
  };
}

function windowEndingAt(frames, last, aspect, config, experimental = false) {
  if (last < 0) return notReady();
  const end = frames[last].timestampMs;
  if (!frames[last].hands.length) return noHands();
  if (end - frames[0].timestampMs < config.windowMs) return notReady();
  let first = last;
  while (first > 0 && frames[first].timestampMs > end - config.windowMs) first--;
  const tracked = trackFrames(frames.slice(first, last + 1), aspect, config);
  const sequence = resample(tracked, end, config);
  const handCounts = [0, 0, 0];
  for (const slots of sequence) handCounts[Number(!!slots[0]) + Number(!!slots[1])]++;
  if (1 - handCounts[0] / sequence.length < config.minPresenceRatio) return { ...noHands(), handCounts };
  const singleton = experimental && trackSide(sequence, handCounts[1]);
  return {
    ...describeSequence(sequence, config),
    reason: null,
    handCounts,
    ...(experimental && {
      side: singleton || null,
      canonicalFeatures: singleton === 'Left' ? describeSequence(reflectSinglePose(sequence), config).features : null,
      movement: movementEvidence(sequence, config),
    }),
  };
}

function trackSide(sequence, singleSteps) {
  if (singleSteps < .8 * sequence.length || sequence.some(row => row.every(Boolean))) return null;
  const visible = sequence.flat().filter(Boolean);
  if (new Set(visible.map(slot => slot.id)).size !== 1) return null;
  return ['Left', 'Right'].find(side => visible.filter(slot => slot.side === side).length >= .8 * visible.length) ?? null;
}

// Reflect only the articulation around each wrist. Original motion and paired geometry stay untouched.
function reflectSinglePose(sequence) {
  return sequence.map(row => row.map(slot => slot && {
    ...slot, points: slot.points.map(([x, y, z]) => [2 * slot.points[0][0] - x, y, z]),
  }));
}

function causalSlice(frames, last, config) {
  const time = frames[last].timestampMs;
  const count = frames[last].hands.length;
  let first = last;
  while (first > 0 && frames[first].timestampMs > time - config.windowMs
    && frames[first - 1].hands.length === count
    && frames[first].timestampMs - frames[first - 1].timestampMs <= config.maxGapMs) first--;
  return frames.slice(first, last + 1);
}

/** Causal windows from a single take. Call only after assigning the whole take to a split. */
export function* causalWindowsV2(frames, aspect, config = FEATURE_CONFIG) {
  checkFeatureConfig(config);
  checkWindowInput(frames, aspect);
  let next = -Infinity;
  for (const [i, frame] of frames.entries()) {
    if (!frame.hands.length || (frame.timestampMs < next && i !== frames.length - 1)) continue;
    const slice = causalSlice(frames, i, config);
    if (frame.timestampMs - slice[0].timestampMs < config.windowMs) continue;
    yield { ...windowEndingAt(slice, slice.length - 1, aspect, config, true), endMs: frame.timestampMs };
    next = frame.timestampMs + config.windowStrideMs;
  }
}

export function recordedMovement(frames, aspect, config = FEATURE_CONFIG) {
  checkWindowInput(frames, aspect);
  if (frames.length < 8) return null;
  const tracked = trackFrames(frames, aspect, config);
  const sequence = tracked.flatMap((row, i) => i && row.timestamp - tracked[i - 1].timestamp > config.maxGapMs
    ? [[null, null], row.slots] : [row.slots]);
  return movementEvidence(sequence, { steps: 12 });
}

function frameIsValid(frame) {
  return Number.isFinite(frame?.timestampMs) && Array.isArray(frame.hands) && frame.hands.length <= 2
    && frame.hands.every(hand => Array.isArray(hand?.landmarks) && hand.landmarks.length === 21
      && hand.landmarks.every(point => [point?.x, point?.y, point?.z].every(Number.isFinite)));
}

function checkWindowInput(frames, aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0 || !Array.isArray(frames)
      || frames.some((frame, i) => !frameIsValid(frame) || (i > 0 && frame.timestampMs <= frames[i - 1].timestampMs))) {
    throw new TypeError('La ventana requiere geometría válida y timestamps estrictamente crecientes.');
  }
}

/** Same fixed trailing window that can be calculated once a fresh camera result arrives. */
export function trailingWindow(frames, aspect, config = FEATURE_CONFIG) {
  checkFeatureConfig(config);
  checkWindowInput(frames, aspect);
  return windowEndingAt(frames, frames.length - 1, aspect, config);
}

/** Offline only. Pick the most active fixed window in a complete recorded take, without using its label. */
export function recordedWindow(frames, aspect, config = FEATURE_CONFIG) {
  checkFeatureConfig(config);
  checkWindowInput(frames, aspect);
  if (frames.length === 0) return notReady();
  let next = frames[0].timestampMs + config.windowMs;
  let best = null;
  let absent = false;
  for (const [i, frame] of frames.entries()) {
    if (frame.timestampMs - frames[0].timestampMs < config.windowMs) continue;
    if (frame.timestampMs < next && i !== frames.length - 1) continue;
    const window = windowEndingAt(frames, i, aspect, config);
    if (window.features && (!best || window.motion > best.motion)) best = window;
    absent ||= window.reason === 'no-hands';
    next += config.windowStrideMs;
    while (next <= frame.timestampMs) next += config.windowStrideMs;
  }
  return best ?? (absent ? noHands() : windowEndingAt(frames, frames.length - 1, aspect, config));
}

/** Adapter for FreshHandInference. Retain one real observation before the window for interpolation. */
export function createLiveWindow(config = FEATURE_CONFIG) {
  checkFeatureConfig(config);
  let frames = [];
  let geometryKey = null;
  let aspect = null;
  let lastInference = -Infinity;
  let lastCaptured = -Infinity;

  function reset() {
    frames = [];
    geometryKey = null;
    aspect = null;
    lastInference = -Infinity;
    lastCaptured = -Infinity;
  }

  return {
    reset,
    summary() {
      return { frames: frames.length, spanMs: frames.length ? Math.min(config.windowMs, lastCaptured - frames[0].timestampMs) : 0 };
    },
    push(event, nowMs = performance.now()) {
      const { source, capturedAtMs, inferenceTimestampMs, receivedAtMs, configuration, result } = event ?? {};
      if (source !== 'worker' || ![capturedAtMs, inferenceTimestampMs, receivedAtMs, nowMs].every(Number.isFinite)
          || capturedAtMs > inferenceTimestampMs || inferenceTimestampMs > receivedAtMs || receivedAtMs > nowMs + 1
          || capturedAtMs <= lastCaptured || inferenceTimestampMs <= lastInference || nowMs - capturedAtMs > config.maxFreshAgeMs) return false;
      const { processingWidth, processingHeight, inputMirrored, profile } = configuration ?? {};
      if (inputMirrored !== false || ![processingWidth, processingHeight].every(n => Number.isInteger(n) && n > 0)
          || !Array.isArray(result?.landmarks)) return false;
      const frame = { timestampMs: capturedAtMs, hands: result.landmarks.map((landmarks, i) => ({
        landmarks, handedness: result.handedness?.[i] ?? [],
      })) };
      if (!frameIsValid(frame)) return false;
      const key = [processingWidth, processingHeight, profile].join('/');
      if (key !== geometryKey || capturedAtMs - lastCaptured > config.windowMs) frames = [];
      geometryKey = key;
      aspect = processingWidth / processingHeight;
      lastInference = inferenceTimestampMs;
      lastCaptured = capturedAtMs;
      frames.push(frame);
      while (frames.length >= 2 && frames[1].timestampMs <= capturedAtMs - config.windowMs) frames.shift();
      return true;
    },
    read(nowMs = performance.now(), experimental = false) {
      if (!frames.length || !Number.isFinite(nowMs) || nowMs < lastCaptured - 1 || nowMs - lastCaptured > config.maxFreshAgeMs) {
        return { features: null, reason: 'stale-or-missing-result', motion: 0 };
      }
      return windowEndingAt(frames, frames.length - 1, aspect, config, experimental);
    },
  };
}
