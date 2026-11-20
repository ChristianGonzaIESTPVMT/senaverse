import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { createDatasetCatalog } from '../src/features/sign-recognition/dataset/signCatalog.ts';
import { loadCountdownPreferences, saveCountdownPreference } from '../src/features/sign-recognition/dataset/countdownPreferences.ts';
import { CAPTURE_DEFAULTS, MODEL_METADATA } from '../src/features/sign-recognition/dataset/datasetTypes.ts';
import { legacyCatalogFixture, participantFixture, sampleFixture, signFixture } from './fixtures/dataset.mjs';

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
let Page, ParticipantSelector, SignSelector, SignEditor, LegacyCatalogReview, RecordingPanel, DatasetStatistics, SampleReview, SampleFrames, SavedSamples;
try {
  ({ default: Page } = await server.ssrLoadModule('/src/pages/DatasetStudioPage.tsx'));
  ({ ParticipantSelector } = await server.ssrLoadModule('/src/components/dataset/ParticipantSelector.tsx'));
  ({ SignSelector, SignEditor, LegacyCatalogReview } = await server.ssrLoadModule('/src/components/dataset/SignSelector.tsx'));
  ({ RecordingPanel } = await server.ssrLoadModule('/src/components/dataset/RecordingPanel.tsx'));
  ({ DatasetStatistics } = await server.ssrLoadModule('/src/components/dataset/DatasetStatistics.tsx'));
  ({ SampleReview, SampleFrames } = await server.ssrLoadModule('/src/components/dataset/SampleReview.tsx'));
  ({ SavedSamples } = await server.ssrLoadModule('/src/components/dataset/SavedSamples.tsx'));
} finally { await server.close(); }
const render = (Component, props = {}) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Component, props)));
const snapshot = () => ({ meta: { datasetId: 'dataset-test', createdAt: '2026-11-17T12:00:00Z', schemaVersion: 1, captureConfiguration: CAPTURE_DEFAULTS, mediaPipeModel: MODEL_METADATA }, participants: [], signs: createDatasetCatalog(), samples: [] });
const recordingProps = { participant: participantFixture, sign: signFixture, sessionConsent: false, repetition: 1,
  disabled: false, countdownSeconds: 0, onCountdownChange() {}, onLocked() {}, onSave() {} };

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

test('catalog shows ten pending LSP entries and a separate negative category without inventing samples', () => {
  const data = snapshot();
  const signs = render(SignSelector, { signs: data.signs, selectedId: 'LSP-001', disabled: false });
  assert.equal((signs.match(/<option /g) ?? []).length, 11);
  assert.match(signs, /Pendiente de revisión lingüística/);
  assert.match(signs, /Página 73/);
  assert.match(signs, /Categoría técnica · fuera del catálogo LSP/);
  assert.match(signs, /Configurar duración/);
  const stats = render(DatasetStatistics, { snapshot: data });
  assert.match(stats, /10 \/ 10/);
  assert.equal((stats.match(/<strong>0<\/strong>/g) ?? []).length, 3);
});

test('LSP editor exposes individual duration while keeping identity and pending review fixed', () => {
  const html = render(SignEditor, { sign: signFixture, saving: false, onSave() {}, onCancel() {} });
  assert.match(html, /Duración \(segundos\)/);
  assert.match(html, /type="number" min="0.5" max="10" step="0.1"[^>]*value="1.5"/);
  assert.match(html, /readOnly=""/i);
  assert.match(html, /Pendiente de revisión lingüística/);
  assert.doesNotMatch(html, /Validada mediante revisión humana/);
});

test('legacy catalog review exposes original IDs and sample counts with no assumed correspondence', () => {
  const signs = legacyCatalogFixture();
  signs[0] = { ...signs[0], name: 'Etiqueta anterior' };
  const html = render(LegacyCatalogReview, { signs, samples: [{ labelId: 'sign-01' }, { labelId: 'sign-01' }] });
  assert.match(html, /sign-01/);
  assert.match(html, /Etiqueta anterior/);
  assert.match(html, /<td>2<\/td>/);
  assert.match(html, /Sin asignar · requiere revisión/);
  assert.match(html, /no reetiqueta muestras/);
});

test('recording reuses exactly one PracticeCamera and is disabled without consent', () => {
  const html = render(RecordingPanel, recordingProps);
  assert.equal((html.match(/<video/g) ?? []).length, 1);
  assert.equal((html.match(/<canvas/g) ?? []).length, 1);
  assert.match(html, /disabled=""[^>]*>.*Grabar muestra/);
  assert.match(html, /Cámara en espejo solo para la vista/);
  assert.match(html, /no impone una adaptación para personas zurdas o diestras/);
});

