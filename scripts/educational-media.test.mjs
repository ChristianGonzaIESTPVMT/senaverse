import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { getQuizVisual, hasEducationalMedia } from '../src/data/educationalMedia.ts';
import { getEducationalSign, getEducationalSignForClass, libraryEntries } from '../src/data/library.ts';
import { signQuizMedia } from '../src/data/signQuizMedia.ts';

test('the media catalog locates 33 PDF references and two dictionary references, and 35 signs have local photos and video', () => {
  const media = libraryEntries.map(entry => entry.media);
  const documents = media.flatMap(item => item.document ? [item.document] : []);
  const individual = media.filter(item => item.visual.availability === 'available').map(item => item.visual);
  assert.equal(documents.length, 35);
  assert.equal(documents.filter(item => item.source.page).length, 33);
  assert.equal(new Set(documents.map(item => item.location.url.split('#')[0])).size, 3);
  assert.equal(new Set(documents.map(item => item.signId)).size, documents.length);
  assert.equal(individual.length, 35);
  assert.ok(individual.every(item => item.kind === 'image'));
  assert.equal(media.filter(item => item.video.availability === 'available').length, 35);
  assert.equal(media.filter(hasEducationalMedia).length, 35);
  const ids = media.flatMap(item => [item.document?.id, item.visual.id, item.video.id, item.quizVisual?.id].filter(Boolean));
  assert.equal(new Set(ids).size, ids.length);
  for (const item of documents) {
    assert.ok(item.alt && item.locator && item.source.publisher && item.usage.label);
    assert.equal(item.validation, 'pending');
    if (!item.source.page) {
      assert.match(item.link.url, /^https:\/\/diccionariolsp\.pucp\.edu\.pe\//);
      assert.ok(['dictionary', 'related'].includes(item.referenceKind));
      continue;
    }
    const cartilla = item.source.page === 72;
    assert.ok(item.link.url.endsWith(`#page=${cartilla ? 14 : item.source.page}`));
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
  assert.equal(hasEducationalMedia(getEducationalSign('comida').media), false);
});

test('visual exercises use only resources without answer labels', () => {
  const entries = libraryEntries.filter(entry => getQuizVisual(entry.media));
  assert.equal(entries.length, 30);
  assert.deepEqual(entries.filter(entry => entry.recognitionClassId).map(entry => entry.id).toSorted(), ['LSP-001', 'LSP-002', 'LSP-003', 'LSP-004', 'LSP-005']);
  for (const entry of entries) assert.doesNotMatch(getQuizVisual(entry.media).alt, new RegExp(`\\b${entry.word}\\b`, 'iu'));
  const { media } = getEducationalSign('LSP-001');
  assert.equal(getQuizVisual(media), media.quizVisual);
  assert.equal(getQuizVisual({ ...media, quizVisual: undefined }), undefined);
  assert.equal(getQuizVisual({ ...media, quizVisual: undefined, visual: { ...media.visual, kind: 'sequence' } }), undefined);
});

test('all 25 imported pairs have real local files, neutral quiz descriptions and independent identification', async () => {
  const entries = libraryEntries.filter(entry => entry.media.visual.identification);
  assert.equal(entries.length, 25);
  assert.deepEqual(entries.filter(entry => entry.media.visual.identification === 'user-confirmed').map(entry => entry.id).sort(),
    ['adios', 'ayuda', 'gracias', 'no']);
  for (const entry of entries) {
    const { visual, video } = entry.media;
    const stem = visual.location.url.slice(0, -5);
    assert.match(stem, /\/media\/signs\/lsp-0[1-3]\d-/);
    assert.equal(visual.thumbnail.location.url, `${stem}-mini.webp`);
    assert.equal(video.location.url, `${stem}.mp4`);
    assert.equal(video.identification, visual.identification);
    assert.equal(entry.recognitionClassId, undefined);
    assert.equal(entry.validation, 'pending');
    for (const kind of ['photo', 'video']) assert.doesNotMatch(signQuizMedia(entry, kind).description, new RegExp(`\\b${entry.word}\\b`, 'iu'));
    const [jpeg, webp, mp4] = await Promise.all([visual, visual.thumbnail, video]
      .map(resource => readFile(new URL(`../public${resource.location.url}`, import.meta.url))));
    assert.equal(jpeg.readUInt16BE(0), 0xffd8);
    assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
    assert.equal(mp4.toString('ascii', 4, 8), 'ftyp');
  }
});
