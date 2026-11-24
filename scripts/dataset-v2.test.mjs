import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { DatasetStore } from '../src/features/sign-recognition/dataset/datasetStore.ts';
import { combineDatasetFiles } from '../src/features/sign-recognition/dataset/datasetBlocks.ts';
import { campaignHandWarnings, campaignSlots, campaignSlotsById, campaignSlotState } from '../src/features/sign-recognition/dataset/datasetCampaign.ts';
import { DatasetCapture } from '../src/features/sign-recognition/dataset/datasetCapture.ts';
import { inferenceFixture, sampleFixture } from './fixtures/dataset.mjs';

function database(t) {
  const store = new DatasetStore(new IDBFactory());
  t.after(() => store.close());
  return store;
}

async function guided(store, participant, slotId, id, counts) {
  const slot = campaignSlotsById.get(slotId);
  const sign = (await store.snapshot()).signs.find(entry => entry.id === slot.labelId);
  const current = await store.consentParticipant(participant.id);
  let now = 0;
  const capture = new DatasetCapture({
    now: () => now, id: () => id,
    isoNow: () => new Date(Date.parse(current.consentedAt) + 1).toISOString(),
  });
  capture.start({ participant: current, sign: { ...sign, durationMs: slot.durationMs, expectedHands: slot.hands },
    repetition: 1, sessionConsent: true, campaign: { slotId, session: slot.session,
      hand: slot.targetHand ?? (slot.hands === 0 ? 'none' : slot.hands === 2 ? 'both' : 'left'),
      ...(slot.subtype && { negativeSubtype: slot.subtype }), notes: 'Ejecución sintética de prueba áé.' } });
  for (let timestamp = 0; timestamp < slot.durationMs; timestamp += 50) {
    const event = inferenceFixture(timestamp, counts?.(timestamp) ?? slot.hands);
    now = event.receivedAtMs;
    capture.accept(event);
  }
  now = slot.durationMs + 120;
  return store.saveSample(capture.advance().draft);
}

function asFile({ name, text }) {
  return new File([text], name, { type: 'application/json' });
}

test('la guía V2 distribuye 32 tomas y los 11 subtipos negativos en dos sesiones', () => {
  assert.equal(campaignSlots.length, 32);
  assert.equal(new Set(campaignSlots.map(slot => slot.id)).size, 32);
  for (const session of [1, 2]) assert.equal(campaignSlots.filter(slot => slot.session === session).length, 16);
  for (let number = 1; number <= 5; number++) {
    const pair = campaignSlots.filter(slot => slot.labelId === `LSP-00${number}`);
    assert.deepEqual(new Set(pair.map(slot => slot.targetHand)), new Set(['left', 'right']));
    assert.ok(pair.every(slot => slot.durationMs === 2000));
  }
  for (let number = 6; number <= 10; number++) {
    const pair = campaignSlots.filter(slot => slot.labelId === `LSP-${String(number).padStart(3, '0')}`);
    assert.equal(pair.length, 2);
    assert.ok(pair.every(slot => slot.durationMs === ([8, 10].includes(number) ? 3000 : 2500)));
  }
  const negative = campaignSlots.filter(slot => slot.labelId === 'NEG-001');
  assert.deepEqual([0, 1, 2].map(hands => negative.filter(slot => slot.hands === hands).length), [2, 5, 5]);
  assert.equal(new Set(negative.map(slot => slot.subtype)).size, 11);
});

test('conserva la partición, fecha de consentimiento, mano y estado de revisión de la sesión', async t => {
  const store = database(t);
  const person = await store.createParticipant();
  await store.setParticipantPartition(person.id, 'validation');
  const sample = await guided(store, person, '1-lsp-1', 'sample-guided');
  assert.equal(sample.captureMetadata.campaign.session, 1);
  assert.equal(sample.captureMetadata.campaign.hand, 'right');
  assert.match(campaignHandWarnings(sample).join(' '), /difieren/);
  const slot = campaignSlotsById.get('1-lsp-1');
  assert.equal(campaignSlotState([sample], slot), 'Guardada · falta revisión');
  await store.reviewSample(sample.sampleId, 'accepted');
  await store.updateSampleReviews([sample.sampleId], 'mark');
  await store.annotateCampaign(sample.sampleId, '  Se observó el movimiento completo.  ');
  assert.equal((await store.getSample(sample.sampleId)).captureMetadata.campaign.notes, 'Se observó el movimiento completo.');
  assert.equal(campaignSlotState((await store.snapshot()).samples, slot), 'Revisada y aceptada');
  await store.setV2Exclusion(sample.sampleId, true);
  assert.equal(campaignSlotState((await store.snapshot()).samples, slot), 'Repetir');
  await assert.rejects(store.setParticipantPartition(person.id, 'test'), /ya tiene tomas/);

  const { samples, participants } = await combineDatasetFiles((await store.blocks({ participantId: person.id, session: 1 }, 1024 * 1024)).map(asFile));
  assert.deepEqual(participants.map(p => p.partition), ['validation']);
  assert.deepEqual(samples[0], await store.getSample(sample.sampleId));
});

