import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { DatasetStore, datasetStatistics } from '../src/features/sign-recognition/dataset/datasetStore.ts';
import { parseDatasetJSON, serializeDataset } from '../src/features/sign-recognition/dataset/datasetExport.ts';
import { isOperatorReviewed } from '../src/features/sign-recognition/dataset/datasetTypes.ts';
import { createInitialSignCatalog, createNegativeExampleCategory } from '../src/features/sign-recognition/dataset/signCatalog.ts';
import { calculateQuality } from '../src/features/sign-recognition/dataset/datasetValidation.ts';
import { captureFixture, inferenceFixture, legacyCatalogFixture, sampleFixture, signFixture } from './fixtures/dataset.mjs';

const stores = [];
afterEach(async () => { await Promise.all(stores.splice(0).map(store => store.close())); });
function database(factory = new IDBFactory(), name = 'test-dataset') { const store = new DatasetStore(factory, name); stores.push(store); return store; }
async function prepared(store) { const participant = await store.createParticipant(); await store.consentParticipant(participant.id); await store.saveSign(signFixture); return participant; }
const exportedAt = '2026-11-17T14:00:00.000Z';

test('IndexedDB initializes ten LSP entries plus the independent negative category and persists participants', async () => {
  const factory = new IDBFactory(); const store = database(factory);
  const empty = await store.snapshot();
  assert.equal(empty.signs.length, 11);
  assert.deepEqual(datasetStatistics(empty), { participants: 0, configuredSigns: 10, samples: 0, pending: 0, bySign: Object.fromEntries(empty.signs.map(sign => [sign.id, 0])), byParticipant: {} });
  const [first, second] = await Promise.all([store.createParticipant(), store.createParticipant()]);
  assert.deepEqual([first.id, second.id], ['P001', 'P002']);
  assert.equal(first.consentedAt, null);
  await store.close();
  const reopened = database(factory);
  assert.equal((await reopened.snapshot()).participants.length, 2);
  assert.equal((await reopened.snapshot()).meta.datasetId, empty.meta.datasetId);
});

test('saving requires consent, records independent repetitions and lists summaries without loading frames', async () => {
  const store = database(); await store.createParticipant(); await store.saveSign(signFixture);
  await assert.rejects(store.saveSample(sampleFixture()), /consentimiento/);
  await store.consentParticipant('P001');
  const first = await store.saveSample(sampleFixture('sample-one'));
  const second = await store.saveSample(sampleFixture('sample-two'));
  assert.equal(first.repetition, 1); assert.equal(second.repetition, 2);
  const snapshot = await store.snapshot();
  assert.equal(snapshot.samples.length, 2);
  assert.equal('frames' in snapshot.samples[0], false);
  assert.deepEqual((await store.getSample(first.sampleId)).frames, first.frames);
  assert.equal(datasetStatistics(snapshot).bySign[signFixture.id], 2);
  assert.equal(datasetStatistics(snapshot).byParticipant.P001, 2);
  await assert.rejects(store.saveSample(first), /ya está guardada/);
  assert.equal((await store.snapshot()).samples.length, 2);
});

test('quality review is explicit and insufficient captures cannot be marked accepted', async () => {
  const store = database(); await prepared(store);
  const good = await store.saveSample(sampleFixture('sample-good'));
  const weak = await store.saveSample(sampleFixture('sample-weak', signFixture, 5));
  assert.equal(good.reviewStatus, 'pending');
  await store.reviewSample(good.sampleId, 'accepted');
  await assert.rejects(store.reviewSample(weak.sampleId, 'accepted'), /calidad insuficiente/);
  await store.reviewSample(weak.sampleId, 'rejected');
  assert.equal((await store.getSample(weak.sampleId)).reviewStatus, 'rejected');
});

test('saving after a countdown preserves the existing sample, its review, and the dataset metadata', async () => {
  const store = database();
  await prepared(store);
  const first = await store.saveSample(sampleFixture('sample-previous'));
  await store.reviewSample(first.sampleId, 'accepted');
  const before = await store.getSample(first.sampleId);
  const { meta, participants: [participant], signs } = await store.snapshot();

  const { capture, feed, tick } = captureFixture('sample-countdown');
  capture.start({ sign: signFixture, participant, repetition: 2, sessionConsent: true }, 3);
  assert.equal(feed(inferenceFixture(2995, 0)), false);
  for (let offset = 0; offset < signFixture.durationMs; offset += 40) {
    assert.equal(feed(inferenceFixture(3000 + offset)), true);
  }
  const { draft } = tick(3000 + signFixture.durationMs + 120);
  await store.saveSample(draft);

  const after = await store.snapshot();
  assert.deepEqual(after.meta, meta);
  assert.deepEqual(after.signs, signs);
  assert.deepEqual(await store.getSample(first.sampleId), before);
  assert.deepEqual(await store.getSample(draft.sampleId), draft);
});

