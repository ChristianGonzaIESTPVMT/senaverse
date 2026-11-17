import { useEffect } from 'react';
import { Circle, CircleStop, Hand, Timer, Video } from 'lucide-react';
import { PracticeCamera } from '../PracticeCamera';
import { useDatasetCapture } from '../../features/sign-recognition/dataset/useDatasetCapture';
import { signConfigurationErrors } from '../../features/sign-recognition/dataset/signCatalog';
import type { DatasetParticipant, DatasetSample, DatasetSign } from '../../features/sign-recognition/dataset/datasetTypes';
import { SampleReview } from './SampleReview';

export function RecordingPanel({ participant, sign, sessionConsent, repetition, disabled, onLocked, onSave }: {
  participant: DatasetParticipant | undefined; sign: DatasetSign; sessionConsent: boolean; repetition: number; disabled: boolean;
  onLocked: (locked: boolean) => void; onSave: (sample: DatasetSample) => Promise<boolean>;
}) {
  const capture = useDatasetCapture();
  const { view, camera } = capture;
  const locked = view.phase !== 'idle';
  const configured = signConfigurationErrors(sign).length === 0;
  const permitted = !!participant && sessionConsent && configured;
  const recording = ['countdown', 'recording', 'finishing'].includes(view.phase);
  useEffect(() => { onLocked(locked); }, [locked, onLocked]);
  const selection = participant ? { participant, sign, repetition, sessionConsent } : null;
  function begin() { if (selection) capture.start(selection); }
  return <section className="dataset-panel dataset-recording" aria-labelledby="dataset-record-title">
    <div className="dataset-section-title"><div><span className="dataset-eyebrow">03 / RECOPILACIÓN</span><h2 id="dataset-record-title">Una repetición, una secuencia</h2></div><Video size={26} aria-hidden="true" /></div>
    <div className="dataset-session-labels"><span>{participant?.id ?? 'Sin participante'}</span><span>{sign.name || 'Etiqueta sin configurar'}</span><span>Repetición {repetition}</span></div>
    <div className="dataset-instructions"><strong>Instrucciones de ejecución</strong><p>{sign.instructions || 'Configura las instrucciones de esta etiqueta antes de recopilar.'}</p>{sign.referenceUrl && <a href={sign.referenceUrl} target="_blank" rel="noopener noreferrer">Abrir referencia audiovisual ↗</a>}</div>
    <PracticeCamera disabled={!permitted || disabled} onFreshInference={capture.onFreshInference} onSessionState={capture.onSessionState} />
    <div className={`dataset-recording-status${recording ? ' is-recording' : ''}`} aria-live="polite"><span><Timer size={19} aria-hidden="true" />{view.phase === 'countdown' ? `Prepárate · ${view.countdown}` : view.phase === 'recording' ? 'Grabando landmarks' : view.phase === 'finishing' ? 'Finalizando resultados pendientes…' : view.phase === 'review' ? 'Captura pendiente de guardar' : 'Lista para preparar la captura'}</span><strong>{(view.elapsedMs / 1000).toFixed(1)} / {(sign.durationMs / 1000).toFixed(1)} s</strong></div>
    <div className="dataset-live-count"><span><Hand size={17} aria-hidden="true" /> {camera.detector.handCount} manos detectadas · {sign.expectedHands} esperadas</span><span>{view.frameCount} observaciones</span></div>
    {view.warning && <p className="dataset-notice" role="status">{view.warning}</p>}
    {capture.error && <p className="dataset-error" role="alert">{capture.error}</p>}
    {view.phase === 'idle' && <button type="button" className="button button-primary dataset-start" disabled={disabled || !permitted || camera.cameraStatus !== 'active' || camera.detector.status !== 'detected' || camera.detector.handCount !== sign.expectedHands} onClick={begin}><Circle size={17} fill="currentColor" /> Iniciar cuenta regresiva</button>}
    {recording && <button type="button" className="button button-outline dataset-start" onClick={capture.cancel}><CircleStop size={18} /> Cancelar captura</button>}
    {view.draft && <SampleReview key={view.draft.sampleId} sample={view.draft} disabled={disabled} onDiscard={capture.cancel} onRepeat={() => { capture.cancel(); begin(); }} onSave={() => { const draft = view.draft; if (draft) void onSave(draft).then(saved => { if (saved) capture.cancel(); }); }} />}
    {!permitted && <p className="dataset-muted">Selecciona una persona, confirma su consentimiento y configura una etiqueta para habilitar la cámara.</p>}
  </section>;
}
