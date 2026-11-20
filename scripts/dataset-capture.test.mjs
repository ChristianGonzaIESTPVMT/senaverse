import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { MODEL_METADATA } from '../src/features/sign-recognition/dataset/datasetTypes.ts';
import { createInitialSignCatalog, createNegativeExampleCategory, signConfigurationErrors } from '../src/features/sign-recognition/dataset/signCatalog.ts';
import { calculateQuality, sampleCanBeSaved, sampleReviewWarnings, workerResultFrame } from '../src/features/sign-recognition/dataset/datasetValidation.ts';
import { validateDatasetSample } from '../src/features/sign-recognition/dataset/datasetExport.ts';
import { captureFixture, inferenceFixture, participantFixture, sampleFixture, signFixture } from './fixtures/dataset.mjs';

const selection = () => ({ participant: structuredClone(participantFixture), sign: structuredClone(signFixture), sessionConsent: true, repetition: 1 });

test('ten stable LSP entries start pending review; durations and instructions are checked', () => {
  const signs = createInitialSignCatalog();
  assert.equal(signs.length, 10);
  assert.equal(new Set(signs.map(sign => sign.id)).size, 10);
  assert.ok(signs.every(sign => sign.name && sign.validationStatus === 'pending' && signConfigurationErrors(sign).length === 0));
  assert.deepEqual(signs.map(sign => [sign.id, sign.name, sign.type, sign.expectedHands, sign.durationMs, sign.sourceReference.page]), [
    ['LSP-001', 'Uno', 'static', 1, 1500, 73], ['LSP-002', 'Dos', 'static', 1, 1500, 73], ['LSP-003', 'Tres', 'static', 1, 1500, 73],
    ['LSP-004', 'Cuatro', 'static', 1, 1500, 73], ['LSP-005', 'Cinco', 'static', 1, 1500, 73], ['LSP-006', 'Sí', 'dynamic', 1, 2500, 134],
    ['LSP-007', 'Nada', 'dynamic', 1, 2500, 134], ['LSP-008', 'Mucho', 'dynamic', 2, 3000, 134], ['LSP-009', 'Solo', 'dynamic', 1, 2500, 135], ['LSP-010', 'Con', 'dynamic', 2, 3000, 135],
  ]);
  assert.ok(signs.every(sign => sign.sourceReference.publisher === 'Ministerio de Educación del Perú' && sign.sourceReference.year === 2015
    && sign.sourceReference.repositoryUrl === 'https://repositorio.minedu.gob.pe/handle/20.500.12799/5545' && sign.referenceUrl === sign.sourceReference.repositoryUrl));
  assert.deepEqual(signConfigurationErrors(signFixture), []);
  assert.ok(signConfigurationErrors({ ...signFixture, durationMs: 50 }).length > 0);
  assert.ok(signConfigurationErrors({ ...signFixture, referenceUrl: 'javascript:alert(1)' }).length > 0);
});

test('recording requires explicit session consent and a configured label', () => {
  const { capture } = captureFixture();
  assert.throws(() => capture.start({ ...selection(), sessionConsent: false }), /consentimiento/);
  assert.throws(() => capture.start({ ...selection(), participant: { ...participantFixture, consentedAt: null } }), /consentimiento/);
  assert.throws(() => capture.start({ ...selection(), sign: { ...signFixture, name: '' } }), /nombre/);
  assert.equal(capture.view().phase, 'idle');
});

test('recording starts immediately and excludes preview frames delivered after the click', () => {
  const fixture = captureFixture();
  fixture.tick(1000);
  fixture.capture.start(selection(), 0);
  assert.equal(fixture.capture.view().phase, 'recording');
  assert.equal(fixture.capture.view().elapsedMs, 0);
  assert.equal(fixture.feed(inferenceFixture(995)), false);
  assert.equal(fixture.feed(inferenceFixture(1000)), true);
  assert.equal(fixture.capture.view().frameCount, 1);
  const { draft } = fixture.tick(2620);
  assert.equal(draft.recordedAt, '2026-11-17T12:01:00.000Z');
  assert.equal(draft.captureMetadata.recordingStartedAtMs, 1000);
  assert.equal(draft.frames[0].timestampMs, 0);
});

