import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { readFile } from 'node:fs/promises';
import { IDBFactory } from 'fake-indexeddb';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { PROFILE_KEY, defaultProfile, restoreProfile } from '../src/data/profile.ts';
import { emptyProgress, restoreProgress, PROGRESS_KEY } from '../src/data/progress.ts';
import { THEME_KEY } from '../src/data/theme.ts';
import { PHOTO_INPUT_LIMIT, PHOTO_STORED_LIMIT, decodePhoto, drawPhotoCrop, encodePhoto, imageDimensions, openPhotoFile, photoCrop, validatePhotoFile, validateStoredPhoto } from '../src/data/profilePhoto.ts';
import { PHOTO_DB_NAME, cleanProfilePhotos, commitProfilePhoto, deleteProfilePhoto, readProfilePhoto, writeProfilePhoto } from '../src/data/profilePhotoStore.ts';
import { createProfileBackup } from '../src/data/profileBackup.ts';

const png = await readFile(new URL('../public/images/logo-senaverse.png', import.meta.url));
const photo = () => new Blob([png], { type: 'image/png' });
let closedBitmaps = 0;
const nativeDescriptors = Object.fromEntries(['indexedDB', 'localStorage', 'createImageBitmap'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
let values;
beforeEach(() => {
  values = new Map(); closedBitmaps = 0;
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } });
  // Browser decoding is mocked here; real native decoding is enforced by the app.
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, writable: true, value: async blob => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.length < 40) throw new Error('Corrupt image');
    const dimensions = imageDimensions(bytes, blob.type);
    if (!dimensions) throw new Error('Invalid image');
    return { ...dimensions, close() { closedBitmaps++; } };
  } });
});
process.on('exit', () => {
  for (const [name, descriptor] of Object.entries(nativeDescriptors)) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
  }
});

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
let Provider, Context, StudentAvatar, StudentLayout, ProgressContext, ProfilePage;
try {
  ({ StudentProfileProvider: Provider } = await server.ssrLoadModule('/src/components/StudentProfileProvider.tsx'));
  ({ ProfileContext: Context } = await server.ssrLoadModule('/src/hooks/profileContext.ts'));
  ({ StudentAvatar } = await server.ssrLoadModule('/src/components/StudentAvatar.tsx'));
  ({ StudentLayout } = await server.ssrLoadModule('/src/components/StudentLayout.tsx'));
  ({ ProgressContext } = await server.ssrLoadModule('/src/hooks/progressContext.ts'));
  ({ ProfilePage } = await server.ssrLoadModule('/src/pages/ProfilePage.tsx'));
} finally { await server.close(); }
function context() {
  let result;
  renderToStaticMarkup(createElement(Provider, null, createElement(Context.Consumer, null, value => { result = value; return null; })));
  return result;
}

test('legacy profiles and all built-in avatars survive; only safe photo references are restored', () => {
  assert.deepEqual(restoreProfile(JSON.stringify(defaultProfile())), defaultProfile());
  for (const photoId of ['https://example.test/photo', 'data:image/png;base64,bad', 'blob:external', '../dataset', 42]) {
    assert.equal(restoreProfile(JSON.stringify({ ...defaultProfile(), photoId })).photoId, undefined);
  }
  assert.equal(restoreProfile(JSON.stringify({ ...defaultProfile(), photoId: 'photo-valid-reference' })).photoId, 'photo-valid-reference');
});

test('photo validation rejects oversize, empty, disguised and corrupt files before saving', async () => {
  await assert.rejects(validatePhotoFile(new Blob([])), /5 MB/);
  await assert.rejects(validatePhotoFile(new Blob([new Uint8Array(PHOTO_INPUT_LIMIT + 1)], { type: 'image/png' })), /5 MB/);
  await assert.rejects(validatePhotoFile(new Blob(['<svg/>'], { type: 'image/png' })), /JPG, PNG o WebP/);
  await assert.rejects(validatePhotoFile(new Blob([png], { type: 'image/jpeg' })), /JPG, PNG o WebP/);
  await assert.rejects(openPhotoFile(new Blob([png.subarray(0, 24)], { type: 'image/png' })), /No se pudo leer/);
  await assert.rejects(validatePhotoFile(new Blob([new Uint8Array(PHOTO_STORED_LIMIT + 1)]), PHOTO_STORED_LIMIT), /192 KB/);
  assert.equal(await validatePhotoFile(photo()), 'image/png');
});

