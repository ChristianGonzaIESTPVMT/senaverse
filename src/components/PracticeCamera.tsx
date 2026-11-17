import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { useHandDetection } from '../features/sign-recognition/useHandDetection';
import { handDetectionMessage, type FreshHandInference, type HandDetectionState } from '../features/sign-recognition/types';
import { CAMERA_VIDEO_CONSTRAINTS, DEFAULT_HAND_PROFILE, type HandDetectionProfile } from '../features/sign-recognition/config';

const HandDiagnostics = import.meta.env.DEV ? lazy(() => import('../features/sign-recognition/HandDiagnostics')) : null;

type CameraStatus = 'idle' | 'requesting' | 'active' | 'error';
export type PracticeCameraSessionState = { cameraStatus: CameraStatus; detector: HandDetectionState };

const cameraErrors: Record<string, string> = {
  NotAllowedError: 'El permiso de cámara está desactivado. Puedes habilitarlo en tu navegador y volver a intentarlo.',
  SecurityError: 'El navegador ha bloqueado el acceso a la cámara. Revisa los permisos del sitio.',
  NotFoundError: 'No se encontró una cámara conectada a este dispositivo.',
  NotReadableError: 'No se pudo acceder a la cámara. Comprueba si otra aplicación la está utilizando.',
};

export function PracticeCamera({ disabled = false, onFreshInference, onSessionState }: { disabled?: boolean;
  onFreshInference?: (event: FreshHandInference) => void;
  onSessionState?: (state: PracticeCameraSessionState) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState('');
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(() => import.meta.env.DEV && typeof window !== 'undefined'
    && (import.meta.env.VITE_HAND_DEBUG === 'true' || new URLSearchParams(window.location.search).get('handDebug') === '1'));
  const [profile, setProfile] = useState<HandDetectionProfile>(DEFAULT_HAND_PROFILE);
  const detection = useHandDetection(videoRef, canvasRef, status === 'active', { profile, diagnosticsEnabled, onFreshInference });
  const detectorStatus = detection.state.status;
  const detectedHands = detection.state.handCount;
  const missingHands = detection.state.missingHands;
  useEffect(() => { onSessionState?.({ cameraStatus: status, detector: { status: detectorStatus, handCount: detectedHands, ...(missingHands ? { missingHands } : {}) } }); }, [onSessionState, status, detectorStatus, detectedHands, missingHands]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      requestRef.current += 1;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (video) video.srcObject = null;
    };
  }, []);

  function stopCamera() {
    detection.stop();
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
    setError('');
  }

  function failCamera(message: string) {
    stopCamera();
    setError(message);
    setStatus('error');
  }

  async function startCamera() {
    if (disabled) return;
    detection.stop();
    if (!navigator.mediaDevices?.getUserMedia) {
      failCamera('La vista previa requiere acceso a cámara en un navegador compatible mediante HTTPS o localhost.');
      return;
    }

    const requestId = ++requestRef.current;
    setStatus('requesting');
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: CAMERA_VIDEO_CONSTRAINTS,
        audio: false,
      });

      if (requestRef.current !== requestId || !videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setStatus('active');

      stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        if (requestRef.current !== requestId) return;
        failCamera('La cámara se ha desconectado. Puedes volver a activarla.');
      }, { once: true }));
    } catch (cameraError) {
      if (requestRef.current !== requestId) return;
      const name = cameraError instanceof Error ? cameraError.name : '';
      failCamera(cameraErrors[name] ?? 'No se pudo activar la cámara. Revisa la conexión y vuelve a intentarlo.');
    }
  }

  const isActive = status === 'active';
  const isRequesting = status === 'requesting';
  const buttonLabels: Record<CameraStatus, string> = {
    idle: 'Activar cámara',
    requesting: 'Cancelar activación',
    active: 'Desactivar cámara',
    error: 'Volver a activar cámara',
  };

  return (
    <section className="practice-panel practice-camera-panel" aria-labelledby="practice-camera-title">
      <div className="practice-panel-heading">
        <h2 id="practice-camera-title"><Camera size={22} aria-hidden="true" /> Tu cámara</h2>
        <span className={`practice-camera-status${isActive ? ' is-active' : ''}`} role="status">
          {isActive ? 'Activada' : isRequesting ? 'Solicitando permiso' : 'Desactivada'}
        </span>
      </div>
      <div className="practice-camera-preview">
        <video ref={videoRef} autoPlay playsInline muted hidden={!isActive} aria-label="Vista previa de tu cámara" onError={() => failCamera('La vista previa no pudo reproducirse. Puedes volver a activar la cámara.')} />
        <canvas ref={canvasRef} className="practice-hand-overlay" hidden={!isActive} aria-hidden="true" />
        {!isActive && <div className="practice-camera-placeholder">
          <CameraOff size={43} strokeWidth={1.5} aria-hidden="true" />
          <strong>{isRequesting ? 'Esperando tu autorización' : 'La cámara está desactivada'}</strong>
          <p>{disabled ? 'Selecciona primero una seña para practicar.' : isRequesting ? 'Responde a la solicitud de permisos de tu navegador.' : 'Actívala cuando estés listo para practicar.'}</p>
        </div>}
      </div>
      <div className={`practice-recognition-state${detection.state.status === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite" aria-atomic="true"><ScanLine size={20} aria-hidden="true" /><span>{handDetectionMessage(detection.state)}</span></div>
      {isActive && detection.state.status === 'error' && <button className="button button-outline practice-detector-retry" type="button" onClick={detection.retry}>Reintentar detector</button>}
      {error && <p className="practice-camera-error" role="alert">{error}</p>}
      <button className="button button-primary practice-camera-button" type="button" disabled={disabled} onClick={() => { if (isActive || isRequesting) stopCamera(); else void startCamera(); }}>
        {isActive || isRequesting ? <CameraOff size={19} aria-hidden="true" /> : <Camera size={19} aria-hidden="true" />}
        {buttonLabels[status]}
      </button>
      <p className="practice-camera-privacy">Tu cámara se procesa localmente en este dispositivo.</p>
      {diagnosticsEnabled && HandDiagnostics && <Suspense fallback={null}><HandDiagnostics snapshot={detection.diagnostics} profile={profile} onProfile={setProfile} onReset={detection.resetDiagnostics} onDisable={() => { setDiagnosticsEnabled(false); setProfile(DEFAULT_HAND_PROFILE); }} /></Suspense>}
    </section>
  );
}