test('bulk review and acceptance persist independently and preserve complete existing samples in JSON', async () => {
  const factory = new IDBFactory();
  const store = database(factory);
  await prepared(store);
  const good = await store.saveSample(sampleFixture('bulk-good'));
  const weak = await store.saveSample(sampleFixture('bulk-weak', signFixture, 5));
  const legacy = await store.saveSample(sampleFixture('bulk-legacy'));
  const document = await store.document('backup', exportedAt);
  document.samples.find(sample => sample.sampleId === legacy.sampleId).reviewStatus = 'accepted';
  await store.replace(document);
  assert.equal(isOperatorReviewed(await store.getSample(legacy.sampleId)), true);
  const ids = [good.sampleId, weak.sampleId, legacy.sampleId];
  const marked = await store.updateSampleReviews([...ids, good.sampleId], 'mark');
  assert.deepEqual(marked.updated.map(sample => sample.sampleId), ids.slice(0, 2));
  assert.equal(marked.unchanged, 1);
  assert.equal((await store.getSample(weak.sampleId)).reviewStatus, 'pending');
  assert.equal(datasetStatistics(await store.snapshot()).pending, 0);

  const accepted = await store.updateSampleReviews([good.sampleId, weak.sampleId, 'missing'], 'accept');
  assert.deepEqual(accepted.updated.map(sample => sample.sampleId), [good.sampleId]);
  assert.equal(accepted.insufficient, 1);
  assert.deepEqual(accepted.missingIds, ['missing']);
  await store.updateSampleReviews([good.sampleId, legacy.sampleId], 'unmark');
  await store.updateSampleReviews([weak.sampleId], 'reject');
  await store.close();

  const reopened = database(factory);
  const exported = parseDatasetJSON(serializeDataset(await reopened.document('backup', exportedAt)));
  for (const before of document.samples) {
    const after = exported.samples.find(sample => sample.sampleId === before.sampleId);
    assert.deepEqual(after, {
      ...before,
      operatorReviewed: after.sampleId === weak.sampleId,
      reviewStatus: after.sampleId === weak.sampleId ? 'rejected' : 'accepted',
    });
  }
  assert.equal(datasetStatistics(await reopened.snapshot()).pending, 2);
  await reopened.reviewSample(good.sampleId, 'rejected');
  assert.equal(isOperatorReviewed(await reopened.getSample(good.sampleId)), false);
  assert.equal((await reopened.getSample(good.sampleId)).reviewStatus, 'rejected');
});

test('a failed bulk write rolls back every review flag', async () => {
  const store = database();
  await prepared(store);
  const first = await store.saveSample(sampleFixture('batch-first'));
  const second = await store.saveSample(sampleFixture('batch-second'));
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, ...args) {
    if (this.name === 'samples' && value.sampleId === second.sampleId) throw new DOMException('Storage full', 'QuotaExceededError');
    return original.call(this, value, ...args);
  };
  try { await assert.rejects(store.updateSampleReviews([first.sampleId, second.sampleId], 'mark'), { name: 'QuotaExceededError' }); }
  finally { IDBObjectStore.prototype.put = original; }
  assert.deepEqual(await store.getSample(first.sampleId), first);
  assert.deepEqual(await store.getSample(second.sampleId), second);
});

test('deleting a sample or participant atomically removes corresponding sequences', async () => {
  const store = database(); await prepared(store);
  await store.saveSample(sampleFixture('sample-one')); await store.saveSample(sampleFixture('sample-two'));
  await store.deleteSample('sample-one');
  await assert.rejects(store.getSample('sample-one'), /No se encontró/);
  await store.deleteParticipant('P001');
  const snapshot = await store.snapshot();
  assert.equal(snapshot.participants.length, 0); assert.equal(snapshot.samples.length, 0);
  await assert.rejects(store.getSample('sample-two'), /No se encontró/);
  assert.equal((await store.document('backup')).samples.length, 0);
  assert.equal((await store.createParticipant()).id, 'P002');
});

