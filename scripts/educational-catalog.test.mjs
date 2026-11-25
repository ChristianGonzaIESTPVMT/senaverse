import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getEducationalSign, getEducationalSignForClass, libraryCategories,
  libraryEntries, normalizeLibrarySignIds, searchLibrary } from '../src/data/library.ts';
import { numbersLesson } from '../src/data/numbersLesson.ts';
import { recognitionSigns, resolvePracticeSign } from '../src/features/sign-recognition/recognitionCatalog.ts';
import { createDatasetCatalog } from '../src/features/sign-recognition/dataset/signCatalog.ts';
import { createProfileExport, restoreProfile, toggleFavoriteSign } from '../src/data/profile.ts';
import { emptyProgress, recordSignConsultation, restoreProgress, summarizeProgress } from '../src/data/progress.ts';

const search = (query, options = {}) => searchLibrary({ query, category: 'all', compatible: false, ...options });

test('educational entries are unique and explicitly map only the ten V1 classes', () => {
  assert.equal(libraryEntries.length, 36);
  assert.equal(libraryEntries.filter(entry => entry.reference).length, 35);
  assert.equal(new Set(libraryEntries.map(entry => entry.id)).size, libraryEntries.length);
  assert.equal(libraryEntries.filter(entry => entry.recognitionClassId).length, 10);
  assert.ok(libraryEntries.every(entry => libraryCategories.some(category => category.id === entry.category)));
  for (const label of recognitionSigns) {
    const entry = getEducationalSignForClass(label.id);
    assert.equal(entry.id, label.id);
    assert.equal(entry.word, label.name);
    assert.equal(entry.type, label.type);
    assert.equal(entry.hands, label.expectedHands);
    assert.equal(entry.validation, 'pending');
    assert.ok(entry.instructions && entry.reference?.url && entry.source?.url);
    assert.equal(resolvePracticeSign(entry.recognitionClassId).id, label.id);
  }
  assert.equal(getEducationalSign('NEG-001'), undefined);
  assert.ok(createDatasetCatalog().some(entry => entry.id === 'NEG-001'));
  assert.match(getEducationalSign('cero').reference.url, /#page=73$/);
  assert.equal(getEducationalSign('cero').recognitionClassId, undefined);
  assert.equal(getEducationalSign('hola').media.document.referenceKind, 'mention');
  assert.equal(getEducationalSign('carne').source.page, 107);
  assert.notEqual(getEducationalSign('carne').id, getEducationalSign('comida').id);
  assert.equal(getEducationalSignForClass('LSP-036'), undefined);
  assert.equal(getEducationalSign('__proto__'), undefined);
});

test('accent-insensitive search combines category, compatibility and favorites', () => {
  assert.deepEqual(search('MAMÁ').map(entry => entry.id), ['mama']);
  assert.deepEqual(search('sí', { category: 'respuestas', compatible: true }).map(entry => entry.id), ['LSP-006']);
  assert.deepEqual(search('3', { category: 'numeros', compatible: true, favorites: ['LSP-003'] }).map(entry => entry.id), ['LSP-003']);
  assert.deepEqual(search('', { category: 'numeros', compatible: true, favorites: ['cero'] }), []);
  assert.deepEqual(search('', { category: 'numeros' }).map(entry => entry.id).sort(),
    ['LSP-001', 'LSP-002', 'LSP-003', 'LSP-004', 'LSP-005', 'cero', 'diez', 'nueve', 'ocho', 'seis', 'siete']);
});

test('numbers study and practice reuse the exact catalog instructions, reference and stable destinations', () => {
  for (const step of numbersLesson.steps) {
    if (step.kind !== 'practice') continue;
    const sign = getEducationalSign(step.targetId);
    assert.equal(step.instruction, sign.instructions);
    assert.equal(step.reference, sign.reference);
    assert.deepEqual(sign.lesson, { unitId: 2, lessonId: 'numeros', title: 'Números básicos' });
  }
});

test('prior bookmarks migrate aliases, deduplicate, persist removal and preserve student data', () => {
  const legacy = JSON.stringify(['uno', 'LSP-001', 'si', 'hola', 'NEG-001']);
  const original = { version: 1, displayName: 'Luz', avatarId: 'sun', bio: 'Mi presentación' };
  const old = restoreProfile(JSON.stringify(original), legacy);
  assert.deepEqual(old.favoriteSignIds, ['LSP-001', 'LSP-006', 'hola']);
  assert.equal(old.displayName, original.displayName);
  assert.equal(old.bio, original.bio);
  let next = toggleFavoriteSign(old, 'uno');
  next = toggleFavoriteSign(next, 'LSP-006');
  next = toggleFavoriteSign(next, 'hola');
  assert.deepEqual(restoreProfile(JSON.stringify(next), legacy).favoriteSignIds, []);
  assert.equal(toggleFavoriteSign(next, 'NEG-001'), next);
  next = toggleFavoriteSign(next, 'cero');
  assert.deepEqual(createProfileExport(next, emptyProgress()).profile.favoriteSignIds, ['cero']);
  assert.deepEqual(normalizeLibrarySignIds(['si', 'LSP-006', 'uno']), ['LSP-006', 'LSP-001']);
});

test('existing consultation progress resolves legacy aliases without counting a visit twice', () => {
  const prior = { ...emptyProgress(), consultedSignIds: ['uno', 'LSP-001', 'dos'] };
  const state = restoreProgress(JSON.stringify(prior));
  assert.deepEqual(state.consultedSignIds, ['LSP-001', 'LSP-002']);
  assert.equal(recordSignConsultation(state, 'uno'), state);
  assert.equal(summarizeProgress(state).achievements.find(item => item.id === 'explorer').obtained, false);
});
