import { DEFAULT_HAND_PROFILE, DIAGNOSTIC_INTERVAL_MS, MAX_DETECTION_FPS, MAX_RESULT_AGE_MS, getHandLandmarkerOptions, type HandDetectionProfile } from './config.ts';
import { clearHandCanvas, drawHandLandmarks } from './drawHandLandmarks.ts';
import { captureHandFrame, closeCapturedFrame, createHandInferenceBackend } from './inferenceBackend.ts';
import { HandPerformanceMetrics } from './performanceMetrics.ts';
import { HandTrackingContinuity } from './trackingContinuity.ts';
import { detectionFailure } from './detectionErrors.ts';
import type { BackendOptions, CapturedHandFrame, FreshHandInference, HandDetectionResult, HandDetectionSession, HandDetectionState, HandDiagnosticSnapshot, HandFailurePhase, HandInferenceBackend } from './types.ts';

type FrameMetadata = { mediaTime: number; presentedFrames?: number };
type FrameCallback = (timestamp: number, metadata: FrameMetadata) => void;
export type HandFrameScheduler = {
  request: (callback: FrameCallback) => number;
  cancel: (id: number) => void;
  now: () => number;
  source?: HandDiagnosticSnapshot['cameraFpsSource'];
};

export function createHandFrameScheduler(video: HTMLVideoElement): HandFrameScheduler {
  if (typeof video.requestVideoFrameCallback === 'function') return {
    request: callback => video.requestVideoFrameCallback(callback),
    cancel: id => video.cancelVideoFrameCallback(id), now: () => performance.now(), source: 'video-callback',
  };
  const qualityAvailable = typeof video.getVideoPlaybackQuality === 'function';
  return {
    request: callback => requestAnimationFrame(now => {
      const frames = qualityAvailable ? video.getVideoPlaybackQuality().totalVideoFrames : 0;
      callback(now, { mediaTime: video.currentTime, ...(frames > 0 ? { presentedFrames: frames } : {}) });
    }),
    cancel: id => cancelAnimationFrame(id), now: () => performance.now(),
    get source() { return qualityAvailable && video.getVideoPlaybackQuality().totalVideoFrames > 0 ? 'playback-quality' : 'sampled'; },
  };
}

type DetectionOptions = {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  onState: (state: HandDetectionState) => void;
  onResult: (result: HandDetectionResult | null) => void;
  onDiagnostics?: (snapshot: HandDiagnosticSnapshot) => void;
  onFreshInference?: (event: FreshHandInference) => void;
  profile?: HandDetectionProfile;
  createBackend?: (signal: AbortSignal, options: BackendOptions) => Promise<HandInferenceBackend>;
  captureFrame?: (video: HTMLVideoElement) => Promise<CapturedHandFrame>;
  scheduler?: HandFrameScheduler;
};

