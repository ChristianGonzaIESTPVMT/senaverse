import { useCallback, useEffect, useRef, useState } from 'react';
import type { PracticeCameraSessionState } from '../../../components/PracticeCamera';
import type { FreshHandInference } from '../types';
import { CAPTURE_DEFAULTS } from './datasetTypes';
import { DatasetCapture, type CaptureSelection, type DatasetCaptureView } from './datasetCapture';
import { expectedHandsMatch } from './signCatalog';
import type { CountdownSeconds } from './countdownPreferences';

function isSessionReady({ cameraStatus, detector }: PracticeCameraSessionState) {
  return cameraStatus === 'active' && !['idle', 'loading', 'error'].includes(detector.status);
}

export function useDatasetCapture() {
  const [capture] = useState(() => new DatasetCapture());
  const [view, setView] = useState(() => capture.view());
  const [camera, setCamera] = useState<PracticeCameraSessionState>({ cameraStatus: 'idle', detector: { status: 'idle', handCount: 0 } });
  const [error, setError] = useState('');
  const fresh = useRef<FreshHandInference | null>(null);
  const sessionReady = isSessionReady(camera);
  const active = isCapturing(view.phase);

  const updateView = useCallback(() => {
    const next = capture.advance();
    setView(previous => previous.phase === next.phase && previous.countdownRemainingMs === next.countdownRemainingMs && previous.elapsedMs === next.elapsedMs
      && previous.frameCount === next.frameCount && previous.warning === next.warning && previous.draft === next.draft ? previous : next);
    return next;
  }, [capture]);
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    function schedule(next: DatasetCaptureView) {
      if (!isCapturing(next.phase)) return;
      const remaining = next.countdownRemainingMs;
      // Wake on each displayed second and on the capture deadline.
      const delay = next.phase === 'countdown' ? remaining % 1000 || Math.min(remaining, 1000) : 100;
      timer = setTimeout(() => schedule(updateView()), Math.ceil(delay));
    }
    schedule(capture.view());
    return () => clearTimeout(timer);
  }, [active, capture, updateView]);
  useEffect(() => () => { capture.cancel(); }, [capture]);

  const onFreshInference = useCallback((event: FreshHandInference) => {
    fresh.current = event;
    try { capture.accept(event); }
    catch { capture.cancel('La captura se canceló por un resultado inválido.'); updateView(); }
  }, [capture, updateView]);
  const onSessionState = useCallback((state: PracticeCameraSessionState) => {
    setCamera(state);
    if (isSessionReady(state)) return;
    fresh.current = null;
    if (isCapturing(capture.view().phase)) {
      capture.cancel('Se interrumpió la cámara o el detector. La captura incompleta no se guardó.');
      updateView();
    }
  }, [capture, updateView]);

  const start = useCallback((selection: CaptureSelection, countdownSeconds: CountdownSeconds) => {
    setError('');
    try {
      const latest = fresh.current;
      if (!sessionReady) throw new Error('Activa la cámara y espera a que el detector esté listo.');
      if (countdownSeconds === 0 && (!latest || performance.now() - latest.capturedAtMs > CAPTURE_DEFAULTS.maxFreshAgeMs
        || !expectedHandsMatch(selection.sign, latest.result.landmarks.length))) throw new Error('Coloca las manos esperadas dentro del encuadre y espera una detección reciente.');
      capture.start(selection, countdownSeconds); updateView();
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo iniciar la captura.'); }
  }, [capture, sessionReady, updateView]);
  const cancel = useCallback(() => { capture.cancel(); setError(''); updateView(); }, [capture, updateView]);

  return { view, camera, sessionReady, error, start, cancel, onFreshInference, onSessionState };
}

function isCapturing(phase: DatasetCaptureView['phase']) {
  return phase === 'countdown' || phase === 'recording' || phase === 'finishing';
}