for (const seconds of [1, 2, 3, 5]) {
  test(`a ${seconds}-second countdown records a complete take starting at its deadline`, () => {
    const { capture, feed, tick } = captureFixture();
    const sign = createInitialSignCatalog()[7];
    capture.start({ ...selection(), sign }, seconds);
    const startAt = seconds * 1000;
    assert.equal(capture.view().phase, 'countdown');
    assert.equal(capture.view().countdownRemainingMs, startAt);
    assert.throws(() => capture.start(selection(), 0), /captura anterior/);
    assert.equal(feed(inferenceFixture(0, 1)), false);
    assert.equal(tick(startAt - 1).countdownRemainingMs, 1);
    assert.equal(capture.view().frameCount, 0);
    assert.equal(capture.view().elapsedMs, 0);

    // The prior frame arrives after the deadline, before the next timer tick.
    assert.equal(feed(inferenceFixture(startAt - 1, 1)), false);
    assert.equal(capture.view().phase, 'recording');
    for (let offset = 0; offset < sign.durationMs; offset += 40) {
      assert.equal(feed(inferenceFixture(startAt + offset, 2)), true);
    }
    assert.equal(feed(inferenceFixture(startAt + sign.durationMs, 2)), false);
    const { draft } = tick(startAt + sign.durationMs + 120);
    assert.equal(draft.durationMs, sign.durationMs);
    assert.equal(draft.captureMetadata.recordingStartedAtMs, startAt);
    assert.equal(Date.parse(draft.recordedAt) - Date.parse('2026-11-17T12:01:00.000Z'), startAt);
    assert.equal(draft.frames[0].timestampMs, 0);
    assert.equal(draft.frames.at(-1).timestampMs, sign.durationMs - 40);
    assert.ok(draft.frames.every(frame => frame.handCount === 2));
    assert.deepEqual(draft.incidents, []);
    assert.equal(draft.qualityMetrics.sufficient, true);
    validateDatasetSample(draft);
  });
}

test('canceling preparation clears its deadline before another take starts', () => {
  const { capture, feed, tick } = captureFixture();
  capture.start(selection(), 1);
  tick(500);
  capture.cancel();
  assert.equal(capture.view().phase, 'idle');
  assert.equal(capture.view().countdownRemainingMs, 0);
  assert.equal(feed(inferenceFixture(550)), false);
  capture.start(selection(), 2);
  assert.equal(tick(1000).phase, 'countdown');
  assert.equal(feed(inferenceFixture(2559)), false);
  assert.equal(feed(inferenceFixture(2560)), true);
  const { draft } = tick(4180);
  assert.deepEqual(draft.frames.map(frame => frame.timestampMs), [0]);
});

test('successive takes use independent windows and sequences on the same inference stream', () => {
  const { capture, feed, tick } = captureFixture();
  const selected = selection();
  capture.start(selected);
  assert.equal(feed(inferenceFixture(0)), true);
  assert.equal(feed(inferenceFixture(100, 0)), true);
  const { draft: first } = tick(1620);

  capture.cancel();
  capture.start({ ...selected, repetition: 2 }, 1);
  assert.equal(capture.view().phase, 'countdown');
  assert.equal(capture.view().frameCount, 0);
  assert.equal(capture.view().draft, null);
  assert.equal(feed(inferenceFixture(100, 0)), false);
  assert.equal(feed(inferenceFixture(1615)), false);
  assert.equal(feed(inferenceFixture(2615)), false);
  assert.equal(feed(inferenceFixture(2620)), true);
  const { draft: second } = tick(4240);

  assert.equal(second.participantId, first.participantId);
  assert.equal(second.labelId, first.labelId);
  assert.equal(second.repetition, 2);
  assert.equal(second.durationMs, signFixture.durationMs);
  assert.deepEqual(second.frames.map(frame => [frame.timestampMs, frame.sourceTimestamps.capturedAtMs]), [[0, 2620]]);
  assert.equal(second.incidents.length, 0);
  assert.equal(second.qualityMetrics.expectedHandsRatio, 1);
  assert.equal(first.frames.length, 2);
  assert.equal(first.qualityMetrics.expectedHandsRatio, 0.5);
});

test('only fresh ordered Worker observations are collected, without duplicate timestamps', () => {
  const fixture = captureFixture(); fixture.capture.start(selection());
  assert.equal(fixture.feed(inferenceFixture(10)), true);
  assert.equal(fixture.feed(inferenceFixture(10)), false);
  assert.equal(fixture.feed({ ...inferenceFixture(10), inferenceTimestampMs: 12 }), false);
  assert.equal(fixture.feed({ ...inferenceFixture(50), source: 'retained-canvas' }), false);
  assert.equal(fixture.feed(inferenceFixture(80)), true);
  assert.equal(fixture.feed(inferenceFixture(70)), false);
  assert.equal(fixture.feed(inferenceFixture(100, 1, 121)), false);
  assert.equal(fixture.capture.view().frameCount, 2);
});

