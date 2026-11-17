import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { MODEL_METADATA } from '../src/features/sign-recognition/dataset/datasetTypes.ts';
import { createInitialSignCatalog, signConfigurationErrors } from '../src/features/sign-recognition/dataset/signCatalog.ts';
import { calculateQuality, workerResultFrame } from '../src/features/sign-recognition/dataset/datasetValidation.ts';
import { captureFixture, inferenceFixture, participantFixture, sampleFixture, signFixture } from './fixtures/dataset.mjs';

const selection = () => ({ participant: structuredClone(participantFixture), sign: structuredClone(signFixture), sessionConsent: true, repetition: 1 });

test('ten configurable slots start empty and unvalidated; durations and instructions are checked', () => {
  const signs = createInitialSignCatalog();
  assert.equal(signs.length, 10);
  assert.equal(new Set(signs.map(sign => sign.id)).size, 10);
  assert.ok(signs.every(sign => !sign.name && sign.validationStatus === 'unconfigured'));
  assert.ok(signConfigurationErrors(signs[0]).length > 0);
  assert.deepEqual(signConfigurationErrors(signFixture), []);
  assert.ok(signConfigurationErrors({ ...signFixture, durationMs: 50 }).length > 0);
  assert.ok(signConfigurationErrors({ ...signFixture, referenceUrl: 'javascript:alert(1)' }).length > 0);
});

test('recording requires explicit session consent and a configured label', () => {
  const { capture } = captureFixture();
  assert.throws(() => capture.start({ ...selection(), sessionConsent: false }), /consentimiento/);
  assert.throws(() => capture.start({ ...selection(), participant: { ...participantFixture, consentedAt: null } }), /consentimiento/);
  assert.throws(() => capture.start({ ...selection(), sign: createInitialSignCatalog()[0] }), /nombre/);
  assert.equal(capture.view().phase, 'idle');
});

test('the three-second countdown excludes observations captured before the recording interval', () => {
  const fixture = captureFixture(); fixture.capture.start(selection());
  assert.equal(fixture.capture.view().countdown, 3);
  assert.equal(fixture.tick(1000).countdown, 2);
  assert.equal(fixture.feed(inferenceFixture(2900)), false);
  assert.equal(fixture.feed(inferenceFixture(3000)), true);
  assert.equal(fixture.capture.view().phase, 'recording');
  assert.equal(fixture.capture.view().frameCount, 1);
});

test('only fresh ordered Worker observations are collected, without duplicate timestamps', () => {
  const fixture = captureFixture(); fixture.capture.start(selection());
  assert.equal(fixture.feed(inferenceFixture(3010)), true);
  assert.equal(fixture.feed(inferenceFixture(3010)), false);
  assert.equal(fixture.feed({ ...inferenceFixture(3010), inferenceTimestampMs: 3012 }), false);
  assert.equal(fixture.feed({ ...inferenceFixture(3050), source: 'retained-canvas' }), false);
  assert.equal(fixture.feed(inferenceFixture(3100, 1, 121)), false);
  assert.equal(fixture.feed(inferenceFixture(3080)), true);
  assert.equal(fixture.feed(inferenceFixture(3070)), false);
  assert.equal(fixture.capture.view().frameCount, 2);
});

test('late delivery can drain the last in-window frame, while out-of-window frames are rejected', () => {
  const fixture = captureFixture(); fixture.capture.start(selection());
  fixture.feed(inferenceFixture(3000));
  assert.equal(fixture.feed(inferenceFixture(4480, 1, 50)), true);
  assert.equal(fixture.capture.view().phase, 'finishing');
  assert.equal(fixture.feed(inferenceFixture(4500)), false);
  fixture.tick(4620);
  const sample = fixture.capture.view().draft;
  assert.equal(sample.frames.at(-1).timestampMs, 1480);
  assert.equal(sample.durationMs, 1500);
});

test('zero-hand Worker results remain observations and expose real losses in quality metrics', () => {
  const fixture = captureFixture(); fixture.capture.start(selection());
  fixture.feed(inferenceFixture(3000)); fixture.feed(inferenceFixture(3050, 0)); fixture.feed(inferenceFixture(3100));
  fixture.tick(4620);
  const sample = fixture.capture.view().draft;
  assert.equal(sample.frames.length, 3);
  assert.deepEqual(sample.frames[1], { timestampMs: 50, handCount: 0, hands: [] });
  assert.equal(sample.qualityMetrics.expectedHandsRatio, 2 / 3);
  assert.equal(sample.qualityMetrics.trackingLosses, 1);
  assert.ok(sample.incidents.some(item => item.type === 'hand-count-mismatch'));
  assert.equal(sample.reviewStatus, 'pending');
});

test('stored coordinates, world landmarks, lateralities and label metadata are detached from live objects', () => {
  const fixture = captureFixture(); const selected = selection(); fixture.capture.start(selected);
  const event = inferenceFixture(3000, 2);
  fixture.feed(event); fixture.feed(inferenceFixture(3100, 2));
  event.result.landmarks[0][0].x = 999; event.result.worldLandmarks[0][0].z = 999;
  selected.sign.name = 'Changed';
  fixture.tick(4620);
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
  const sample = sampleFixture('sample-dynamic', { ...signFixture, type: 'dynamic', durationMs: 2500 }, 5);
  assert.equal(sample.durationMs, 2500);
  assert.equal(sample.qualityMetrics.averageFps, 5);
  assert.ok(sample.qualityMetrics.warnings.some(warning => warning.includes('frecuencia')));
  assert.equal(sample.qualityMetrics.sufficient, false);
  const sufficient = sampleFixture();
  assert.ok(Math.abs(sufficient.qualityMetrics.averageFps - 30) < .00001);
  assert.equal(sufficient.qualityMetrics.sufficient, true);
});

test('cancellation and no-data recordings never create a completed draft', () => {
  const fixture = captureFixture(); fixture.capture.start(selection());
  fixture.feed(inferenceFixture(3000)); fixture.capture.cancel();
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
