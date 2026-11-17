import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import postcss from 'postcss';

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
let Brand, ThemeToggle, DatasetStudioPage, HomePage;
try {
  ({ Brand } = await server.ssrLoadModule('/src/components/Brand.tsx'));
  ({ ThemeToggle } = await server.ssrLoadModule('/src/components/ThemeToggle.tsx'));
  ({ default: DatasetStudioPage } = await server.ssrLoadModule('/src/pages/DatasetStudioPage.tsx'));
  ({ HomePage } = await server.ssrLoadModule('/src/pages/HomePage.tsx'));
} finally { await server.close(); }
const render = Component => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Component)));

test('the shared brand renders the official image with its name and an accessible home link', () => {
  const html = render(Brand);
  assert.match(html, /src="\/images\/logo-senaverse.png"/);
  assert.match(html, /object-fit:contain/);
  assert.match(html, /Seña<span class="brand-accent">Verse/);
  assert.match(html, /aria-label="SeñaVerse, ir al inicio"/);
  assert.doesNotMatch(html, /home-visual-emoji/);
});

test('the web logo and favicon are optimized square PNGs with alpha and the favicon uses the official asset', async () => {
  for (const [file, size, maxBytes] of [['../public/images/logo-senaverse.png', 256, 100000], ['../public/favicon.png', 64, 15000]]) {
    const png = await readFile(new URL(file, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
    assert.equal(png[25], 6, 'PNG must include an alpha channel');
    assert.ok(png.length < maxBytes);
  }
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /rel="icon" type="image\/png" sizes="64x64" href="\/favicon.png"/);
  assert.doesNotMatch(html, /favicon.svg/);
});

test('the theme button is a keyboard-operable labelled control with a sun and an explicit state', () => {
  const html = render(ThemeToggle);
  assert.match(html, /<button type="button" class="theme-toggle"/);
  assert.match(html, /aria-label="Cambiar al tema oscuro"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /lucide-sun/);
  assert.match(html, /aria-hidden="true"/);
});

test('presentation and Dataset Studio have one theme control and reuse the same official brand', () => {
  for (const Page of [HomePage, DatasetStudioPage]) {
    const html = render(Page);
    assert.equal((html.match(/class="theme-toggle"/g) ?? []).length, 1);
    assert.match(html, /src="\/images\/logo-senaverse.png"/);
  }
});

test('the shared semantic theme reaches each route, dialogs, forms and the camera preview', async () => {
  const cases = [
    ['../src/App.css', '.white-card'],
    ['../src/components/StudentLayout.css', '.app-menu-dialog'],
    ['../src/pages/DashboardPage.css', '.home-stat'],
    ['../src/pages/AcademyPage.css', '.learning-banner-stat'],
    ['../src/pages/CameraPage.css', '.practice-camera-preview'],
    ['../src/pages/LibraryPage.css', '.library-dialog'],
    ['../src/pages/MinigamesPage.css', '.minigame-card'],
    ['../src/pages/ProgressPage.css', '.progress-panel'],
    ['../src/pages/ProfilePage.css', '.profile-panel'],
    ['../src/pages/SituationsPage.css', '.situations-help-dialog'],
    ['../src/pages/DatasetStudioPage.css', '.dataset-panel'],
  ];
  for (const [file, selector] of cases) {
    const root = postcss.parse(await readFile(new URL(file, import.meta.url), 'utf8'));
    const rule = root.nodes.find(node => node.type === 'rule' && node.selector === selector);
    assert.ok(rule, `${file}: ${selector} exists`);
    const background = rule.nodes.find(node => node.type === 'decl' && node.prop === 'background');
    assert.match(background.value, /light-dark\([^;]*var\(--color-/, `${selector} must use the global palette`);
  }
  const themes = await readFile(new URL('../src/themes.css', import.meta.url), 'utf8');
  assert.match(themes, /:root\[data-theme='dark'\]/);
  assert.doesNotMatch(themes, /invert\(/);
});