/** Single flight: capture the current frame only when idle, never enqueue a waiting frame. */
export function startHandDetection({ video, canvas, onState, onResult, onDiagnostics, onFreshInference, profile = DEFAULT_HAND_PROFILE,
  createBackend = createHandInferenceBackend, captureFrame = captureHandFrame, scheduler = createHandFrameScheduler(video),
}: DetectionOptions): HandDetectionSession {
  const abort = new AbortController();
  const continuity = new HandTrackingContinuity();
  let metrics = new HandPerformanceMetrics(scheduler.now());
  let backend: HandInferenceBackend | null = null;
  let frameId: number | null = null;
  let visualTimer: ReturnType<typeof setTimeout> | null = null;
  let diagnosticTimer: ReturnType<typeof setInterval> | null = null;
  let lastMediaTime = -1;
  let lastPresentedFrames: number | null = null;
  let lastCaptureAt = -Infinity;
  let lastTimestamp = -Infinity;
  let lastAcceptedTimestamp = -Infinity;
  let latestFrameToken = 0;
  let lastStartedToken = 0;
  let lastObservedAt = -Infinity;
  let processingWidth = 0;
  let processingHeight = 0;
  let busy = false;
  let stopped = false;
  let cameraFrameRate: number | null = null;
  let lastFreshAt: number | null = null;
  let lastVisual: HandDiagnosticSnapshot['visualState'] = 'none';
  let lastTrackingStatus: HandDetectionState['status'] = 'searching';
  let rendered: { result: HandDetectionResult | null; opacity: number; geometry: string } | null = null;

  function readDiagnostics(): HandDiagnosticSnapshot {
    const stream = video.srcObject as MediaStream | null;
    const settings = stream?.getVideoTracks?.()[0]?.getSettings?.() ?? {};
    const now = scheduler.now();
    const view = continuity.view(now);
    return { ...metrics.snapshot(now), profile,
      delegate: backend?.delegate ?? null, backend: backend?.kind ?? null,
      processingWidth, processingHeight, cameraWidth: settings.width ?? null, cameraHeight: settings.height ?? null,
      configuredCameraFps: settings.frameRate ?? null, cameraFpsSource: scheduler.source ?? 'sampled',
      handCount: view.state.handCount, mismatchedResponses: backend?.diagnostics?.().mismatchedResponses ?? 0,
      trackingStatus: metrics.lastError ? 'error' : !backend ? 'loading' : view.state.status,
      visualState: metrics.lastError ? 'none' : view.result ? view.opacity < 1 ? 'held' : 'live' : 'none',
      lossReason: view.lossReason, lastAcceptedAgeMs: lastFreshAt === null ? null : Math.max(0, now - lastFreshAt) };
  }

  function publishDiagnostics() {
    if (!onDiagnostics || stopped) return;
    onDiagnostics(readDiagnostics());
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    abort.abort();
    if (frameId !== null) scheduler.cancel(frameId);
    if (visualTimer !== null) clearTimeout(visualTimer);
    if (diagnosticTimer !== null) clearInterval(diagnosticTimer);
    frameId = null; visualTimer = null; diagnosticTimer = null;
    backend?.close(); backend = null;
    onResult(null);
    clearHandCanvas(canvas);
  }

  function fail(error: unknown, phase: HandFailurePhase) {
    if (stopped) return;
    const failure = detectionFailure(error, phase);
    metrics.failures++;
    metrics.lastError = failure;
    publishDiagnostics();
    stop();
    onState({ status: 'error', handCount: 0, error: failure });
  }

  function redraw() {
    if (stopped) return;
    try {
      if (visualTimer !== null) clearTimeout(visualTimer);
      const view = continuity.view(scheduler.now());
      const visual = view.result ? view.opacity < 1 ? 'held' : 'live' : 'none';
      if (lastTrackingStatus === 'detected' && view.state.handCount === 0 && view.lossReason === 'result-gap') metrics.freshnessExpirations++;
      if (visual === 'held' && lastVisual !== 'held') metrics.visualHolds++;
      lastVisual = visual; lastTrackingStatus = view.state.status;
      const bounds = canvas.getBoundingClientRect();
      const geometry = `${bounds.width}/${bounds.height}/${canvas.width}/${canvas.height}/${video.videoWidth}/${video.videoHeight}/${globalThis.devicePixelRatio || 1}`;
      if (!rendered || rendered.result !== view.result || rendered.opacity !== view.opacity || rendered.geometry !== geometry) {
        drawHandLandmarks(canvas, video, view.result, view.opacity);
        metrics.canvasDraws++;
        rendered = { result: view.result, opacity: view.opacity, geometry: `${bounds.width}/${bounds.height}/${canvas.width}/${canvas.height}/${video.videoWidth}/${video.videoHeight}/${globalThis.devicePixelRatio || 1}` };
      }
      onState(view.state);
      onResult(view.state.status === 'detected' ? view.result : null);
      visualTimer = view.nextChangeMs === null ? null : setTimeout(redraw, Math.max(1, view.nextChangeMs));
    } catch (error) { fail(error, 'render'); }
  }

  async function processFrame() {
    let ownedFrame: CapturedHandFrame | null = null;
    busy = true;
    let phase: HandFailurePhase = 'capture';
    // Timestamp the bitmap request itself, not an earlier video callback.
    const capturedAt = scheduler.now();
    try {
      ownedFrame = await captureFrame(video);
      if (stopped || video.paused || scheduler.now() - capturedAt > MAX_RESULT_AGE_MS) {
        metrics.droppedFrames++;
        if (!stopped && !video.paused) metrics.expiredCaptures++;
        return;
      }
      processingWidth = ownedFrame.width; processingHeight = ownedFrame.height;
      const timestamp = Math.max(scheduler.now(), lastTimestamp + 0.001);
      lastTimestamp = timestamp;
      const transferred = ownedFrame;
      ownedFrame = null;
      phase = 'inference';
      const output = await backend!.infer(transferred, timestamp);
      if (stopped) return;
      const completedAt = scheduler.now();
      const latency = Math.max(0, completedAt - capturedAt);
      metrics.inference(completedAt, latency, output.inferenceMs, output.result);
      if (timestamp <= lastAcceptedTimestamp || latency > MAX_RESULT_AGE_MS || video.paused) {
        metrics.staleResults++;
        if (timestamp <= lastAcceptedTimestamp) metrics.staleByOrder++;
        else if (latency > MAX_RESULT_AGE_MS) metrics.staleByAge++;
        else metrics.pausedResults++;
        return;
      }
      lastAcceptedTimestamp = timestamp;
      lastFreshAt = capturedAt;
      onFreshInference?.({ source: 'worker', inferenceTimestampMs: timestamp, capturedAtMs: capturedAt,
        receivedAtMs: completedAt, result: output.result,
        configuration: { ...getHandLandmarkerOptions(profile), delegate: backend!.delegate, profile,
          processingWidth, processingHeight, cameraWidth: video.videoWidth, cameraHeight: video.videoHeight,
          cameraFrameRate, inputMirrored: false } });
      metrics.accepted(completedAt, output.result.landmarks.length, capturedAt);
      continuity.observe(output.result, capturedAt, completedAt);
      redraw();
    } catch (error) { fail(error, phase); }
    finally {
      if (ownedFrame) closeCapturedFrame(ownedFrame);
      busy = false;
      // A new frame may have arrived during inference. Capture the live video now,
      // rather than waiting a further camera interval; retain only its metadata.
      processNewestFrame();
    }
  }

  function processNewestFrame() {
    if (stopped || !backend || busy || video.paused || latestFrameToken === lastStartedToken) return;
    const now = scheduler.now();
    if (now - lastCaptureAt < 1000 / MAX_DETECTION_FPS - 0.5) return;
    lastStartedToken = latestFrameToken;
    if (now - lastObservedAt > MAX_RESULT_AGE_MS) { metrics.droppedFrames++; metrics.expiredCaptures++; return; }
    lastCaptureAt = now;
    void processFrame();
  }

  function observeFrame(_timestamp: number, metadata: FrameMetadata) {
    frameId = null;
    if (stopped || !backend) return;
    frameId = scheduler.request(observeFrame);
    if (video.paused || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    if (metadata.mediaTime === lastMediaTime) return;
    lastMediaTime = metadata.mediaTime;
    const advance = metadata.presentedFrames === undefined || lastPresentedFrames === null
      ? 1 : Math.max(1, metadata.presentedFrames - lastPresentedFrames);
    lastPresentedFrames = metadata.presentedFrames ?? null;
    const now = scheduler.now();
    metrics.cameraFrame(now, advance);
    metrics.droppedFrames += advance - 1;
    metrics.skippedCameraFrames += advance - 1;
    if (latestFrameToken > lastStartedToken) { metrics.droppedFrames++; metrics.supersededFrames++; }
    latestFrameToken++;
    lastObservedAt = now;
    if (!busy && now - lastCaptureAt < 1000 / MAX_DETECTION_FPS - 0.5) metrics.throttledFrames++;
    processNewestFrame();
  }

  onState({ status: 'loading', handCount: 0 });
  if (onDiagnostics) diagnosticTimer = setInterval(publishDiagnostics, DIAGNOSTIC_INTERVAL_MS);
  void createBackend(abort.signal, { profile }).then(instance => {
    if (stopped) { instance.close(); return; }
    backend = instance;
    cameraFrameRate = (video.srcObject as MediaStream | null)?.getVideoTracks?.()[0]?.getSettings?.().frameRate ?? null;
    onState({ status: 'searching', handCount: 0 });
    publishDiagnostics();
    frameId = scheduler.request(observeFrame);
  }).catch(error => fail(error, 'initialization'));

  return { stop, redraw, readDiagnostics, resetDiagnostics: () => { metrics = new HandPerformanceMetrics(scheduler.now(), continuity.view(scheduler.now()).state.handCount); publishDiagnostics(); } };
}
