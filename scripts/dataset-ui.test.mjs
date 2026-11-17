import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { createInitialSignCatalog } from '../src/features/sign-recognition/dataset/signCatalog.ts';
import { CAPTURE_DEFAULTS, MODEL_METADATA } from '../src/features/sign-recognition/dataset/datasetTypes.ts';
import { participantFixture, sampleFixture, signFixture } from './fixtures/dataset.mjs';

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
let Page, ParticipantSelector, SignSelector, RecordingPanel, DatasetStatistics, SampleReview, SampleFrames;
try {
  ({ default: Page } = await server.ssrLoadModule('/src/pages/DatasetStudioPage.tsx'));
  ({ ParticipantSelector } = await server.ssrLoadModule('/src/components/dataset/ParticipantSelector.tsx'));
  ({ SignSelector } = await server.ssrLoadModule('/src/components/dataset/SignSelector.tsx'));
  ({ RecordingPanel } = await server.ssrLoadModule('/src/components/dataset/RecordingPanel.tsx'));
  ({ DatasetStatistics } = await server.ssrLoadModule('/src/components/dataset/DatasetStatistics.tsx'));
  ({ SampleReview, SampleFrames } = await server.ssrLoadModule('/src/components/dataset/SampleReview.tsx'));
} finally { await server.close(); }
const render = (Component, props = {}) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Component, props)));
const snapshot = () => ({ meta: { datasetId: 'dataset-test', createdAt: '2026-11-17T12:00:00Z', schemaVersion: 1, captureConfiguration: CAPTURE_DEFAULTS, mediaPipeModel: MODEL_METADATA }, participants: [], signs: createInitialSignCatalog(), samples: [] });

test('Dataset Studio renders independently with local privacy information and no student sidebar', () => {
  const html = render(Page);
  assert.match(html, /SeñaVerse Dataset Studio/);
  assert.match(html, /todavía no tiene autenticación/);
  assert.match(html, /Abriendo el dataset local/);
  assert.equal(html.includes('app-sidebar'), false);
});

test('participants require an unchecked explicit consent control for the current session', () => {
  const data = snapshot(); data.participants = [participantFixture];
  const html = render(ParticipantSelector, { snapshot: data, selectedId: 'P001', sessionConsent: false, disabled: false });
  assert.match(html, /Confirmo que esta persona dio su consentimiento/);
  assert.match(html, /type="checkbox"/);
  assert.doesNotMatch(html, /checked=""/);
  assert.match(html, /Registrar consentimiento/);
});

test('empty catalog and statistics never invent configured signs or completed samples', () => {
  const data = snapshot();
  const signs = render(SignSelector, { signs: data.signs, selectedId: 'sign-01', disabled: false });
  assert.equal((signs.match(/<option/g) ?? []).length, 10);
  assert.match(signs, /Ninguna propuesta está declarada como validada/);
  const stats = render(DatasetStatistics, { snapshot: data });
  assert.match(stats, /0 \/ 10/);
  assert.equal((stats.match(/<strong>0<\/strong>/g) ?? []).length, 3);
});

test('recording reuses exactly one PracticeCamera and is disabled without consent', () => {
  const html = render(RecordingPanel, { participant: participantFixture, sign: signFixture, sessionConsent: false, repetition: 1, disabled: false, onLocked() {}, onSave() {} });
  assert.equal((html.match(/<video/g) ?? []).length, 1);
  assert.equal((html.match(/<canvas/g) ?? []).length, 1);
  assert.match(html, /disabled=""[^>]*>.*Iniciar cuenta regresiva/);
});

test('sample review shows raw recorded frames and keeps low-quality saves behind acknowledgement', () => {
  const sample = sampleFixture('sample-weak', signFixture, 5);
  const html = render(SampleReview, { sample, disabled: false, onSave() {}, onDiscard() {}, onRepeat() {} });
  assert.match(html, /calidad insuficiente/);
  assert.match(html, /Guardar como pendiente/);
  assert.match(html, /lingüísticamente correcta/);
  const frames = render(SampleFrames, { sample });
  assert.equal((frames.match(/<circle/g) ?? []).length, 21);
  assert.match(frames, /sin interpolación/);
  assert.equal(frames.includes('<video'), false);
});

test('route is explicitly gated and collection adds no sidebar entry or second camera system', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /VITE_ENABLE_DATA_COLLECTION === 'true'/);
  assert.match(app, /path="\/herramientas\/dataset"/);
  const layout = await readFile(new URL('../src/components/StudentLayout.tsx', import.meta.url), 'utf8');
  assert.equal(layout.includes('/herramientas/dataset'), false);
  for (const file of ['datasetCapture.ts', 'datasetStore.ts', 'useDatasetCapture.ts']) {
    const source = await readFile(new URL(`../src/features/sign-recognition/dataset/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /getUserMedia|createHandLandmarker|new Worker|localStorage/);
  }
});
