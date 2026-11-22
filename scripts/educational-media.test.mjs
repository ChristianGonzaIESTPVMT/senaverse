import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getQuizVisual, hasEducationalMedia } from '../src/data/educationalMedia.ts';
import { getEducationalSign, getEducationalSignForClass, libraryEntries } from '../src/data/library.ts';

test('the public media catalog has 24 exact PDF references, five local diagrams and no unapproved clips or crops', () => {
  const media = libraryEntries.map(entry => entry.media);
  const documents = media.flatMap(item => item.document ? [item.document] : []);
  const individual = media.filter(item => item.visual.availability === 'available').map(item => item.visual);
  assert.equal(documents.length, 24);
  assert.equal(new Set(documents.map(item => item.location.url.split('#')[0])).size, 2);
  assert.equal(new Set(documents.map(item => item.signId)).size, documents.length);
  assert.equal(individual.length, 5);
  assert.ok(individual.every(item => item.kind === 'diagram'));
  assert.ok(media.every(item => item.video.availability === 'pending'));
  assert.equal(media.filter(hasEducationalMedia).length, 24);
  const ids = media.flatMap(item => [item.document?.id, item.visual.id, item.video.id].filter(Boolean));
  assert.equal(new Set(ids).size, ids.length);
  for (const item of documents) {
    assert.ok(item.alt && item.locator && item.source.publisher && item.source.page && item.usage.label);
    const cartilla = item.source.page === 72;
    assert.ok(item.link.url.endsWith(`#page=${cartilla ? 14 : item.source.page}`));
    assert.equal(item.validation, 'pending');
    if (!cartilla) assert.match(item.usage.url, /by-nc-nd/);
  }
});

test('all ten recognition classes resolve the exact same media object as Biblioteca', () => {
  for (let index = 1; index <= 10; index++) {
    const id = `LSP-${String(index).padStart(3, '0')}`;
    const entry = getEducationalSign(id);
    assert.equal(getEducationalSignForClass(id).media, entry.media);
    assert.equal(entry.media.document.link, entry.reference);
    if (index > 5) {
      assert.equal(entry.media.visual.availability, 'pending');
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
  assert.equal(getQuizVisual({ ...media, visual: { ...media.visual, kind: 'image', quizSafe: false } }), undefined);
  assert.equal(getQuizVisual({ ...media, visual: { ...media.visual, kind: 'sequence' } }), undefined);
});
