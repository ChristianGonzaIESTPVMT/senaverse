import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { startHandDetection } from './detectionSession';
import { DEFAULT_HAND_PROFILE, type HandDetectionProfile } from './config';
import type { HandDetectionResult, HandDetectionSession, HandDetectionState, HandDiagnosticSnapshot } from './types';

export function useHandDetection(videoRef: RefObject<HTMLVideoElement | null>, canvasRef: RefObject<HTMLCanvasElement | null>, active: boolean,
  { profile = DEFAULT_HAND_PROFILE, diagnosticsEnabled = false }: { profile?: HandDetectionProfile; diagnosticsEnabled?: boolean } = {}) {
  const [state, setState] = useState<HandDetectionState>({ status: 'idle', handCount: 0 });
  const [attempt, setAttempt] = useState(0);
  const [diagnostics, setDiagnostics] = useState<HandDiagnosticSnapshot | null>(null);
  const resultRef = useRef<HandDetectionResult | null>(null);
  const sessionRef = useRef<HandDetectionSession | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!active || !video || !canvas) return;

    const session = startHandDetection({ video, canvas, profile,
      onState: next => setState(previous => previous.status === next.status && previous.handCount === next.handCount && previous.missingHands === next.missingHands ? previous : next),
      onResult: result => { resultRef.current = result; },
      onDiagnostics: diagnosticsEnabled ? setDiagnostics : undefined,
    });
    sessionRef.current = session;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(session.redraw);
    observer?.observe(canvas.parentElement ?? canvas);
    window.addEventListener('resize', session.redraw);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', session.redraw);
      session.stop();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [active, attempt, videoRef, canvasRef, profile, diagnosticsEnabled]);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    resultRef.current = null;
    setState({ status: 'idle', handCount: 0 });
  }, []);
  const retry = useCallback(() => setAttempt(previous => previous + 1), []);
  const resetDiagnostics = useCallback(() => sessionRef.current?.resetDiagnostics(), []);

  return { state: active ? state : { status: 'idle', handCount: 0 } as HandDetectionState, resultRef, stop, retry, diagnostics, resetDiagnostics };
}
