import { getHandLandmarkerAssets, PROCESSING_SIZE } from './config.ts';
import type { BackendOptions, CapturedHandFrame, HandInferenceBackend, InferenceOutput } from './types.ts';
import type { HandWorkerRequest, HandWorkerResponse } from './workerProtocol.ts';

export function closeCapturedFrame(frame: CapturedHandFrame) {
  frame.close();
}

export function getProcessingSize(width: number, height: number) {
  const scale = Math.min(1, PROCESSING_SIZE.width / width, PROCESSING_SIZE.height / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function captureHandFrame(video: HTMLVideoElement): Promise<CapturedHandFrame> {
  const size = getProcessingSize(video.videoWidth, video.videoHeight);
  return createImageBitmap(video, { resizeWidth: size.width, resizeHeight: size.height, resizeQuality: 'low' });
}

function absoluteAssets() {
  const assets = getHandLandmarkerAssets(import.meta.env.BASE_URL);
  return { model: new URL(assets.model, document.baseURI).href, wasm: new URL(assets.wasm, document.baseURI).href };
}

/** One request at a time, never a worker-side queue. Exported to exercise transport cancellation. */
export function connectHandWorker(worker: Worker, signal: AbortSignal, options: BackendOptions,
  assets: ReturnType<typeof getHandLandmarkerAssets>): Promise<HandInferenceBackend> {
  return new Promise((resolve, reject) => {
    let closed = false;
    let ready = false;
    let terminated = false;
    let requestId = 0;
    let pending: { id: number; timestamp: number; resolve: (output: InferenceOutput) => void; reject: (reason: Error) => void } | null = null;
    let disposalTimer: ReturnType<typeof setTimeout> | null = null;
    let inferenceTimer: ReturnType<typeof setTimeout> | null = null;
    const initializationTimer = setTimeout(() => fail(new Error('El Worker no respondió al inicializar.')), 20000);
    const post = (message: HandWorkerRequest, transfer: Transferable[] = []) => worker.postMessage(message, transfer);
    const terminate = () => {
      if (terminated) return;
      terminated = true;
      if (disposalTimer !== null) clearTimeout(disposalTimer);
      worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null;
      worker.terminate();
    };
    function close() {
      if (closed) return;
      closed = true;
      clearTimeout(initializationTimer);
      if (inferenceTimer !== null) clearTimeout(inferenceTimer);
      signal.removeEventListener('abort', onAbort);
      const wasBusy = !!pending;
      pending?.reject(new DOMException('Detección cancelada.', 'AbortError'));
      pending = null;
      if (!ready || wasBusy) { terminate(); return; }
      try { post({ type: 'dispose' }); disposalTimer = setTimeout(terminate, 50); }
      catch { terminate(); }
    }
    function fail(error: Error) {
      if (closed) return;
      reject(error);
      pending?.reject(error);
      close();
    }
    function onAbort() { fail(new DOMException('Detección cancelada.', 'AbortError')); }
    worker.onmessage = (event: MessageEvent<HandWorkerResponse>) => {
      const message = event.data;
      if (message.type === 'disposed') { terminate(); return; }
      if (closed) return;
      if (message.type === 'error') { fail(new Error(message.message)); return; }
      if (message.type === 'ready') {
        ready = true;
        clearTimeout(initializationTimer);
        resolve({ kind: 'worker', delegate: message.delegate, close,
          infer: (frame, timestamp) => new Promise((resolveFrame, rejectFrame) => {
            if (closed || pending || !Number.isFinite(timestamp)) {
              closeCapturedFrame(frame);
              rejectFrame(new Error('El Worker está ocupado o cerrado.'));
              return;
            }
            const id = ++requestId;
            pending = { id, timestamp, resolve: resolveFrame, reject: rejectFrame };
            try {
              inferenceTimer = setTimeout(() => fail(new Error('El Worker no respondió a la inferencia.')), 2000);
              post({ type: 'frame', id, timestamp, frame: frame as ImageBitmap }, [frame as ImageBitmap]);
            } catch (error) {
              if (inferenceTimer !== null) clearTimeout(inferenceTimer);
              pending = null; closeCapturedFrame(frame); rejectFrame(error);
            }
          }),
        });
      } else if (message.type === 'result' && pending && message.id === pending.id && message.timestamp === pending.timestamp) {
        const completed = pending;
        if (inferenceTimer !== null) clearTimeout(inferenceTimer);
        pending = null;
        completed.resolve({ result: message.result, inferenceMs: message.inferenceMs });
      }
    };
    worker.onerror = () => fail(new Error('El Worker de detección no está disponible.'));
    worker.onmessageerror = () => fail(new Error('No se pudo transferir el resultado de detección.'));
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) { onAbort(); return; }
    try { post({ type: 'init', profile: options.profile, assets }); }
    catch (error) { fail(error instanceof Error ? error : new Error('No se pudo iniciar el Worker.')); }
  });
}

export async function createHandInferenceBackend(signal: AbortSignal, options: BackendOptions): Promise<HandInferenceBackend> {
  signal.throwIfAborted();
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap !== 'function') {
    throw new Error('La detección requiere Web Worker, OffscreenCanvas e ImageBitmap.');
  }
  const assets = absoluteAssets();
  const worker = new Worker(new URL('./handDetection.worker.ts', import.meta.url), { type: 'module', name: 'senaverse-hands' });
  return connectHandWorker(worker, signal, options, assets);
}
