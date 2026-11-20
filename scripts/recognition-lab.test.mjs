import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FEATURE_CONFIG, featureCount, trailingWindow } from '../ml/web/features.mjs';
import { frames, hand, inference } from '../ml/tests/fixtures.mjs';
import { MODEL_METADATA } from '../src/features/sign-recognition/dataset/datasetTypes.ts';
import { LAB_SIGNS, loadLabModel, parseLabModel } from '../src/features/sign-recognition/labModel.ts';
import { LAB_MODEL_PATH, LAB_MODEL_VERSION } from '../src/features/sign-recognition/labProtocol.ts';
import { createRecognitionSession, directedOutcome, recognitionDefaults } from '../src/features/sign-recognition/liveRecognition.ts';

const zeros = () => Array(featureCount(FEATURE_CONFIG)).fill(0);
const labels = LAB_SIGNS.map(({ id, name }) => ({ id, name }));
const modelDocument = {
  format: 'senaverse-landmark-classifier-v1', kind: 'linear-svm', modelVersion: LAB_MODEL_VERSION,
  labels, preprocessing: FEATURE_CONFIG, detector: MODEL_METADATA, inputDimensions: featureCount(FEATURE_CONFIG),
  outputDimensions: labels.length, negativeLabelId: 'NEG-001', thresholds: { confidence: .75, margin: .40 },
  parameters: { center: zeros(), scale: zeros().fill(1), weights: labels.map(zeros), bias: labels.map(() => 0), temperature: 1 },
};

function scores(index, winning = .92, runnerUp = .04) {
  const values = Array(labels.length).fill((1 - winning - runnerUp) / (labels.length - 2));
  values[(index + 1) % values.length] = runnerUp;
  values[index] = winning;
  return values;
}

function harness(predict = () => scores(0)) {
  let now = 0;
  const vectors = [];
  const model = parseLabModel(modelDocument);
  model.predictor.scores = features => { vectors.push(features); return predict(features); };
  const session = createRecognitionSession(model, () => now);
  session.start();
  const observations = [];
  function feed(frame, change = event => event) {
    const event = change(inference(frame));
    now = event.receivedAtMs;
    const next = session.observe(event);
    if (next) observations.push(next);
    return next;
  }
  const block = (from, to, hands = () => [hand(.35, .48)]) => {
    for (let timestampMs = from; timestampMs <= to; timestampMs += 50) feed({ timestampMs, hands: hands(timestampMs) });
    return observations.at(-1);
  };
  return { session, model, feed, block, vectors, observations, latest: () => observations.at(-1) };
}

test('loadLabModel accepts the V1 projection, preserves IDs, and handles missing or incompatible models', async () => {
  const abort = new AbortController();
  const loader = (_, options) => {
    assert.equal(options.signal, abort.signal);
    return Promise.resolve(Response.json(modelDocument));
  };
  const loaded = await loadLabModel('/base/', abort.signal, (url, options) => {
    assert.equal(url, '/base/' + LAB_MODEL_PATH);
    return loader(url, options);
  });
  assert.equal(loaded.modelVersion, LAB_MODEL_VERSION);
  assert.deepEqual(loaded.labels, labels);
  assert.equal(loaded.predictor.scores(zeros()).length, 10);
  await assert.rejects(loadLabModel('/', abort.signal, async () => new Response(null, { status: 503 })), /artefacto V1/);
  await assert.rejects(loadLabModel('/', abort.signal, async () => new Response('<html>')), /no está disponible/);
  assert.throws(() => parseLabModel({ ...modelDocument, modelVersion: 'V2' }), /V1/);
  assert.throws(() => parseLabModel({ ...modelDocument, preprocessing: { ...FEATURE_CONFIG, steps: 32 } }), /V1/);
  assert.throws(() => parseLabModel({ ...modelDocument, parameters: { ...modelDocument.parameters, weights: [] } }), /SVM/);
});

test('the first live vector equals the training transform for its actual timestamps and geometry', () => {
  const lab = harness();
  const trace = frames(t => [hand(.27 + t * .00015, .49, { bend: Math.sin(t / 200) })], 50);
  for (const frame of trace.slice(0, -1)) lab.feed(frame);
  assert.equal(lab.latest().status, 'collecting');
  assert.equal(lab.vectors.length, 0);
  const snapshot = lab.feed(trace.at(-1));
  assert.equal(snapshot.status, 'analyzing');
  const expected = trailingWindow(trace, 4 / 3, FEATURE_CONFIG);
  assert.deepEqual(lab.vectors[0], expected.features);
  assert.deepEqual(expected.handCounts, [0, 24, 0]);
});