test('a failed sequence write rolls back the queued sample metadata as one transaction', async () => {
  const store = database(); await prepared(store);
  const original = IDBObjectStore.prototype.add;
  IDBObjectStore.prototype.add = function (...args) { if (this.name === 'sequences') throw new DOMException('Storage full', 'QuotaExceededError'); return original.apply(this, args); };
  try { await assert.rejects(store.saveSample(sampleFixture()), { name: 'QuotaExceededError' }); }
  finally { IDBObjectStore.prototype.add = original; }
  assert.equal((await store.snapshot()).samples.length, 0);
  await store.saveSample(sampleFixture());
  assert.equal((await store.snapshot()).samples.length, 1);
});

test('JSON dataset and backup import preserve IDs, timing, points, world coordinates, quality and review state', async () => {
  const source = database(); await prepared(source);
  await source.saveSample(sampleFixture('sample-one'));
  await source.reviewSample('sample-one', 'accepted');
  for (const type of ['dataset', 'backup']) {
    const document = await source.document(type, exportedAt);
    const json = serializeDataset(document);
    const parsed = parseDatasetJSON(json);
    const destination = database(new IDBFactory(), `restored-${type}`);
    await destination.replace(parsed);
    assert.deepEqual(await destination.document(type, exportedAt), document);
    assert.equal(serializeDataset(await destination.document(type, exportedAt)), json);
    assert.equal((await destination.createParticipant()).id, 'P002');
  }
});

test('invalid imports are rejected before mutating an existing dataset', async () => {
  const store = database(); await prepared(store); await store.saveSample(sampleFixture());
  const original = await store.document('backup', exportedAt);
  const cases = [
    doc => { doc.schemaVersion = 2; },
    doc => { doc.participants[0].name = 'Not allowed'; },
    doc => { doc.samples[0].frames[1].timestampMs = doc.samples[0].frames[0].timestampMs; },
    doc => { doc.samples[0].frames[0].hands[0].landmarks.pop(); },
    doc => { doc.samples[0].captureMetadata.completed = false; },
    doc => { doc.samples[0].qualityMetrics.expectedHandsRatio = .12; },
    doc => { doc.samples[0].participantId = 'P999'; },
    doc => { doc.samples.push(structuredClone(doc.samples[0])); },
    doc => { doc.signs[0].expectedHands = '1'; },
    doc => { doc.signs[0].type = ['static']; },
  ];
  for (const corrupt of cases) {
    const changed = structuredClone(original); corrupt(changed);
    assert.throws(() => parseDatasetJSON(JSON.stringify(changed)));
    await assert.rejects(store.replace(changed));
    assert.deepEqual(await store.document('backup', exportedAt), original);
  }
  assert.throws(() => parseDatasetJSON('{oops'), /JSON válido/);
});

test('snapshots retain each original label definition when the catalog metadata changes', async () => {
  const store = database(); await prepared(store); await store.saveSample(sampleFixture());
  await store.saveSign({ ...signFixture, durationMs: 1800 });
  assert.equal((await store.snapshot()).signs[0].durationMs, 1800);
  assert.equal((await store.getSample('sample-test')).captureMetadata.labelSnapshot.name, signFixture.name);
  assert.equal((await store.getSample('sample-test')).captureMetadata.labelSnapshot.durationMs, 1500);
});

test('each catalog duration persists independently across connections without changing stable identity or source', async () => {
  const factory = new IDBFactory(); const store = database(factory);
  const initial = createInitialSignCatalog();
  for (const [index, sign] of initial.entries()) await store.saveSign({ ...sign, durationMs: 1000 + index * 100 });
  await store.close();
  const reloaded = await database(factory).snapshot();
  for (const [index, sign] of initial.entries()) {
    assert.deepEqual(reloaded.signs.find(item => item.id === sign.id), { ...sign, durationMs: 1000 + index * 100 });
  }
  for (const patch of [{ name: 'Otra seña' }, { type: 'dynamic' }, { expectedHands: 2 }, { validationStatus: 'validated' }, { sourceReference: { ...initial[0].sourceReference, page: 99 } }, { id: 'LSP-999' }]) {
    await assert.rejects(store.saveSign({ ...initial[0], ...patch }));
  }
});

