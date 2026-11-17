import { getHandLandmarkerAssets, getHandLandmarkerOptions, type HandDetectionProfile } from './config.ts';
import type { DetectionDelegate, HandDetector, InitializedHandDetector } from './types.ts';

// Serialize initialization, including GPU fallback, across remounts and cancelled requests.
let initializationQueue: Promise<void> = Promise.resolve();

export function closeHandLandmarker(detector: HandDetector | null) {
  try { detector?.close(); }
  catch { /* A lost graphics context must not prevent the camera from stopping. */ }
}

type InitializationOptions = {
  profile?: HandDetectionProfile;
  assets?: ReturnType<typeof getHandLandmarkerAssets>;
  moduleLoader?: boolean;
  createCanvas?: () => HTMLCanvasElement | OffscreenCanvas;
};

export function createHandLandmarker(signal: AbortSignal, options: InitializationOptions = {}): Promise<InitializedHandDetector> {
  const initialization = initializationQueue.then(async () => {
    signal.throwIfAborted();
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
    signal.throwIfAborted();
    const assets = options.assets ?? getHandLandmarkerAssets(import.meta.env.BASE_URL);
    const files = await FilesetResolver.forVisionTasks(assets.wasm, options.moduleLoader ?? false);
    signal.throwIfAborted();
    // tasks-vision 1.2.3 consumes this global factory. ESM imports are cached, so
    // restore its default export before each attempt (including GPU -> CPU).
    const wasmFactory = options.moduleLoader
      ? (await import(/* @vite-ignore */ files.wasmLoaderPath)).default : null;
    signal.throwIfAborted();
    const prepareFactory = () => {
      if (wasmFactory) (globalThis as { ModuleFactory?: unknown }).ModuleFactory = wasmFactory;
    };

    let detector: HandDetector;
    let delegate: DetectionDelegate = 'GPU';
    try {
      prepareFactory();
      detector = await HandLandmarker.createFromOptions(files, {
        ...getHandLandmarkerOptions(options.profile),
        ...(options.createCanvas ? { canvas: options.createCanvas() } : {}),
        baseOptions: { modelAssetPath: assets.model, delegate: 'GPU' },
      });
    } catch {
      signal.throwIfAborted();
      delegate = 'CPU';
      prepareFactory();
      detector = await HandLandmarker.createFromOptions(files, {
        ...getHandLandmarkerOptions(options.profile),
        ...(options.createCanvas ? { canvas: options.createCanvas() } : {}),
        baseOptions: { modelAssetPath: assets.model, delegate: 'CPU' },
      });
    }

    if (signal.aborted) {
      closeHandLandmarker(detector);
      signal.throwIfAborted();
    }
    return { detector, delegate };
  });
  initializationQueue = initialization.then(() => undefined, () => undefined);
  return initialization;
}
