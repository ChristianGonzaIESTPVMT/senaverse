import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { units } from '../src/data/curriculum.ts';
import { emptyProgress, recordProgressEvent, recordSignConsultation } from '../src/data/progress.ts';

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
let ProgressPage, StudentLayout, ProgressContext, StudentProfileProvider;
try {
  ({ ProgressPage } = await server.ssrLoadModule('/src/pages/ProgressPage.tsx'));
  ({ StudentLayout } = await server.ssrLoadModule('/src/components/StudentLayout.tsx'));
  ({ ProgressContext } = await server.ssrLoadModule('/src/hooks/progressContext.ts'));
  ({ StudentProfileProvider } = await server.ssrLoadModule('/src/components/StudentProfileProvider.tsx'));
} finally {
  await server.close();
}

function renderProgress(progress) {
  return renderToStaticMarkup(createElement(ProgressContext, { value: { progress, recordActivity() {}, consultSign() {} } },
    createElement(StudentProfileProvider, null, createElement(MemoryRouter, { initialEntries: ['/progreso'] }, createElement(StudentLayout, null, createElement(ProgressPage))))));
}

test('the real progress page renders an empty student, shared navigation, dialogs and curriculum', () => {
  const html = renderProgress(emptyProgress());
  assert.match(html, /<h1>Mi progreso<\/h1>/);
  assert.match(html, /Observa tus avances y celebra cada logro/);
  assert.match(html, /aria-current="page" class="app-nav-link active" href="\/progreso"/);
  assert.match(html, /Progreso general: 0 lecciones/);
  assert.match(html, /Tu próxima lección es el primer paso/);
  assert.match(html, />0 XP</);
  assert.match(html, /<dialog[^>]*aria-labelledby="progress-all-achievements-title"/);
  assert.match(html, /<dialog[^>]*aria-labelledby="progress-history-title"/);
  for (const unit of units) assert.ok(html.includes(`Unidad ${unit.id}: ${unit.title}`));
});

test('historical lesson credit appears in XP, badge and history while the available curriculum stays at zero', () => {
  const state = recordProgressEvent(emptyProgress(), { type: 'lesson', lessonId: 'introduccion' }, '2026-11-16T15:00:00Z');
  const html = renderProgress(state);
  assert.match(html, />80 XP</);
  assert.match(html, /<strong>0%<\/strong>/);
  assert.match(html, /0 de 1 lecciones funcionales/);
  assert.match(html, /1 finalización anterior/);
  assert.match(html, /first-step is-obtained/);
  assert.match(html, /explorer is-locked/);
  assert.match(html, /consistency is-locked/);
  assert.match(html, /Completaste la lección “Introducción a la LSP”/);
});

test('rendering a page never grants an achievement or adds an activity', () => {
  const state = emptyProgress();
  const before = JSON.stringify(state);
  renderProgress(state);
  renderProgress(state);
  assert.equal(JSON.stringify(state), before);
});

test('the overview shows four recent activities and keeps older ones in history', () => {
  let state = emptyProgress();
  for (const lesson of units[0].lessons) state = recordProgressEvent(state, { type: 'lesson', lessonId: lesson.id }, '2026-11-16T15:00:00Z');
  const html = renderProgress(state);
  const overview = html.split('<section class="progress-panel progress-recent"')[1].split('</section>')[0];
  assert.equal((overview.match(/class="progress-activity-icon"/g) ?? []).length, 4);
  const history = html.split('aria-labelledby="progress-history-title"')[1];
  assert.equal((history.match(/class="progress-activity-icon"/g) ?? []).length, units[0].lessons.length);
});

test('Explorer displays as earned after actual distinct sign consultations', () => {
  let state = emptyProgress();
  for (const id of ['hola', 'gracias', 'adios']) state = recordSignConsultation(state, id);
  const html = renderProgress(state);
  assert.match(html, /explorer is-obtained/);
  assert.match(html, /first-step is-locked/);
  assert.match(html, />0 XP</);
});
