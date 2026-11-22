import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { PROFILE_KEY, defaultProfile } from '../src/data/profile.ts';
import { PROGRESS_KEY, emptyProgress, recordSignConsultation, restoreProgress } from '../src/data/progress.ts';
import { THEME_KEY } from '../src/data/theme.ts';

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
let ProfilePage, StudentLayout, StudentProfileProvider, ProgressContext, ProfileContext;
try {
  ({ ProfilePage } = await server.ssrLoadModule('/src/pages/ProfilePage.tsx'));
  ({ StudentLayout } = await server.ssrLoadModule('/src/components/StudentLayout.tsx'));
  ({ StudentProfileProvider } = await server.ssrLoadModule('/src/components/StudentProfileProvider.tsx'));
  ({ ProgressContext } = await server.ssrLoadModule('/src/hooks/progressContext.ts'));
  ({ ProfileContext } = await server.ssrLoadModule('/src/hooks/profileContext.ts'));
} finally {
  await server.close();
}

function withStorage(initial, action) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map(Object.entries(initial));
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try { return action(values, storage); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
}

function readProfileContext() {
  let context;
  renderToStaticMarkup(createElement(StudentProfileProvider, null, createElement(ProfileContext.Consumer, null, value => { context = value; return null; })));
  return context;
}

function renderProfile(progress = emptyProgress()) {
  return renderToStaticMarkup(createElement(ProgressContext, { value: { progress, recordActivity() { throw new Error('Viewing a profile must not record activity'); }, consultSign() { throw new Error('Viewing a profile must not consult signs'); } } },
    createElement(StudentProfileProvider, null, createElement(MemoryRouter, { initialEntries: ['/perfil'] }, createElement(StudentLayout, null, createElement(ProfilePage))))));
}

test('the profile renders exactly three main sections, existing navigation, real zeroes and both dialogs', () => withStorage({}, () => {
  const html = renderProfile();
  assert.match(html, /<h1>Mi perfil<\/h1>/);
  assert.match(html, /Personaliza tu experiencia de aprendizaje en SeñaVerse/);
  assert.match(html, /Perfil local/);
  assert.equal((html.match(/<section /g) ?? []).length, 3);
  assert.match(html, /Información personal/);
  assert.match(html, /Configuración/);
  assert.match(html, /XP acumulados<\/dt><dd>0<\/dd>/);
  assert.match(html, /Lecciones completadas<\/dt><dd>0<\/dd>/);
  assert.match(html, /Logros obtenidos<\/dt><dd>0<\/dd>/);
  assert.match(html, /<a[^>]*aria-label="Ver mi perfil: Estudiante"[^>]*aria-current="page"[^>]*href="\/perfil"/);
  assert.match(html, /<dialog[^>]*aria-labelledby="profile-avatar-title"/);
  assert.match(html, /<dialog[^>]*aria-labelledby="profile-reset-title"/);
  assert.equal((html.match(/class="profile-avatar-option[ \x22]/g) ?? []).length, 6);
  assert.match(html, /type="file" accept="image\/jpeg,image\/png,image\/webp"/);
  assert.doesNotMatch(html, /Contraseña|Correo electrónico/);
}));

test('profile statistics and header XP use the same real records without mutating progress', () => withStorage({}, () => {
  let progress = restoreProgress(JSON.stringify({ ...emptyProgress(), activities: [
    { id: 'lesson:introduccion', type: 'lesson', targetId: 'introduccion', occurredAt: '2026-11-17T15:00:00Z' },
  ] }));
  for (const id of ['hola', 'gracias', 'adios']) progress = recordSignConsultation(progress, id);
  const before = JSON.stringify(progress);
  const html = renderProfile(progress);
  assert.match(html, />80 XP</);
  assert.match(html, /XP acumulados<\/dt><dd>80<\/dd>/);
  assert.match(html, /Lecciones completadas<\/dt><dd>0<\/dd>/);
  assert.match(html, /1 finalización anterior/);
  assert.match(html, /Logros obtenidos<\/dt><dd>2<\/dd>/);
  assert.equal(JSON.stringify(progress), before);
}));

test('saved personal information and avatar appear consistently in the summary and shared header', () => withStorage({ [PROFILE_KEY]: JSON.stringify({ ...defaultProfile(), displayName: 'Lucía', bio: 'Me gusta aprender LSP.', avatarId: 'cat' }) }, () => {
  const html = renderProfile();
  assert.match(html, /id="profile-student-name">Lucía<\/h2>/);
  assert.match(html, /Ver mi perfil: Lucía/);
  assert.match(html, /Me gusta aprender LSP\./);
  assert.equal((html.match(/student-avatar-cat/g) ?? []).length, 4); // Header, summary, preset and current-photo preview.
}));

test('the actual provider validates, persists normalized changes and restores them on a fresh mount', () => withStorage({}, values => {
  const initial = readProfileContext();
  assert.ok(initial.savePersonalInfo({ displayName: '   ', bio: '' }).displayName);
  assert.equal(values.has(PROFILE_KEY), false);
  assert.deepEqual(initial.savePersonalInfo({ displayName: '  Ana   María  ', bio: '  Aprendo\n LSP.  ' }), {});
  const restored = readProfileContext();
  assert.equal(restored.profile.displayName, 'Ana María');
  assert.equal(restored.profile.bio, 'Aprendo LSP.');
  restored.saveAvatar('rocket');
  assert.deepEqual(readProfileContext().profile, { version: 1, displayName: 'Ana María', bio: 'Aprendo LSP.', avatarId: 'rocket' });
  const before = values.get(PROFILE_KEY);
  readProfileContext().saveAvatar('unknown');
  assert.equal(values.get(PROFILE_KEY), before);
}));

test('reset writes only the profile key, preserving progress, legacy storage and dataset sentinels byte for byte', () => {
  const progress = restoreProgress(null, '["saludos"]');
  withStorage({
    [PROFILE_KEY]: JSON.stringify({ ...defaultProfile(), displayName: 'Ana', bio: 'Hola', avatarId: 'cat' }),
    [PROGRESS_KEY]: JSON.stringify(progress),
    'senaverse-demo-completed-v1': '["saludos"]',
    'dataset-sentinel': 'untouched',
    [THEME_KEY]: 'dark',
  }, values => {
    const others = [...values.entries()].filter(([key]) => key !== PROFILE_KEY);
    readProfileContext().resetProfile();
    assert.deepEqual(readProfileContext().profile, defaultProfile());
    assert.deepEqual([...values.entries()].filter(([key]) => key !== PROFILE_KEY), others);
    assert.match(renderProfile(progress), /XP acumulados<\/dt><dd>80<\/dd>/);
  });
});

test('a blocked browser store leaves the page usable with an honest session-only notice', () => withStorage({}, (_values, storage) => {
  storage.getItem = () => { throw new Error('Storage blocked'); };
  storage.setItem = () => { throw new Error('Storage blocked'); };
  const context = readProfileContext();
  assert.equal(context.storageAvailable, false);
  assert.deepEqual(context.profile, defaultProfile());
  assert.doesNotThrow(() => context.savePersonalInfo({ displayName: 'Ana', bio: '' }));
  assert.doesNotThrow(() => context.saveAvatar('cat'));
  assert.doesNotThrow(() => context.resetProfile());
  assert.match(renderProfile(), /solo durante esta sesión/);
}));
