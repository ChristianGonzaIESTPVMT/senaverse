import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { HandPerformanceMetrics } from '../src/features/sign-recognition/performanceMetrics.ts';

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
after(async () => server.close());
const { default: HandDiagnostics } = await server.ssrLoadModule('/src/features/sign-recognition/HandDiagnostics.tsx');
const render = snapshot => renderToStaticMarkup(createElement(HandDiagnostics, { snapshot, profile: 'baseline', onProfile() {}, onReset() {}, onDisable() {} }));

test('development diagnostics expose causes of loss, bounded visual holds, all controlled profiles and a separate report', () => {
  const snapshot = { ...new HandPerformanceMetrics(0).snapshot(1000), profile: 'baseline', handCount: 0, rawHandCount: 1,
    delegate: 'GPU', backend: 'worker', processingWidth: 640, processingHeight: 480,
    cameraWidth: 640, cameraHeight: 480, configuredCameraFps: 30, cameraFpsSource: 'video-callback',
    trackingStatus: 'lost', visualState: 'held', lossReason: 'result-gap', lastAcceptedAgeMs: 130, mismatchedResponses: 0,
    handednessScores: [{ label: 'Left', score: .97 }],
  };
  const html = render(snapshot);
  for (const text of ['Fotogramas sin detección', 'Recuperaciones observadas', 'FPS de resultados aceptados',
    'Continuidad temporal', 'Faltan resultados frescos', '97.0%', 'no confianza de detección', 'Descargar diagnóstico JSON',
    'Dos manos quietas', 'ninguna mano visible', 'Presencia: 0.45', 'Seguimiento: 0.40', 'Seguimiento: 0.35']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /<video|<canvas/);
});

test('initialization failures remain inspectable even when no detection ever succeeds', () => {
  const html = render({ ...new HandPerformanceMetrics(0).snapshot(0), lastError: { phase: 'initialization', detail: 'CPU: model graph failed' },
    profile: 'baseline', trackingStatus: 'error', visualState: 'none', lossReason: null, mismatchedResponses: 0, lastAcceptedAgeMs: null });
  assert.match(html, /Fallo en initialization/);
  assert.match(html, /CPU: model graph failed/);
  assert.match(html, /Respuestas \/ aceptadas/);
  assert.match(html, /Sin evaluar/);
});
