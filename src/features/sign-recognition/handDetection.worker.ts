import { createHandLandmarker, closeHandLandmarker } from './handLandmarker';
import type { InitializedHandDetector } from './types';
import type { HandWorkerRequest, HandWorkerResponse } from './workerProtocol';
import { detectionFailure } from './detectionErrors';

// No DOM, image storage or network destinations: frames stay in this dedicated worker.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<HandWorkerRequest>) => void) | null;
  postMessage: (message: HandWorkerResponse) => void;
  close: () => void;
};
const abort = new AbortController();
let initialized: InitializedHandDetector | null = null;
let loading = false;
let disposed = false;
let lastTimestamp = -Infinity;

scope.onmessage = event => {
  const message = event.data;
  if (message.type === 'dispose') {
    disposed = true;
    abort.abort();
    closeHandLandmarker(initialized?.detector ?? null);
    initialized = null;
    scope.postMessage({ type: 'disposed' });
    scope.close();
    return;
  }
  if (message.type === 'init') {
    if (disposed || loading || initialized) return;
    loading = true;
    void createHandLandmarker(abort.signal, {
      assets: message.assets, profile: message.profile, moduleLoader: true,
      createCanvas: () => new OffscreenCanvas(1, 1),
    }).then(instance => {
      if (disposed) { closeHandLandmarker(instance.detector); return; }
      initialized = instance;
      scope.postMessage({ type: 'ready', delegate: instance.delegate });
    }).catch(error => {
      if (!disposed) scope.postMessage({ type: 'error', phase: 'initialization', message: detectionFailure(error, 'initialization').detail });
    });
    return;
  }
  try {
    if (!initialized || disposed) throw new Error('El detector no está preparado.');
    if (!Number.isFinite(message.timestamp) || message.timestamp <= lastTimestamp) throw new Error('Timestamp no creciente.');
    lastTimestamp = message.timestamp;
    const started = performance.now();
    const result = initialized.detector.detectForVideo(message.frame, message.timestamp);
    scope.postMessage({ type: 'result', id: message.id, timestamp: message.timestamp, result, inferenceMs: performance.now() - started });
  } catch (error) {
    if (!disposed) scope.postMessage({ type: 'error', phase: 'inference', message: detectionFailure(error, 'inference').detail });
  } finally { message.frame.close(); }
};