test('late delivery can drain the last in-window frame, while out-of-window frames are rejected', () => {
  const fixture = captureFixture(); fixture.capture.start(selection());
  fixture.feed(inferenceFixture(0));
  assert.equal(fixture.feed(inferenceFixture(1480, 1, 50)), true);
  assert.equal(fixture.capture.view().phase, 'finishing');
  assert.equal(fixture.feed(inferenceFixture(1500)), false);
  fixture.tick(1620);
  const sample = fixture.capture.view().draft;
  assert.equal(sample.frames.at(-1).timestampMs, 1480);
  assert.equal(sample.durationMs, 1500);
});

test('zero-hand Worker results remain observations and expose real losses in quality metrics', () => {
  const fixture = captureFixture(); fixture.capture.start(selection());
  fixture.feed(inferenceFixture(0)); fixture.feed(inferenceFixture(50, 0)); fixture.feed(inferenceFixture(100));
  fixture.tick(1620);
  const sample = fixture.capture.view().draft;
  assert.equal(sample.frames.length, 3);
  assert.deepEqual(sample.frames[1], { timestampMs: 50, handCount: 0, hands: [], sourceTimestamps: { capturedAtMs: 50, inferenceTimestampMs: 51, receivedAtMs: 60 } });
  assert.equal(sample.qualityMetrics.expectedHandsRatio, 2 / 3);
  assert.equal(sample.qualityMetrics.trackingLosses, 1);
  assert.ok(sample.incidents.some(item => item.type === 'hand-count-mismatch'));
  assert.equal(sample.reviewStatus, 'pending');
});

test('stored coordinates, world landmarks, lateralities and label metadata are detached from live objects', () => {
  const fixture = captureFixture(); const selected = selection(); fixture.capture.start(selected);
  const event = inferenceFixture(0, 2);
  fixture.feed(event); fixture.feed(inferenceFixture(100, 2));
  event.result.landmarks[0][0].x = 999; event.result.worldLandmarks[0][0].z = 999;
  selected.sign.name = 'Changed';
  fixture.tick(1620);
  const sample = fixture.capture.view().draft;
  assert.equal(sample.frames[0].hands[0].landmarks.length, 21);
  assert.equal(sample.frames[0].hands[0].landmarks[0].x, .2);
  assert.equal(sample.frames[0].hands[0].worldLandmarks[0].z, 0);
  assert.equal(sample.frames[0].hands[0].handedness[0].categoryName, 'Left');
  assert.equal(sample.captureMetadata.labelSnapshot.name, signFixture.name);
});

test('missing world coordinates are not invented and malformed landmark arrays are rejected', () => {
  const event = inferenceFixture(0); event.result.worldLandmarks = [];
  const frame = workerResultFrame(event.result, 0);
  assert.equal('worldLandmarks' in frame.hands[0], false);
  event.result.landmarks[0].pop();
  assert.equal(workerResultFrame(event.result, 0), null);
});

test('static/dynamic custom durations preserve the measured timeline and never assume 30 FPS', () => {
  const sample = sampleFixture('sample-dynamic', { ...createInitialSignCatalog()[5], durationMs: 2500 }, 5);
  assert.equal(sample.durationMs, 2500);
  assert.equal(sample.qualityMetrics.averageFps, 5);
  assert.ok(sample.qualityMetrics.warnings.some(warning => warning.includes('frecuencia')));
  assert.equal(sample.qualityMetrics.sufficient, false);
  const sufficient = sampleFixture();
  assert.ok(Math.abs(sufficient.qualityMetrics.averageFps - 30) < .00001);
  assert.equal(sufficient.qualityMetrics.sufficient, true);
});

