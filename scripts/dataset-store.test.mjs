import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { DatasetStore, datasetStatistics } from '../src/features/sign-recognition/dataset/datasetStore.ts';
import { parseDatasetJSON, serializeDataset } from '../src/features/sign-recognition/dataset/datasetExport.ts';
import { sampleFixture, signFixture } from './fixtures/dataset.mjs';

const stores = [];
afterEach(async () => { await Promise.all(stores.splice(0).map(store => store.close())); });
function database(factory = new IDBFactory(), name = 'test-dataset') { const store = new DatasetStore(factory, name); stores.push(store); return store; }
async function prepared(store) { const participant = await store.createParticipant(); await store.consentParticipant(participant.id); await store.saveSign(signFixture); return participant; }
const exportedAt = '2026-11-17T14:00:00.000Z';

test('IndexedDB initializes ten empty slots and persists anonymous participants across connections', async () => {
  const factory = new IDBFactory(); const store = database(factory);
  const empty = await store.snapshot();
  assert.deepEqual(datasetStatistics(empty), { participants: 0, configuredSigns: 0, samples: 0, pending: 0, bySign: Object.fromEntries(empty.signs.map(sign => [sign.id, 0])), byParticipant: {} });
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
  await store.saveSign({ ...signFixture, name: 'Etiqueta revisada por operador' });
  assert.equal((await store.snapshot()).signs[0].name, 'Etiqueta revisada por operador');
  assert.equal((await store.getSample('sample-test')).captureMetadata.labelSnapshot.name, signFixture.name);
});
