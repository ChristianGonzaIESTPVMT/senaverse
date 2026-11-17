import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import postcss from 'postcss';
import { THEME_EVENT, THEME_KEY, applyTheme, getServerTheme, getThemeSnapshot, restoreTheme, selectTheme, subscribeTheme } from '../src/data/theme.ts';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function withEnvironment(initial, action) {
  const names = ['window', 'document', 'localStorage'];
  const descriptors = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const values = new Map(Object.entries(initial));
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const meta = { content: null, setAttribute(_key, value) { this.content = value; } };
  const document = { documentElement: { dataset: {} }, querySelector: () => meta };
  const window = new EventTarget();
  for (const [name, value] of Object.entries({ window, document, localStorage: storage })) Object.defineProperty(globalThis, name, { configurable: true, value });
  try { return action({ document, window, storage, values, meta }); }
  finally {
    names.forEach((name, index) => {
      if (descriptors[index]) Object.defineProperty(globalThis, name, descriptors[index]);
      else delete globalThis[name];
    });
  }
}

function storageEvent(window, storage, key, newValue) {
  const event = new Event('storage');
  Object.defineProperties(event, { storageArea: { value: storage }, key: { value: key }, newValue: { value: newValue } });
  window.dispatchEvent(event);
}

test('new users and invalid saved preferences default to light independently of operating system settings', () => {
  for (const value of [null, '', 'light', 'auto', 'DARK', '{}', 'unknown']) assert.equal(restoreTheme(value), 'light');
  assert.equal(restoreTheme('dark'), 'dark');
  assert.equal(getServerTheme(), 'light');
});

test('selecting dark applies the theme globally, updates browser chrome and persists the preference', () => withEnvironment({}, ({ document, values, meta }) => {
  selectTheme('dark');
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(getThemeSnapshot(), 'dark');
  assert.equal(values.get(THEME_KEY), 'dark');
  assert.equal(meta.content, '#171326');
}));

test('selecting light immediately reverses the global theme and saves light', () => withEnvironment({ [THEME_KEY]: 'dark' }, ({ document, values, meta }) => {
  applyTheme('dark');
  selectTheme('light');
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.equal(getThemeSnapshot(), 'light');
  assert.equal(values.get(THEME_KEY), 'light');
  assert.equal(meta.content, '#6330da');
}));

test('the real head bootstrap restores both themes before the app starts, including a fresh reload', () => {
  for (const theme of ['light', 'dark']) withEnvironment({}, ({ document, storage, values }) => {
    selectTheme(theme);
    const freshDocument = { ...document, documentElement: { dataset: {} } };
    runInNewContext(bootstrap, { document: freshDocument, localStorage: storage });
    assert.equal(freshDocument.documentElement.dataset.theme, theme);
    assert.equal(values.get(THEME_KEY), theme);
  });
  assert.ok(html.indexOf(bootstrap) < html.indexOf('src="/src/main.tsx"'));
  assert.match(html, /html\[data-theme="dark"\][^}]*background: #171326/);
});

test('blocked storage never prevents startup or changing theme for the current session', () => withEnvironment({}, ({ document, storage }) => {
  storage.getItem = storage.setItem = () => { throw new Error('Blocked'); };
  runInNewContext(bootstrap, { document, localStorage: storage });
  assert.equal(getThemeSnapshot(), 'light');
  assert.doesNotThrow(() => selectTheme('dark'));
  assert.equal(getThemeSnapshot(), 'dark');
}));

test('all mounted controls are notified and subscriptions clean up correctly', () => withEnvironment({}, ({ window }) => {
  let first = 0, second = 0;
  const removeFirst = subscribeTheme(() => first++);
  const removeSecond = subscribeTheme(() => second++);
  selectTheme('dark');
  assert.deepEqual([first, second], [1, 1]);
  removeFirst();
  window.dispatchEvent(new Event(THEME_EVENT));
  assert.deepEqual([first, second], [1, 2]);
  removeSecond();
  selectTheme('light');
  assert.deepEqual([first, second], [1, 2]);
}));

test('cross-tab updates synchronize only the dedicated theme key and ignore session storage', () => withEnvironment({}, ({ window, storage }) => {
  let notified = 0;
  const unsubscribe = subscribeTheme(() => notified++);
  storageEvent(window, storage, THEME_KEY, 'dark');
  assert.equal(getThemeSnapshot(), 'dark');
  storageEvent(window, storage, 'senaverse-student-profile-v1', 'light');
  storageEvent(window, {}, THEME_KEY, 'light');
  assert.equal(getThemeSnapshot(), 'dark');
  assert.equal(notified, 1);
  storageEvent(window, storage, null, null);
  assert.equal(getThemeSnapshot(), 'light');
  assert.equal(notified, 2);
  unsubscribe();
}));

test('theme changes preserve every existing profile, progress and dataset storage value', () => withEnvironment({
  'senaverse-student-profile-v1': '{"displayName":"Ana"}',
  'senaverse-student-progress-v1': '{"activities":["sentinel"]}',
  'dataset-sentinel': 'untouched',
}, ({ values }) => {
  const before = [...values.entries()];
  selectTheme('dark'); selectTheme('light');
  assert.deepEqual([...values.entries()].filter(([key]) => key !== THEME_KEY), before);
}));

const css = postcss.parse(await readFile(new URL('../src/themes.css', import.meta.url), 'utf8'));
const palette = {};
css.walkRules(rule => {
  if (rule.selector === ':root' || rule.selector === ":root[data-theme='dark']") {
    palette[rule.selector === ':root' ? 'light' : 'dark'] = Object.fromEntries(rule.nodes.filter(node => node.type === 'decl' && node.prop.startsWith('--color-')).map(node => [node.prop, node.value]));
  }
});
palette.dark = { ...palette.light, ...palette.dark };

function luminance(hex) {
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

test('both semantic palettes maintain readable normal text, controls and status messages', () => {
  const pairs = [
    ['text', 'card'], ['text', 'canvas'], ['text-secondary', 'card'], ['text-muted', 'surface'],
    ['primary', 'card'], ['on-primary', 'button-primary'], ['on-primary', 'button-hover'],
    ['text-secondary', 'feature-end'], ['primary-hover', 'feature-end'],
    ['on-primary', 'banner-start'], ['on-primary', 'banner-end'],
    ['success', 'success-bg'], ['warning', 'warning-bg'], ['error', 'error-bg'], ['info', 'info-bg'],
  ];
  for (const [theme, colors] of Object.entries(palette)) for (const [foreground, background] of pairs) {
    const ratio = contrast(colors[`--color-${foreground}`], colors[`--color-${background}`]);
    assert.ok(ratio >= 4.5, `${theme}: ${foreground} on ${background} has contrast ${ratio.toFixed(2)}`);
  }
});

test('focus indicators and progress fills remain distinguishable on dark cards and surfaces', () => {
  for (const theme of ['light', 'dark']) for (const surface of ['card', 'surface']) {
    assert.ok(contrast(palette[theme]['--color-focus'], palette[theme][`--color-${surface}`]) >= 3);
    assert.ok(contrast(palette[theme]['--color-primary'], palette[theme][`--color-${surface}`]) >= 3);
  }
});