async function legacyDocumentFixture(store) {
  await prepared(store);
  const signs = legacyCatalogFixture();
  signs[0] = { ...signs[0], name: 'Etiqueta anterior sin correspondencia', description: 'Solo para prueba de compatibilidad.', instructions: 'Secuencia sintética de prueba, no piloto.', validationStatus: 'validated' };
  const sample = sampleFixture('sample-historical', signs[0]);
  for (const key of ['qualityPolicyVersion', 'recordingStartedAtMs', 'coordinates', 'visualMirrored']) delete sample.captureMetadata[key];
  for (const frame of sample.frames) delete frame.sourceTimestamps;
  sample.qualityMetrics = calculateQuality(sample.frames, sample.durationMs, signs[0].expectedHands);
  sample.reviewStatus = 'accepted';
  return { ...await store.document('backup', exportedAt), signs, samples: [sample], collectedAt: sample.recordedAt };
}

test('a v1 legacy backup imports without relabeling, rewriting metrics, deleting or fabricating samples', async () => {
  const legacy = await legacyDocumentFixture(database());
  const parsed = parseDatasetJSON(serializeDataset(legacy));
  const destination = database(new IDBFactory(), 'legacy-restore');
  await destination.replace(parsed);
  const restored = await destination.document('backup', exportedAt);
  assert.equal(restored.signs.length, 21);
  assert.deepEqual(restored.signs.filter(sign => sign.id.startsWith('sign-')), legacy.signs);
  assert.deepEqual(restored.samples, legacy.samples);
  assert.equal(restored.samples[0].labelId, 'sign-01');
  assert.equal(restored.samples[0].captureMetadata.labelSnapshot.validationStatus, 'validated');
  assert.equal(restored.signs.filter(sign => sign.category === 'lsp').every(sign => sign.validationStatus === 'pending'), true);
  assert.equal(parseDatasetJSON(serializeDataset(restored)).samples.length, 1);
});

test('opening a real v1 store adds the new catalog atomically and idempotently while preserving old data', async () => {
  const factory = new IDBFactory(); const store = database(factory);
  const legacy = await legacyDocumentFixture(store);
  await store.replace(legacy); await store.close();
  // Simulate the actual pre-update IndexedDB catalog, entirely in the isolated test database.
  const db = await new Promise((resolve, reject) => { const open = factory.open('test-dataset', 1); open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error); });
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['signs'], 'readwrite');
    for (const sign of [...createInitialSignCatalog(), createNegativeExampleCategory()]) tx.objectStore('signs').delete(sign.id);
    tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
  }); db.close();
  const migrated = database(factory);
  const after = await migrated.document('backup', exportedAt);
  assert.equal(after.signs.length, 21);
  assert.deepEqual(after.signs.filter(sign => sign.id.startsWith('sign-')), legacy.signs);
  assert.deepEqual(after.samples, legacy.samples);
  assert.deepEqual(after.participants, legacy.participants);
  await migrated.saveSign({ ...after.signs.find(sign => sign.id === 'LSP-008'), durationMs: 3500 });
  await migrated.close();
  const reopened = await database(factory).document('backup', exportedAt);
  assert.equal(reopened.signs.length, 21);
  assert.equal(reopened.signs.find(sign => sign.id === 'LSP-008').durationMs, 3500);
  assert.deepEqual(reopened.samples, legacy.samples);
});

test('one-hand, two-hand and negative sequences all round-trip with source metadata and timestamps intact', async () => {
  const source = database(); await prepared(source);
  for (const sign of [createInitialSignCatalog()[5], createInitialSignCatalog()[7], createNegativeExampleCategory()]) {
    await source.saveSample(sampleFixture(`sample-${sign.id}`, sign));
  }
  const doc = await source.document('backup', exportedAt);
  const destination = database(new IDBFactory(), 'mixed-captures');
  await destination.replace(parseDatasetJSON(serializeDataset(doc)));
  assert.deepEqual(await destination.document('backup', exportedAt), doc);
  assert.equal(datasetStatistics(await destination.snapshot()).configuredSigns, 10);
  for (const corrupt of [
    value => { value.signs.pop(); },
    value => { value.signs[0].sourceReference.page = 134; },
    value => { value.signs[0].validationStatus = 'validated'; },
    value => { value.samples[0].frames[0].sourceTimestamps.capturedAtMs += 100; },
    value => { value.samples[0].frames[1].sourceTimestamps.inferenceTimestampMs = value.samples[0].frames[0].sourceTimestamps.inferenceTimestampMs; },
  ]) {
    const changed = structuredClone(doc); corrupt(changed);
    await assert.rejects(destination.replace(changed));
    assert.deepEqual(await destination.document('backup', exportedAt), doc);
  }
});