test('stable static recognition needs successive fresh votes and supports directed comparison', () => {
  const lab = harness();
  assert.equal(lab.block(0, 1500).status, 'analyzing');
  const repeated = { timestampMs: 1500, hands: [hand(.35, .48)] };
  assert.equal(lab.feed(repeated), null);
  assert.equal(lab.feed({ ...repeated, timestampMs: 1510 }, event => ({ ...event, source: 'overlay' })), null);
  const snapshot = lab.block(1550, 1600);
  assert.equal(snapshot.status, 'recognized');
  assert.equal(snapshot.stableId, 'LSP-001');
  assert.equal(directedOutcome(snapshot, 'LSP-001'), 'matched');
  assert.equal(directedOutcome(snapshot, 'LSP-002'), 'different');
  assert.equal(lab.vectors.length, 3);
});

test('a moving two-hand sequence can stabilize, with association independent of detector order', () => {
  const movement = (t) => [
    hand(.24 + t / 6500, .46, { side: 'Left' }),
    hand(.73 - t / 6500, .54, { bend: .6 }),
  ];
  const reordered = (t) => t % 100 ? movement(t).reverse() : movement(t);
  const a = harness(() => scores(7));
  const b = harness(() => scores(7));
  assert.equal(a.block(0, 2200, movement).stableId, 'LSP-008');
  assert.equal(b.block(0, 2200, reordered).stableId, 'LSP-008');
  assert.deepEqual(a.vectors, b.vectors);
  const loss = a.feed({ timestampMs: 2250, hands: [hand(.35, .5)] });
  assert.equal(loss.status, 'tracking');
  assert.equal(loss.stableId, null);
});

test('unknown, ambiguous and implausible hand-count candidates are rejected', () => {
  const low = harness(() => scores(0, .55, .32)).block(0, 1850);
  assert.equal(low.status, 'unknown');
  assert.equal(low.reason, 'low-score');
  assert.equal(directedOutcome(low, 'LSP-001'), 'unknown');
  const ambiguous = harness(() => scores(0, .65, .31));
  ambiguous.session.configure({ ...recognitionDefaults(ambiguous.model), score: .60 });
  assert.equal(ambiguous.block(0, 1850).reason, 'low-margin');
  const count = harness(() => scores(9)).block(0, 1850);
  assert.equal(count.reason, 'hand-count');
  assert.equal(count.stableId, null);
  const insufficientCoverage = harness(() => scores(9)).block(0, 1600,
    t => t > 1000 ? [hand(.3, .5), hand(.7, .5)] : [hand(.3, .5)]);
  assert.equal(insufficientCoverage.reason, 'hand-count');
  assert.ok(insufficientCoverage.handRatio < .8);
});

test('hysteresis ignores brief switches and releases doubts without a directed match', () => {
  let choice = 0;
  const lab = harness(() => choice < 0 ? scores(0, .51, .48) : scores(choice));
  assert.equal(lab.block(0, 1550).stableId, 'LSP-001');
  choice = 1;
  assert.equal(lab.block(1600, 1650).status, 'analyzing');
  assert.equal(lab.latest().stableId, 'LSP-001');
  choice = 0;
  assert.equal(lab.block(1700, 1750).status, 'recognized');
  choice = 1;
  assert.equal(lab.block(1800, 2050).status, 'analyzing');
  assert.equal(lab.block(2100, 2150).stableId, 'LSP-002');
  choice = -1;
  const doubt = lab.block(2200, 2250);
  assert.equal(doubt.stableId, 'LSP-002');
  assert.equal(directedOutcome(doubt, 'LSP-002'), 'unknown');
  assert.equal(lab.block(2300, 2450).stableId, null);
});

test('losing fresh results, actual empty frames, interruptions and restarts clear evidence', () => {
  const lab = harness();
  assert.equal(lab.block(0, 1700).stableId, 'LSP-001');
  assert.equal(lab.session.expire(1821).status, 'tracking');
  assert.equal(lab.session.expire(1830), null);
  assert.equal(lab.block(1850, 2050).status, 'collecting');
  assert.equal(lab.feed({ timestampMs: 2100, hands: [] }).status, 'searching');
  assert.equal(lab.feed({ timestampMs: 2150, hands: [] }), null);
  assert.equal(lab.session.interrupt().status, 'tracking');
  assert.equal(lab.session.stop().status, 'off');
  const before = lab.vectors.length;
  assert.equal(lab.feed({ timestampMs: 2250, hands: [hand(.35, .48)] }), null);
  assert.equal(lab.vectors.length, before);
  assert.equal(lab.session.start().window.frames, 0);
  assert.equal(lab.block(2300, 2450).status, 'collecting');
});
