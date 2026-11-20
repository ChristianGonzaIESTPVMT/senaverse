import { createInitialSignCatalog } from '../../src/features/sign-recognition/dataset/signCatalog.ts';
import { DatasetCapture } from '../../src/features/sign-recognition/dataset/datasetCapture.ts';
import { getHandLandmarkerOptions } from '../../src/features/sign-recognition/config.ts';

export const participantFixture = { id: 'P001', createdAt: '2026-11-17T12:00:00.000Z', consentedAt: '2026-11-17T12:00:01.000Z', consentVersion: 1 };
export const signFixture = { ...createInitialSignCatalog()[0], description: 'Metadatos sintéticos para pruebas.', instructions: 'Ejemplo sintético, no una seña validada.', validationStatus: 'pending' };
export function legacyCatalogFixture() {
  return Array.from({ length: 10 }, (_, index) => ({ id: `sign-${String(index + 1).padStart(2, '0')}`, name: '', description: '', type: 'static', expectedHands: 1,
    durationMs: 1500, instructions: '', referenceUrl: '', validationStatus: 'unconfigured' }));
}
export const captureConfigurationFixture = { ...getHandLandmarkerOptions(), delegate: 'GPU', profile: 'baseline', processingWidth: 640, processingHeight: 480, cameraWidth: 640, cameraHeight: 480, cameraFrameRate: 29.97, inputMirrored: false };
export function inferenceFixture(at, count = 1, delay = 10) {
  const points = () => Array.from({ length: 21 }, (_, i) => ({ x: .2 + i / 100, y: .3 + i / 100, z: -i / 1000 }));
  return { source: 'worker', capturedAtMs: at, inferenceTimestampMs: at + 1, receivedAtMs: at + delay,
    result: { landmarks: Array.from({ length: count }, points), worldLandmarks: Array.from({ length: count }, points),
      handedness: Array.from({ length: count }, (_, i) => [{ score: .97, index: i === 0 ? 1 : 0, categoryName: i === 0 ? 'Left' : 'Right', displayName: '' }]), handednesses: [] },
    configuration: structuredClone(captureConfigurationFixture) };
}
export function captureFixture(sampleId = 'sample-test') {
  let now = 0;
  const capture = new DatasetCapture({ now: () => now, isoNow: () => '2026-11-17T12:01:00.000Z', id: () => sampleId });
  const tick = value => { now = value; return capture.advance(); };
  const feed = event => { now = Math.max(now, event.receivedAtMs); return capture.accept(event); };
  return { capture, tick, feed };
}
export function sampleFixture(sampleId = 'sample-test', sign = signFixture, fps = 30) {
  const fixture = captureFixture(sampleId);
  fixture.capture.start({ participant: participantFixture, sign, sessionConsent: true, repetition: 1 });
  for (let elapsed = 0; elapsed < sign.durationMs; elapsed += 1000 / fps) fixture.feed(inferenceFixture(elapsed, sign.expectedHands));
  fixture.tick(sign.durationMs + 120);
  return structuredClone(fixture.capture.view().draft);
}
