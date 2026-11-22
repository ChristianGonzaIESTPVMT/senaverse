import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { claimCamera } from '../src/features/sign-recognition/cameraAccess.ts';
import { LAB_SIGNS, parseLabModel } from '../src/features/sign-recognition/labModel.ts';
import { initialRecognition } from '../src/features/sign-recognition/liveRecognition.ts';
import { recognitionResult } from '../src/features/sign-recognition/recognitionResult.ts';

test('the public artifact is the frozen V1 inference projection with no training records', async () => {
  const bytes = await readFile(new URL('../public/models/lsp-v1.json', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'afd2aae852de7bb07f0318c3ed392353d11e1e89816b59265273454c781e83f3');
  const document = JSON.parse(bytes);
  assert.deepEqual(Object.keys(document), ['format', 'kind', 'modelVersion', 'preprocessing', 'inputDimensions',
    'outputDimensions', 'labels', 'negativeLabelId', 'thresholds', 'parameters', 'detector']);
  const model = parseLabModel(document);
  assert.deepEqual(model.thresholds, { confidence: .75, margin: .4 });
  assert.deepEqual(model.labels.map(label => label.id), LAB_SIGNS.map(sign => sign.id));
});

test('a camera lease rejects another owner while opening, after cancellation until it settles, and while active', () => {
  const pending = claimCamera();
  assert.ok(pending);
  assert.equal(claimCamera(), null);
  pending.release();
  assert.equal(claimCamera(), null);
  pending.settled();
  const active = claimCamera();
  assert.ok(active);
  active.settled();
  pending.release();
  assert.equal(claimCamera(), null);
  active.release();
  const after = claimCamera();
  assert.ok(after);
  after.settled();
  after.release();
});

test('the educational result reports only confirmed signs and compares directed targets', () => {
  const free = { type: 'free' };
  const directed = { type: 'directed', targetId: 'LSP-009' };
  const candidacy = { ...initialRecognition('analyzing'), stableId: 'LSP-009', hands: 1,
    top: [{ id: 'LSP-009', name: 'Solo', score: .9 }] };
  assert.deepEqual(recognitionResult(candidacy, directed), { status: 'analyzing', confirmation: null });
  assert.deepEqual(recognitionResult({ ...candidacy, status: 'unknown' }, directed), { status: 'unknown', confirmation: null });
  const confirmed = { ...candidacy, status: 'recognized' };
  assert.deepEqual(recognitionResult(confirmed, free).confirmation, { signId: 'LSP-009', outcome: 'recognized' });
  assert.equal(recognitionResult(confirmed, directed).confirmation.outcome, 'matched');
  assert.equal(recognitionResult(confirmed, { ...directed, targetId: 'LSP-001' }).confirmation.outcome, 'different');
  assert.equal(recognitionResult({ ...initialRecognition('tracking'), reason: 'hand-count', hands: 1 }, free).status, 'unknown');
  assert.equal(recognitionResult(initialRecognition('searching'), free).status, 'searching');
});
