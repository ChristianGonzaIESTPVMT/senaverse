import { useCallback, useEffect, useRef, useState } from 'react';
import type { PracticeCameraSessionState } from '../../../components/PracticeCamera';
import type { FreshHandInference } from '../types';
import { CAPTURE_DEFAULTS } from './datasetTypes';
import { DatasetCapture, type CaptureSelection } from './datasetCapture';
import { expectedHandsMatch } from './signCatalog';

export function useDatasetCapture() {
  const [capture] = useState(() => new DatasetCapture());
  const [view, setView] = useState(() => capture.view());
  const [camera, setCamera] = useState<PracticeCameraSessionState>({ cameraStatus: 'idle', detector: { status: 'idle', handCount: 0 } });
  const [error, setError] = useState('');
  const fresh = useRef<FreshHandInference | null>(null);

  const updateView = useCallback(() => {
    const next = capture.advance();
    setView(previous => previous.phase === next.phase && previous.countdown === next.countdown && previous.elapsedMs === next.elapsedMs
      && previous.frameCount === next.frameCount && previous.warning === next.warning && previous.draft === next.draft ? previous : next);
  }, [capture]);
  useEffect(() => {
    if (!['countdown', 'recording', 'finishing'].includes(view.phase)) return;
    const timer = setInterval(updateView, 100);
    return () => clearInterval(timer);
  }, [updateView, view.phase]);
  useEffect(() => () => { capture.cancel(); }, [capture]);

  const onFreshInference = useCallback((event: FreshHandInference) => {
    fresh.current = event;
    try { capture.accept(event); }
    catch { capture.cancel('La captura se canceló por un resultado inválido.'); updateView(); }
  }, [capture, updateView]);
  const onSessionState = useCallback((state: PracticeCameraSessionState) => {
    setCamera(state);
    if (['countdown', 'recording', 'finishing'].includes(capture.view().phase)
      && (state.cameraStatus !== 'active' || ['idle', 'loading', 'error'].includes(state.detector.status))) {
      capture.cancel('Se interrumpió la cámara o el detector. La captura incompleta no se guardó.');
      fresh.current = null;
      updateView();
    }
  }, [capture, updateView]);

  const start = useCallback((selection: CaptureSelection) => {
    setError('');
    try {
      const latest = fresh.current;
      if (camera.cameraStatus !== 'active' || !latest || performance.now() - latest.capturedAtMs > CAPTURE_DEFAULTS.maxFreshAgeMs
        || !expectedHandsMatch(selection.sign, latest.result.landmarks.length)) throw new Error('Activa la cámara y coloca las manos esperadas dentro del encuadre.');
      capture.start(selection); updateView();
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo iniciar la captura.'); }
  }, [capture, camera.cameraStatus, updateView]);
  const cancel = useCallback(() => { capture.cancel(); setError(''); updateView(); }, [capture, updateView]);

  return { view, camera, error, start, cancel, onFreshInference, onSessionState };
}
