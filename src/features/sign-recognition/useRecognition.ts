import { useCallback, useEffect, useRef, useState } from 'react';
import type { PracticeCameraSessionState } from '../../components/PracticeCamera';
import type { LabModel } from './labModel';
import { createRecognitionSession, initialRecognition, recognitionDefaults,
  type RecognitionSettings, type RecognitionSnapshot } from './liveRecognition';
import { recognitionResult, type RecognitionConfirmation, type RecognitionMode } from './recognitionResult';
import type { FreshHandInference, HandDiagnosticSnapshot } from './types';

export type RecognitionModelLoader = (signal: AbortSignal) => Promise<LabModel>;
type ModelState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; model: LabModel };
const freeMode: RecognitionMode = { type: 'free' };

/** One classifier session per camera consumer. Only fresh MediaPipe results enter the window. */
export function useRecognition(loadModel: RecognitionModelLoader, {
  initialMode = freeMode, onConfirmed,
}: { initialMode?: RecognitionMode; onConfirmed?: (event: RecognitionConfirmation) => void } = {}) {
  const session = useRef<ReturnType<typeof createRecognitionSession> | null>(null);
  const active = useRef(false);
  const currentMode = useRef(initialMode);
  const lastConfirmed = useRef<string | null>(null);
  const listener = useRef(onConfirmed);
  const [mode, setMode] = useState(initialMode);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelState, setModelState] = useState<ModelState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<RecognitionSnapshot>(() => initialRecognition());
  const [settings, setSettings] = useState<RecognitionSettings | null>(null);
  const [diagnostics, setDiagnostics] = useState<HandDiagnosticSnapshot | null>(null);

  useEffect(() => { listener.current = onConfirmed; }, [onConfirmed]);

  const publish = useCallback((next: RecognitionSnapshot) => {
    setSnapshot(next);
    const event = recognitionResult(next, currentMode.current).confirmation;
    const previous = lastConfirmed.current;
    lastConfirmed.current = event?.signId ?? null;
    if (event && event.signId !== previous) listener.current?.(event);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    void loadModel(abort.signal).then(model => {
      if (abort.signal.aborted) return;
      session.current = createRecognitionSession(model);
      if (active.current) publish(session.current.start());
      setSettings(recognitionDefaults(model));
      setModelState({ status: 'ready', model });
    }).catch(error => {
      if (abort.signal.aborted) return;
      setModelState({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo cargar el modelo.' });
    });
    return () => {
      abort.abort();
      session.current?.stop();
      session.current = null;
    };
  }, [attempt, loadModel, publish]);

  useEffect(() => {
    if (!cameraActive) return;
    const check = window.setInterval(() => {
      const next = session.current?.expire();
      if (next) publish(next);
    }, 50);
    const onVisibility = () => {
      if (document.hidden && session.current) publish(session.current.interrupt());
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(check);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [cameraActive, publish]);

  const onSessionState = useCallback(({ cameraStatus, detector }: PracticeCameraSessionState) => {
    const isActive = cameraStatus === 'active';
    if (active.current !== isActive) {
      active.current = isActive;
      setCameraActive(isActive);
      if (session.current) publish(isActive ? session.current.start() : session.current.stop());
    }
    if (isActive && (detector.status === 'loading' || detector.status === 'error') && session.current) {
      setDiagnostics(null);
      publish(detector.status === 'error' ? session.current.interrupt() : session.current.reset());
    }
  }, [publish]);

  const onFreshInference = useCallback((event: FreshHandInference) => {
    if (document.hidden) return;
    const next = session.current?.observe(event);
    if (next) publish(next);
  }, [publish]);

  const reset = useCallback(() => {
    if (session.current) publish(session.current.reset());
  }, [publish]);

  function changeMode(next: RecognitionMode, resetAttempt = true) {
    currentMode.current = next;
    setMode(next);
    if (resetAttempt) reset();
  }

  function reloadModel() {
    publish(session.current?.stop() ?? initialRecognition());
    setModelState({ status: 'loading' });
    setAttempt(value => value + 1);
  }

  function configure(next: RecognitionSettings) {
    setSettings(next);
    if (session.current) publish(session.current.configure(next));
  }

  return {
    modelState, cameraActive, mode, changeMode, reset, reloadModel, result: recognitionResult(snapshot, mode),
    cameraBindings: { onSessionState, onFreshInference },
    diagnostics: { snapshot, settings, device: diagnostics, setDevice: setDiagnostics, configure },
  };
}
