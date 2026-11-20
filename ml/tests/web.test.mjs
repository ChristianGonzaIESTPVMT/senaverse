import assert from 'node:assert/strict';
import test from 'node:test';
import { FEATURE_CONFIG, createLiveWindow, featureCount, recordedWindow, trailingWindow } from '../web/features.mjs';
import { MODEL_FORMAT, createPredictor } from '../web/model.mjs';
import { frames, hand, inference } from './fixtures.mjs';

const ASPECT = 4 / 3;

function close(a, b, tolerance = 1e-9) {
  assert.equal(a.length, b.length);
  assert.ok(Math.max(...a.map((value, i) => Math.abs(value - b[i]))) < tolerance);
}

test('fixed-time interpolation is invariant to the input frame count for smooth trajectories', () => {
  const movement = t => [hand(.3 + t * .00012, .5 - t * .00004)];
  for (const steps of [24, 32]) {
    const config = { ...FEATURE_CONFIG, steps };
    const a = recordedWindow(frames(movement, 50), ASPECT, config).features;
    const b = recordedWindow(frames(movement, 81), ASPECT, config).features;
    assert.equal(a.length, featureCount(config));
    close(a, b);
  }
});

test('posture and motion retain scale invariance and aspect correction without erasing trajectory', () => {
  const original = frames(t => [hand(.25 + t * .00017, .5, { bend: .15 })]);
  const shifted = original.map(frame => ({ ...frame, hands: frame.hands.map(item => ({
    ...item, landmarks: item.landmarks.map(({ x, y, z }) => ({ x: (x * .8 + .2) * ASPECT / 2, y: y * .8 + .04, z: z * .8 * ASPECT / 2 })),
  })) }));
  const a = trailingWindow(original, ASPECT);
  const b = trailingWindow(shifted, 2);
  close(a.features, b.features);
  assert.ok(a.motion > .5);
  assert.ok(trailingWindow(frames(() => [hand(.25, .5)]), ASPECT).motion < 1e-9);
});

test('continuity keeps both slots stable when hands cross and labels or detector order switch', () => {
  const sequence = frames(t => [hand(.25 + t / 3000, .45, { side: 'Left' }),
    hand(.75 - t / 3000, .60, { side: 'Right', bend: .6 })]);
  const reordered = sequence.map((frame, i) => ({ ...frame, hands: i % 2 === 0 ? frame.hands : frame.hands.toReversed().map(item => ({
    ...item, handedness: [{ categoryName: item.handedness[0].categoryName === 'Left' ? 'Right' : 'Left', score: 1 }],
  })) }));
  close(trailingWindow(sequence, ASPECT).features, trailingWindow(reordered, ASPECT).features);
});

test('missing observations are masked and true empty detections reject without looking back', () => {
  const sequence = frames(t => t > 100 && t < 1250 ? [] : [hand(.4, .5)]);
  assert.equal(trailingWindow(sequence, ASPECT).reason, 'no-hands');
  assert.equal(trailingWindow([sequence[0], sequence.at(-1)], ASPECT).reason, 'no-hands');
  assert.throws(() => trailingWindow([sequence[0], sequence[0]], ASPECT), /crecientes/);
  const onlyStatic = frames(() => [hand(.4, .5)], 50, 1200);
  assert.equal(trailingWindow(onlyStatic, ASPECT).reason, 'insufficient-window');
});

test('live adapter uses only fresh worker results and matches a raw trailing window', () => {
  const capture = frames(t => [hand(.35 + t / 8500, .5)], 60, 2000);
  const live = createLiveWindow();
  const events = capture.map(inference);
  for (const event of events) assert.equal(live.push(event, event.receivedAtMs), true);
  const last = events.at(-1);
  assert.equal(live.push(last, last.receivedAtMs), false);
  const held = { ...last, source: 'redraw' };
  assert.equal(live.push(held, last.receivedAtMs), false);
  close(live.read(last.receivedAtMs).features, trailingWindow(capture, ASPECT).features);
  assert.equal(live.read(last.capturedAtMs + 121).reason, 'stale-or-missing-result');
  const empty = inference({ timestampMs: 2070, hands: [] });
  assert.equal(live.push(empty, empty.receivedAtMs), true);
  assert.equal(live.read(empty.receivedAtMs).reason, 'no-hands');
  live.reset();
  assert.equal(live.read(empty.receivedAtMs).reason, 'stale-or-missing-result');
});

test('web predictor covers both model types and rejects on confidence, margin and NEG-001', () => {
  const length = featureCount(FEATURE_CONFIG);
  const bundle = {
    format: MODEL_FORMAT, modelVersion: 'test', preprocessing: FEATURE_CONFIG, inputDimensions: length, outputDimensions: 2,
    labels: [{ id: 'LSP-001' }, { id: 'NEG-001' }], negativeLabelId: 'NEG-001', thresholds: { confidence: .7, margin: .45 },
  };
  const svm = createPredictor({ ...bundle, kind: 'linear-svm', parameters: {
    center: Array(length).fill(0), scale: Array(length).fill(1), bias: [1, 0], temperature: 1,
    weights: [Array(length).fill(0), [1, ...Array(length - 1).fill(0)]],
  } });
  const geometry = { features: Array(length).fill(0) };
  assert.equal(svm.classify(geometry).labelId, 'LSP-001');
  geometry.features[0] = .1;
  assert.equal(svm.classify(geometry).reason, 'low-margin');
  geometry.features[0] = .9;
  assert.equal(svm.classify(geometry).reason, 'low-confidence');
  geometry.features[0] = 2;
  assert.equal(svm.classify(geometry).reason, 'negative-class');
  assert.equal(svm.classify({ features: null, reason: 'no-hands' }).labelId, null);
  const forest = createPredictor({ ...bundle, kind: 'random-forest', parameters: {
    trees: [[[0, .5, 1, 2], [-1, 1, 0], [-1, 0, 1]]],
  } });
  assert.deepEqual(forest.scores(geometry.features), [0, 1]);
  geometry.features[0] = .5;
  assert.deepEqual(forest.scores(geometry.features), [1, 0]);
});