test('camera activation explains the missing prerequisite and is enabled after participant and session consent', () => {
  const props = recordingProps;
  const cameraButton = html => html.match(/<button\b[^>]*class="[^"]*practice-camera-button[^"]*"[^>]*>/)?.[0];
  const noParticipant = render(RecordingPanel, { ...props, participant: undefined, sessionConsent: false });
  assert.match(cameraButton(noParticipant), /disabled=""/);
  assert.match(noParticipant, /Crea un participante con el botón \+/);
  const noConsent = render(RecordingPanel, { ...props, sessionConsent: false });
  assert.match(cameraButton(noConsent), /disabled=""/);
  assert.match(noConsent, /pulsa Registrar consentimiento/);
  const ready = render(RecordingPanel, { ...props, sessionConsent: true });
  assert.doesNotMatch(cameraButton(ready), /disabled=""/);
  assert.match(ready, /disabled=""[^>]*>.*Grabar muestra/);
  assert.match(ready, /Actívala cuando estés listo para practicar/);
  const busy = render(RecordingPanel, { ...props, sessionConsent: true, disabled: true });
  assert.match(cameraButton(busy), /disabled=""/);
  assert.match(busy, /termine la operación de almacenamiento/);
});

test('countdown options stay separate by required hands and restore the latest values on load', t => {
  const values = new Map();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { search: '' }, localStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } } });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else delete globalThis.window;
  });
  const twoHands = createDatasetCatalog().find(sign => sign.id === 'LSP-008');
  const radioOptions = html => [...html.matchAll(/<input[^>]*name="dataset-countdown"[^>]*>/g)];
  const renderSign = (sign, preferences) => render(RecordingPanel, { ...recordingProps, sign, countdownSeconds: preferences[sign.expectedHands] });
  const checkSelection = (html, seconds) => assert.match(radioOptions(html).find(([input]) => input.includes('checked=""'))[0], new RegExp(`value="${seconds}"`));
  assert.deepEqual(loadCountdownPreferences(), { 0: 0, 1: 0, 2: 3 });
  const html = renderSign(signFixture, loadCountdownPreferences());
  assert.match(html, /<legend>Cuenta regresiva<\/legend>/);
  assert.match(html, /Sin espera/);
  assert.deepEqual(radioOptions(html).map(([input]) => input.match(/value="(\d+)"/)[1]), ['0', '1', '2', '3', '5']);
  checkSelection(html, 0);
  checkSelection(renderSign(twoHands, loadCountdownPreferences()), 3);

  saveCountdownPreference(signFixture.expectedHands, 1);
  saveCountdownPreference(twoHands.expectedHands, 5);
  saveCountdownPreference(signFixture.expectedHands, 2);
  const reloaded = loadCountdownPreferences();
  checkSelection(renderSign(twoHands, reloaded), 5);
  checkSelection(renderSign(signFixture, reloaded), 2);
  checkSelection(renderSign(twoHands, reloaded), 5);
  values.set('senaverse-dataset-countdown-2', '4');
  assert.deepEqual(loadCountdownPreferences(), { 0: 0, 1: 2, 2: 3 });
});

test('sample review shows raw recorded frames and keeps low-quality saves behind acknowledgement', () => {
  const sample = sampleFixture('sample-weak', signFixture, 5);
  const html = render(SampleReview, { sample, disabled: false, onSave() {}, onDiscard() {}, onRepeat() {} });
  assert.match(html, /calidad insuficiente/);
  assert.match(html, /Guardar como pendiente/);
  assert.match(html, /> Repetir<\/button>/);
  assert.match(html, /> Descartar<\/button>/);
  assert.match(html, /lingüísticamente correcta/);
  const frames = render(SampleFrames, { sample });
  assert.equal((frames.match(/<circle/g) ?? []).length, 21);
  assert.match(frames, /sin interpolación/);
  assert.equal(frames.includes('<video'), false);
});

test('saved samples expose separate page and filter selection, five filters, and both review states', () => {
  const data = snapshot();
  data.participants = [participantFixture];
  const { frames, ...summary } = sampleFixture();
  assert.ok(frames.length > 0);
  data.samples = Array.from({ length: 30 }, (_, index) => ({
    ...summary, sampleId: `bulk-${index}`, repetition: index + 1, reviewStatus: 'accepted', operatorReviewed: false,
  }));
  const html = render(SavedSamples, { snapshot: data, locked: false, notice: '' });
  assert.equal((html.match(/class="dataset-sample-checkbox"/g) ?? []).length, 8);
  assert.match(html, /Esta página/);
  assert.match(html, /Seleccionar todas las del filtro \(30\)/);
  assert.match(html, /1 \/ 4/);
  assert.match(html, /Revisión por operador<select/);
  assert.match(html, /Aceptación<select/);
  assert.match(html, /Calidad de captura<select/);
  assert.match(html, />Sin revisar<.*>Aceptada</);
  assert.doesNotMatch(html, /Limpiar selección/);
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
