import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { getQuizVisual, hasEducationalMedia } from '../src/data/educationalMedia.ts';
import { getEducationalSign, getEducationalSignForClass, libraryEntries } from '../src/data/library.ts';

test('the media catalog has 24 exact PDF references, ten original photos and ten original videos', () => {
  const media = libraryEntries.map(entry => entry.media);
  const documents = media.flatMap(item => item.document ? [item.document] : []);
  const individual = media.filter(item => item.visual.availability === 'available').map(item => item.visual);
  assert.equal(documents.length, 24);
  assert.equal(new Set(documents.map(item => item.location.url.split('#')[0])).size, 2);
  assert.equal(new Set(documents.map(item => item.signId)).size, documents.length);
  assert.equal(individual.length, 10);
  assert.ok(individual.every(item => item.kind === 'image'));
  assert.equal(media.filter(item => item.video.availability === 'available').length, 10);
  assert.equal(media.filter(hasEducationalMedia).length, 24);
  const ids = media.flatMap(item => [item.document?.id, item.visual.id, item.video.id, item.quizVisual?.id].filter(Boolean));
  assert.equal(new Set(ids).size, ids.length);
  for (const item of documents) {
    assert.ok(item.alt && item.locator && item.source.publisher && item.source.page && item.usage.label);
    const cartilla = item.source.page === 72;
    assert.ok(item.link.url.endsWith(`#page=${cartilla ? 14 : item.source.page}`));
    assert.equal(item.validation, 'pending');
    if (!cartilla) assert.match(item.usage.url, /by-nc-nd/);
  }
});

test('the ten recognition classes share their exact media with Biblioteca and both real files exist', async () => {
  const slugs = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'si', 'nada', 'mucho', 'solo', 'con'];
  for (let index = 1; index <= 10; index++) {
    const id = `LSP-${String(index).padStart(3, '0')}`;
    const entry = getEducationalSign(id);
    assert.equal(getEducationalSignForClass(id).media, entry.media);
    assert.equal(entry.media.document.link, entry.reference);
    const { visual, video, document } = entry.media;
    const path = `/media/signs/${id.toLowerCase()}-${slugs[index - 1]}`;
    assert.deepEqual([visual.kind, video.availability, visual.width, visual.height], ['image', 'available', 1200, 1600]);
    assert.deepEqual([visual.location.url, video.location.url], [`${path}.jpeg`, `${path}.mp4`]);
    for (const resource of [visual, video]) {
      assert.equal(resource.signId, id);
      assert.equal(resource.location.type, 'local');
      assert.equal(resource.validation, 'pending');
      assert.ok(resource.alt.includes(entry.word));
      assert.notEqual(resource.source.publisher, document.source.publisher);
      assert.equal(resource.source.url, undefined);
    }
    const [jpeg, mp4] = await Promise.all([visual, video].map(resource => readFile(new URL(`../public${resource.location.url}`, import.meta.url))));
    assert.equal(jpeg.readUInt16BE(0), 0xffd8);
    assert.equal(mp4.toString('ascii', 4, 8), 'ftyp');
    if (index > 5) {
      assert.match(entry.media.document.locator, /flecha|movimiento|desplazamiento/);
    }
  }
  assert.equal(getEducationalSign('uno'), getEducationalSignForClass('LSP-001'));
  assert.equal(hasEducationalMedia(getEducationalSign('hola').media), false);
});

test('visual exercises use only resources without answer labels', () => {
  const entries = libraryEntries.filter(entry => getQuizVisual(entry.media));
  assert.deepEqual(entries.map(entry => entry.id).toSorted(), ['LSP-001', 'LSP-002', 'LSP-003', 'LSP-004', 'LSP-005']);
  for (const entry of entries) assert.doesNotMatch(getQuizVisual(entry.media).alt, new RegExp(`\\b${entry.word}\\b`, 'iu'));
  const { media } = entries[0];
  assert.equal(getQuizVisual(media), media.quizVisual);
  assert.equal(getQuizVisual({ ...media, quizVisual: undefined }), undefined);
  assert.equal(getQuizVisual({ ...media, quizVisual: undefined, visual: { ...media.visual, kind: 'sequence' } }), undefined);
});