test('encoded dimensions prevent oversized allocations before decoding', async () => {
  const huge = Buffer.from(png); huge.writeUInt32BE(30000, 16);
  let called = false; globalThis.createImageBitmap = async () => { called = true; throw Error('Must not decode'); };
  await assert.rejects(openPhotoFile(new Blob([huge], { type: 'image/png' })), /demasiado grande/);
  assert.equal(called, false);
});

test('JPEG and WebP encoded dimensions are parsed as well as PNG', () => {
  assert.deepEqual(imageDimensions(png, 'image/png'), { width: 256, height: 256 });
  const jpeg = new Uint8Array([255,216,255,192,0,17,8,1,0,2,0,3,1,17,0,2,17,0,3,17,0]);
  assert.deepEqual(imageDimensions(jpeg, 'image/jpeg'), { width: 512, height: 256 });
  const webp = new Uint8Array(30); webp.set(Buffer.from('RIFF'), 0); webp.set(Buffer.from('WEBPVP8X'), 8); webp[24] = 255; webp[27] = 255;
  assert.deepEqual(imageDimensions(webp, 'image/webp'), { width: 256, height: 256 });
});

test('square cropping remains in bounds for portrait, landscape and all zoom/pan extremes', () => {
  for (const [width, height] of [[1200, 800], [800, 1200], [256, 256]]) for (const zoom of [1, 2, 3]) for (const pan of [-100, 0, 100]) {
    const crop = photoCrop(width, height, zoom, pan, -pan);
    assert.ok(crop.x >= 0 && crop.y >= 0);
    assert.ok(crop.x + crop.size <= width && crop.y + crop.size <= height);
    assert.equal(crop.size, Math.min(width, height) / zoom);
  }
  assert.deepEqual(photoCrop(1200, 800), { x: 200, y: 0, size: 800 });
});

test('native canvas receives the selected square and renders a sharp 256px image; bitmaps dispose', async () => {
  const decoded = await openPhotoFile(photo());
  let args;
  const drawing = { clearRect() {}, drawImage(...values) { args = values; } };
  const canvas = { getContext: () => drawing };
  drawPhotoCrop(canvas, { ...decoded, width: 1200, height: 800 }, 2, 100, -100);
  assert.equal(canvas.width, 256); assert.equal(canvas.height, 256);
  assert.deepEqual(args.slice(1), [800, 0, 400, 400, 0, 0, 256, 256]);
  assert.equal(drawing.imageSmoothingQuality, 'high');
  decoded.dispose(); assert.equal(closedBitmaps, 1);
});

test('encoding requests quality WebP and preserves alpha through PNG fallback', async () => {
  const requested = [];
  const canvas = { toBlob(callback, type, quality) { requested.push([type, quality]); callback(photo()); }, getContext() { return { getImageData() { return { data: new Uint8ClampedArray([10, 20, 30, 0]) }; } }; } };
  const result = await encodePhoto(canvas);
  assert.deepEqual(requested, [['image/webp', .9], ['image/png', .9]]);
  assert.equal(result.type, 'image/png');
  assert.ok(result.size < PHOTO_STORED_LIMIT);
});

test('stored photo validation requires a successfully decoded 256px bitmap', async () => {
  await validateStoredPhoto(photo());
  const wrong = Buffer.from(png); wrong.writeUInt32BE(128, 16);
  await assert.rejects(validateStoredPhoto(new Blob([wrong], { type: 'image/png' })), /256/);
  globalThis.createImageBitmap = async () => { throw Error('Damaged compressed pixels'); };
  await assert.rejects(validateStoredPhoto(photo()), /No se pudo leer/);
});

test('IndexedDB stores a Blob, persists over new connections and deletes only the requested photo', async () => {
  await writeProfilePhoto('photo-first-valid', photo());
  const saved = await readProfilePhoto('photo-first-valid');
  assert.ok(saved instanceof Blob); assert.equal(saved.size, png.length);
  assert.deepEqual(Buffer.from(await saved.arrayBuffer()), png);
  await deleteProfilePhoto('photo-first-valid');
  assert.equal(await readProfilePhoto('photo-first-valid'), null);
  assert.notEqual(PHOTO_DB_NAME, 'senaverse-dataset');
  await assert.rejects(writeProfilePhoto('https://remote', photo()), /inválida/);
});

test('failed reference persistence rolls back the Blob and leaves existing profile untouched', async () => {
  values.set(PROFILE_KEY, JSON.stringify(defaultProfile()));
  const before = values.get(PROFILE_KEY);
  await assert.rejects(commitProfilePhoto(defaultProfile(), photo(), { setItem() { throw Error('Quota'); } }), /referencia/);
  assert.equal(values.get(PROFILE_KEY), before);
  const databases = await indexedDB.databases();
  assert.deepEqual(databases.map(item => item.name), [PHOTO_DB_NAME]);
  const db = await new Promise(resolve => { const request = indexedDB.open(PHOTO_DB_NAME); request.onsuccess = () => resolve(request.result); });
  const keys = await new Promise(resolve => { const request = db.transaction('photos').objectStore('photos').getAllKeys(); request.onsuccess = () => resolve(request.result); });
  db.close(); assert.deepEqual(keys, []);
});