test('one- and two-hand catalog captures preserve the full real sequence and original Worker timestamps', () => {
  for (const index of [0, 2, 5, 7, 9]) {
    const sign = createInitialSignCatalog()[index];
    const sample = sampleFixture(`sample-${sign.id}`, sign);
    assert.equal(sample.qualityMetrics.sufficient, true);
    assert.equal(sample.captureMetadata.labelSnapshot.id, sign.id);
    assert.ok(sample.frames.length >= Math.floor(sign.durationMs * 30 / 1000));
    assert.ok(sign.durationMs - sample.frames.at(-1).timestampMs <= 1000 / 30 + 1e-7);
    assert.ok(sample.frames.every(frame => frame.hands.length === sign.expectedHands && frame.sourceTimestamps.capturedAtMs === frame.timestampMs));
    assert.equal(sample.captureMetadata.recordingStartedAtMs, 0);
    assert.equal(sample.captureMetadata.coordinates, 'mediapipe-original');
    assert.equal(sample.captureMetadata.configuration.inputMirrored, false);
    assert.equal(sample.captureMetadata.visualMirrored, true);
    assert.equal(sample.frames[0].hands[0].landmarks[0].x, .2);
    assert.equal(sample.frames[0].hands[0].handedness[0].categoryName, 'Left');
  }
});

test('missing required hands, repeated timestamps and interrupted coverage warn without inventing frames', () => {
  const fixture = captureFixture(); const sign = createInitialSignCatalog()[7];
  fixture.capture.start({ ...selection(), sign });
  assert.equal(fixture.feed(inferenceFixture(0, 2)), true);
  assert.equal(fixture.feed(inferenceFixture(0, 2)), false);
  assert.equal(fixture.feed(inferenceFixture(50, 1)), true);
  fixture.tick(400);
  assert.equal(fixture.feed(inferenceFixture(450, 2)), true);
  fixture.tick(3120);
  const sample = fixture.capture.view().draft;
  const warnings = sampleReviewWarnings(sample).join(' ');
  assert.equal(sample.frames.length, 3);
  assert.match(warnings, /mano necesaria/);
  assert.match(warnings, /timestamps repetidos/);
  assert.match(warnings, /pérdidas significativas/);
  assert.match(warnings, /duración real observada es insuficiente/);
  assert.equal(sample.qualityMetrics.sufficient, false);
  const incomplete = { ...sample, captureMetadata: { ...sample.captureMetadata, completed: false } };
  assert.match(sampleReviewWarnings(incomplete).join(' '), /incompleta/);
  assert.equal(sampleCanBeSaved(incomplete), false);
});

test('negative examples are an independent technical category and can record real zero-hand observations', () => {
  const sign = createNegativeExampleCategory();
  assert.equal(sign.id, 'NEG-001');
  assert.equal(sign.validationStatus, 'not-applicable');
  assert.equal(createInitialSignCatalog().some(item => item.id === sign.id), false);
  const sample = sampleFixture('sample-negative', sign);
  assert.ok(sample.frames.every(frame => frame.handCount === 0 && frame.hands.length === 0));
  assert.equal(sampleCanBeSaved(sample), true);
  assert.equal(sample.qualityMetrics.sufficient, true);
});

test('cancellation and no-data recordings never create a completed draft', () => {
  const fixture = captureFixture(); fixture.capture.start(selection());
  fixture.feed(inferenceFixture(0)); fixture.capture.cancel();
  fixture.tick(10000);
  assert.equal(fixture.capture.view().draft, null);
  assert.equal(fixture.capture.view().phase, 'idle');
  fixture.capture.start(selection()); fixture.tick(15000);
  assert.equal(fixture.capture.view().draft, null);
  assert.match(fixture.capture.view().warning, /No se recibieron/);
});

test('quality distinguishes a recording window from actual observed coverage', () => {
  const frame = workerResultFrame(inferenceFixture(0).result, 0);
  const quality = calculateQuality([frame, { ...frame, timestampMs: 100 }], 1500, 1);
  assert.equal(quality.observedDurationMs, 100);
  assert.equal(quality.averageFps, 10);
  assert.equal(quality.sufficient, false);
  assert.ok(quality.warnings.some(warning => warning.includes('70%')));
});

test('export provenance matches the installed MediaPipe SDK and the actual local model file', async () => {
  const installed = JSON.parse(await readFile(new URL('../node_modules/@mediapipe/tasks-vision/package.json', import.meta.url), 'utf8'));
  const model = await readFile(new URL('../public/models/hand_landmarker.task', import.meta.url));
  assert.equal(MODEL_METADATA.packageVersion, installed.version);
  assert.equal(MODEL_METADATA.sha256, createHash('sha256').update(model).digest('hex'));
});