test('cero manos guiado comprueba ausencia real y una observación con manos impide aceptar', async t => {
  const store = database(t), person = await store.createParticipant();
  await store.setParticipantPartition(person.id, 'test');
  const clean = await guided(store, person, '2-neg-6', 'sample-empty');
  const dirty = await guided(store, person, '2-neg-6', 'sample-contaminated', ts => ts === 300 ? 1 : 0);
  assert.equal(clean.qualityMetrics.expectedHandsRatio, 1);
  assert.equal(clean.qualityMetrics.maximumHands, 0);
  assert.ok(dirty.qualityMetrics.expectedHandsRatio < 1);
  assert.match(dirty.qualityMetrics.warnings.join(' '), /debía estar vacía/);
  await assert.rejects(store.reviewSample(dirty.sampleId, 'accepted'), /calidad insuficiente/);
});

test('exporta por tamaño real, participante y selección; ningún respaldo borra las muestras', async t => {
  const store = database(t);
  const person = await store.createParticipant();
  await store.consentParticipant(person.id);
  const first = await store.saveSample(sampleFixture('sample-a'));
  const second = await store.saveSample(sampleFixture('sample-b'));
  const total = await store.document('backup');
  const utf8 = sample => Buffer.byteLength(JSON.stringify(JSON.stringify(sample)));
  const maxBytes = Math.max(utf8(first), utf8(second)) + 14000;
  const files = (await store.blocks({ participantId: person.id }, maxBytes)).map(asFile);
  assert.equal(files.length, 2);
  assert.ok(files.every(file => file.size <= maxBytes));
  assert.deepEqual((await combineDatasetFiles([files[1], files[0], files[0]])).samples, total.samples);
  await assert.rejects(combineDatasetFiles([files[0]]), /Lote incompleto/);
  const only = await combineDatasetFiles((await store.blocks({ sampleIds: ['sample-b'] }, maxBytes)).map(asFile));
  assert.deepEqual(only.samples, [second]);
  await assert.rejects(store.blocks({ sampleIds: ['inexistente'] }, maxBytes), /selección cambió/);
  assert.equal((await store.snapshot()).samples.length, 2);
});

test('detecta alteraciones, conflictos de sampleId y respaldos parciales', async t => {
  const store = database(t), person = await store.createParticipant();
  await store.consentParticipant(person.id);
  const original = await store.saveSample(sampleFixture('sample-preserve'));
  const [file] = await store.blocks({}, 1024 * 1024);
  const corrupt = JSON.parse(file.text);
  corrupt.payload = corrupt.payload.replace('sample-preserve', 'sample-changed');
  await assert.rejects(combineDatasetFiles([asFile({ ...file, text: JSON.stringify(corrupt) })]), /integridad/);

  const backup = await combineDatasetFiles([asFile(file)]);
  await store.verifyBackup(backup);
  const conflicting = { ...backup, samples: [{ ...original, operatorReviewed: true }] };
  await assert.rejects(combineDatasetFiles([asFile(file), asFile({ name: 'other.json', text: JSON.stringify(conflicting) })]), /Conflicto de contenido/);
  await assert.rejects(store.verifyBackup({ ...backup, collectedAt: null, samples: [] }), /no coincide/);
  await assert.rejects(store.replace(conflicting, null), /Verifica primero/);
  await store.updateSampleReviews([original.sampleId], 'mark');
  await assert.rejects(store.replace(conflicting, backup), /no coincide/);
  assert.equal((await store.getSample(original.sampleId)).operatorReviewed, true);
});

test('combina en vacío y reimporta de forma idempotente; un conflicto revierte toda la transacción', async t => {
  const source = database(t), target = database(t);
  const person = await source.createParticipant();
  await source.consentParticipant(person.id);
  const first = await source.saveSample(sampleFixture('sample-first'));
  const second = await source.saveSample(sampleFixture('sample-second'));
  const backup = await combineDatasetFiles((await source.blocks({}, 1024 * 1024)).map(asFile));
  const conflicting = { ...backup, samples: [{ ...first, operatorReviewed: true }, second] };
  const partial = { ...backup, samples: [first] };
  assert.deepEqual(await target.merge(partial), { added: 1, duplicates: 0 });
  await assert.rejects(target.merge({ ...conflicting, samples: [second, conflicting.samples[0]] }), /Conflicto de contenido/);
  await assert.rejects(target.getSample(second.sampleId), /muestra completa/);
  assert.deepEqual(await target.merge(backup), { added: 1, duplicates: 1 });
  assert.deepEqual(await target.merge(backup), { added: 0, duplicates: 2 });
  assert.deepEqual(await target.getSample(first.sampleId), first);
});