test('provider saves, reloads and replaces a photo, retaining only the latest reference', async () => {
  await context().savePhoto(photo());
  const first = context().profile.photoId;
  assert.ok(first); assert.ok(await readProfilePhoto(first));
  assert.ok(values.get(PROFILE_KEY).length < 400);
  assert.equal(values.get(PROFILE_KEY).includes('base64'), false);
  await context().savePhoto(photo());
  const second = context().profile.photoId;
  assert.notEqual(first, second);
  assert.equal(await readProfilePhoto(first), null);
  assert.ok(await readProfilePhoto(second));
});

test('returning to a preset removes the photo and reset also preserves progress and theme byte for byte', async () => {
  const progress = restoreProgress(null, '["saludos"]');
  values.set(PROGRESS_KEY, JSON.stringify(progress)); values.set(THEME_KEY, 'dark'); values.set('dataset-sentinel', 'keep');
  const before = [...values.entries()];
  await context().savePhoto(photo()); const first = context().profile.photoId;
  await context().saveAvatar('cat');
  assert.equal(context().profile.avatarId, 'cat'); assert.equal(context().profile.photoId, undefined);
  assert.equal(await readProfilePhoto(first), null);
  await context().savePhoto(photo()); const second = context().profile.photoId;
  await context().resetProfile();
  assert.deepEqual(context().profile, defaultProfile()); assert.equal(await readProfilePhoto(second), null);
  assert.deepEqual([...values.entries()].filter(([key]) => key !== PROFILE_KEY), before);
});

test('backup v2 embeds a bounded validated photo and real progress without an internal-only reference', async () => {
  const profile = { ...defaultProfile(), photoId: 'photo-export-valid' };
  const progress = restoreProgress(null, '["saludos"]');
  const backup = await createProfileBackup(profile, progress, photo());
  assert.equal(backup.schemaVersion, 2); assert.equal(backup.profile.photoId, undefined);
  assert.equal(backup.profile.avatar.kind, 'photo');
  assert.deepEqual(Buffer.from(backup.profile.avatar.dataUrl.split(',')[1], 'base64'), png);
  assert.equal(backup.progressSummary.xp, 80);
  assert.equal(JSON.stringify(backup).includes('dataset'), false);
  await assert.rejects(createProfileBackup(profile, progress, null), /recuperar/);
  await assert.rejects(createProfileBackup(profile, progress, new Blob(['<svg/>'], { type: 'image/png' })), /JPG/);
  const preset = await createProfileBackup(defaultProfile(), emptyProgress(), null);
  assert.deepEqual(preset.profile.avatar, { kind: 'preset', id: 'hand' });
});

test('shared avatar refuses remote and data URLs and both page/header receive the same local photo', () => {
  for (const photoUrl of ['https://remote.test/photo.png', 'data:image/png;base64,AA']) {
    assert.doesNotMatch(renderToStaticMarkup(createElement(StudentAvatar, { avatarId: 'cat', photoUrl })), /<img/);
  }
  const shared = { profile: { ...defaultProfile(), photoId: 'photo-ui-reference' }, photoUrl: 'blob:local-avatar', storageAvailable: true, photoLoading: false, saveAvatar() {}, savePhoto() {}, savePersonalInfo() {}, resetProfile() {} };
  const html = renderToStaticMarkup(createElement(Context, { value: shared }, createElement(ProgressContext, { value: { progress: emptyProgress() } }, createElement(MemoryRouter, null, createElement(StudentLayout, null, createElement(ProfilePage))))));
  assert.equal((html.match(/src="blob:local-avatar"/g) ?? []).length, 3); // Header, summary and current-photo preview.
  assert.match(html, /Foto personalizada/);
  assert.equal((html.match(/class="profile-avatar-option[ \x22]/g) ?? []).length, 6);
});

test('cleanup does not delete the active photo or another tab’s recently staged Blob', async () => {
  await writeProfilePhoto('photo-staged-valid', photo());
  const next = await commitProfilePhoto(defaultProfile(), photo());
  await cleanProfilePhotos();
  assert.ok(await readProfilePhoto(next.photoId));
  assert.ok(await readProfilePhoto('photo-staged-valid'));
});
