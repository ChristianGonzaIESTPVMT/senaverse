import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROFILE_BIO_LIMIT, PROFILE_KEY, PROFILE_NAME_LIMIT, createProfileExport, defaultProfile, profileAvatars, restoreProfile, validatePersonalInfo } from '../src/data/profile.ts';
import { PROGRESS_KEY, emptyProgress, recordProgressEvent, recordSignConsultation, summarizeProgress } from '../src/data/progress.ts';

test('a local profile starts with neutral defaults and a storage key independent of progress', () => {
  assert.deepEqual(restoreProfile(null), { version: 1, displayName: 'Estudiante', bio: '', avatarId: 'hand' });
  assert.notEqual(PROFILE_KEY, PROGRESS_KEY);
  assert.equal(new Set(profileAvatars.map(avatar => avatar.id)).size, 6);
});

test('personal information trims and collapses spaces while keeping Spanish text', () => {
  assert.deepEqual(validatePersonalInfo({ displayName: '  Lucía   Pérez  ', bio: '  Aprendo\n lengua\t de señas.  ' }), {
    value: { displayName: 'Lucía Pérez', bio: 'Aprendo lengua de señas.' }, errors: {},
  });
});

test('an empty name and oversized fields have specific errors; biography is optional', () => {
  assert.ok(validatePersonalInfo({ displayName: ' \n\t ', bio: '' }).errors.displayName);
  assert.ok(validatePersonalInfo({ displayName: 'a'.repeat(PROFILE_NAME_LIMIT + 1), bio: '' }).errors.displayName);
  assert.ok(validatePersonalInfo({ displayName: 'Ana', bio: 'a'.repeat(PROFILE_BIO_LIMIT + 1) }).errors.bio);
  assert.deepEqual(validatePersonalInfo({ displayName: 'a'.repeat(PROFILE_NAME_LIMIT), bio: 'a'.repeat(PROFILE_BIO_LIMIT) }).errors, {});
  assert.deepEqual(validatePersonalInfo({ displayName: 'Ana', bio: '' }).errors, {});
});

test('malformed storage and unknown schema versions recover to a safe profile', () => {
  for (const stored of ['{oops', '[]', 'null', '42', '{}', '{"version":2,"displayName":"Futuro"}']) {
    assert.deepEqual(restoreProfile(stored), defaultProfile());
  }
});

test('restoration validates each field and never accepts arbitrary avatars or extra personal data', () => {
  const restored = restoreProfile(JSON.stringify({ version: 1, displayName: '  Inés  ', bio: 'a'.repeat(PROFILE_BIO_LIMIT + 1), avatarId: 'https://invalid.test/photo', email: 'ignored@example.test', xp: 999 }));
  assert.deepEqual(restored, { version: 1, displayName: 'Inés', bio: '', avatarId: 'hand' });
  assert.deepEqual(restoreProfile(JSON.stringify({ version: 1, displayName: false, bio: '  Hola  ', avatarId: 'cat' })), { version: 1, displayName: 'Estudiante', bio: 'Hola', avatarId: 'cat' });
  assert.equal(restoreProfile(JSON.stringify({ version: 1, displayName: 'a'.repeat(41), bio: 42, avatarId: null })).displayName, 'Estudiante');
});

test('every built-in avatar and valid profile survive a storage round trip', () => {
  for (const { id } of profileAvatars) {
    const profile = { version: 1, displayName: 'Estudiante de LSP', bio: 'Aprendiendo cada día.', avatarId: id };
    assert.deepEqual(restoreProfile(JSON.stringify(profile)), profile);
  }
});

test('JSON export uses real progress and achievements, a schema version, and excludes dataset and unknown data', () => {
  let progress = recordProgressEvent(emptyProgress(), { type: 'lesson', lessonId: 'introduccion' }, '2026-11-17T15:00:00Z');
  for (const id of ['hola', 'gracias', 'adios']) progress = recordSignConsultation(progress, id);
  const before = JSON.stringify(progress);
  const profile = { ...defaultProfile(), displayName: 'Ana', avatarId: 'cat' };
  const data = createProfileExport({ ...profile, email: 'ignored', dataset: ['private'] }, { ...progress, samples: ['private'], xp: 99999 }, '2026-11-17T15:30:00Z');
  const exported = JSON.parse(JSON.stringify(data));
  assert.equal(exported.schemaVersion, 1);
  assert.equal(exported.exportedAt, '2026-11-17T15:30:00Z');
  assert.deepEqual(exported.profile, profile);
  assert.deepEqual(exported.progress, progress);
  assert.equal(exported.progressSummary.xp, summarizeProgress(progress).xp);
  assert.equal(exported.progressSummary.completedLessons, 1);
  assert.deepEqual(exported.progressSummary.achievements.map(item => item.id), ['first-step', 'explorer']);
  assert.equal(JSON.stringify(data).includes('private'), false);
  assert.equal(JSON.stringify(data).includes('ignored'), false);
  assert.equal(JSON.stringify(progress), before);
});

test('an empty export never fabricates progress, XP or achievements', () => {
  const data = createProfileExport(defaultProfile(), emptyProgress());
  assert.deepEqual(data.progressSummary, { xp: 0, completedLessons: 0, achievements: [] });
  assert.deepEqual(data.progress, emptyProgress());
});
