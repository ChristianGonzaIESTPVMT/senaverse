import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CircleAlert, Hand, ScanLine } from 'lucide-react';
import { useHandDetection } from '../features/sign-recognition/useHandDetection';
import { handDetectionMessage, type FreshHandInference, type HandDetectionState, type HandDiagnosticSnapshot } from '../features/sign-recognition/types';
import { CAMERA_VIDEO_CONSTRAINTS, DEFAULT_HAND_PROFILE, type HandDetectionProfile } from '../features/sign-recognition/config';
import { claimCamera } from '../features/sign-recognition/cameraAccess';

const HandDiagnostics = import.meta.env.DEV ? lazy(() => import('../features/sign-recognition/HandDiagnostics')) : null;

type CameraStatus = 'idle' | 'requesting' | 'active' | 'error';
export type PracticeCameraSessionState = { cameraStatus: CameraStatus; detector: HandDetectionState };

const cameraErrors: Record<string, string> = {
  NotAllowedError: 'El permiso de cámara está desactivado. Puedes habilitarlo en tu navegador y volver a intentarlo.',
  SecurityError: 'El navegador ha bloqueado el acceso a la cámara. Revisa los permisos del sitio.',
  NotFoundError: 'No se encontró una cámara conectada a este dispositivo.',
  NotReadableError: 'No se pudo abrir la cámara seleccionada. Puede estar ocupada, desconectada o deshabilitada en el sistema. Revisa qué cámara está elegida en el navegador y cierra otras aplicaciones que la estén utilizando.',
};

export function PracticeCamera({ disabled = false, disabledReason = 'Selecciona primero una seña para practicar.', showLandmarks = true, onFreshInference, onSessionState, onDiagnostics, motion = false }: { disabled?: boolean;
  motion?: boolean;
  disabledReason?: string;
  showLandmarks?: boolean;
  onFreshInference?: (event: FreshHandInference) => void;
  onSessionState?: (state: PracticeCameraSessionState) => void;
  onDiagnostics?: (snapshot: HandDiagnosticSnapshot | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const leaseRef = useRef<ReturnType<typeof claimCamera>>(null);
  const requestRef = useRef(0);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState('');
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(() => import.meta.env.DEV && typeof window !== 'undefined'
    && (import.meta.env.VITE_HAND_DEBUG === 'true' || new URLSearchParams(window.location.search).get('handDebug') === '1'));
  const [profile, setProfile] = useState<HandDetectionProfile>(DEFAULT_HAND_PROFILE);
  const detection = useHandDetection(videoRef, canvasRef, status === 'active', { profile, diagnosticsEnabled: diagnosticsEnabled || !!onDiagnostics, onFreshInference });
  const detectorStatus = detection.state.status;
  const detectedHands = detection.state.handCount;
  const missingHands = detection.state.missingHands;
  useEffect(() => { onSessionState?.({ cameraStatus: status, detector: { status: detectorStatus, handCount: detectedHands, ...(missingHands ? { missingHands } : {}) } }); }, [onSessionState, status, detectorStatus, detectedHands, missingHands]);
  useEffect(() => { onDiagnostics?.(status === 'active' ? detection.diagnostics : null); }, [onDiagnostics, detection.diagnostics, status]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      requestRef.current += 1;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      leaseRef.current?.release();
      leaseRef.current = null;
      if (video) video.srcObject = null;
    };
  }, []);

  function stopCamera() {
    detection.stop();
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    leaseRef.current?.release();
    leaseRef.current = null;
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
    if (disabled || leaseRef.current) return;
    detection.stop();
    if (!navigator.mediaDevices?.getUserMedia) {
      failCamera('La vista previa requiere acceso a cámara en un navegador compatible mediante HTTPS o localhost.');
      return;
    }

    const lease = claimCamera();
    if (!lease) {
      setError('Otra vista está utilizando la cámara o esperando permiso. Ciérrala o responde al permiso y vuelve a intentarlo.');
      setStatus('error');
      return;
    }
    leaseRef.current = lease;
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
        lease.release();
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setStatus('active');

      stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        if (requestRef.current !== requestId) return;
        failCamera('La cámara se ha desconectado. Puedes volver a activarla.');
      }, { once: true }));
      await videoRef.current.play();
    } catch (cameraError) {
      if (requestRef.current !== requestId) return;
      const name = cameraError instanceof Error ? cameraError.name : '';
      failCamera(cameraErrors[name] ?? 'No se pudo activar la cámara. Revisa la conexión y vuelve a intentarlo.');
    } finally {
      lease.settled();
    }
  }

  const isActive = status === 'active';
  const isRequesting = status === 'requesting';
  const DetectorIcon = motion && detectorStatus === 'detected' ? Hand
    : motion && (detectorStatus === 'error' || detectorStatus === 'lost') ? CircleAlert
      : ScanLine;
  const buttonLabels: Record<CameraStatus, string> = {
    idle: 'Activar cámara',
    requesting: 'Cancelar activación',
    active: 'Desactivar cámara',
    error: 'Volver a activar cámara',
  };

  return (
    <section className="practice-panel practice-camera-panel" aria-labelledby="practice-camera-title"
      data-camera={motion ? status : undefined} data-detector={motion ? detectorStatus : undefined}>
      <div className="practice-panel-heading">
        <h2 id="practice-camera-title"><Camera size={22} aria-hidden="true" /> Tu cámara</h2>
        <span className={`practice-camera-status${isActive ? ' is-active' : ''}`} role="status">
          {isActive ? 'Activada' : isRequesting ? 'Solicitando permiso' : motion && status === 'error' ? 'Error de cámara' : 'Desactivada'}
        </span>
      </div>
      <div className="practice-camera-preview">
        <video ref={videoRef} autoPlay playsInline muted hidden={!isActive} aria-label="Vista previa de tu cámara" onError={() => failCamera('La vista previa no pudo reproducirse. Puedes volver a activar la cámara.')} />
        <canvas ref={canvasRef} className="practice-hand-overlay" hidden={!isActive} style={{ opacity: showLandmarks ? undefined : 0 }} aria-hidden="true" />
        {!isActive && <div className="practice-camera-placeholder">
          <CameraOff size={43} strokeWidth={1.5} aria-hidden="true" />
          <strong>{isRequesting ? 'Esperando tu autorización' : 'La cámara está desactivada'}</strong>
          <p id="practice-camera-help">{disabled ? disabledReason : isRequesting ? 'Responde a la solicitud de permisos de tu navegador.' : 'Actívala cuando estés listo para practicar.'}</p>
        </div>}
      </div>
      <div className={`practice-recognition-state${detectorStatus === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite" aria-atomic="true"><DetectorIcon size={20} aria-hidden="true" /><span>{handDetectionMessage(detection.state)}</span></div>
      {isActive && detection.state.status === 'error' && <button className="button button-outline practice-detector-retry" type="button" onClick={detection.retry}>Reintentar detector</button>}
      {error && <p className="practice-camera-error" role="alert">{error}</p>}
      <button className={`button button-primary practice-camera-button${motion ? ' sv-motion-action' : ''}`} type="button" disabled={disabled} aria-describedby={!isActive ? 'practice-camera-help' : undefined} onClick={() => { if (isActive || isRequesting) stopCamera(); else void startCamera(); }}>
        {isActive || isRequesting ? <CameraOff size={19} aria-hidden="true" /> : <Camera size={19} aria-hidden="true" />}
        {buttonLabels[status]}
      </button>
      <p className="practice-camera-privacy">Tu cámara se procesa localmente en este dispositivo.</p>
      {!onDiagnostics && diagnosticsEnabled && HandDiagnostics && <Suspense fallback={null}><HandDiagnostics snapshot={detection.diagnostics} profile={profile} onProfile={setProfile} onReset={detection.resetDiagnostics} onDisable={() => { setDiagnosticsEnabled(false); setProfile(DEFAULT_HAND_PROFILE); }} /></Suspense>}
    </section>
  );
}
