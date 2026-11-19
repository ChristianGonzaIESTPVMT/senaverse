import { useEffect } from 'react';
import { Circle, CircleStop, Hand, Timer, Video } from 'lucide-react';
import { PracticeCamera } from '../PracticeCamera';
import { useDatasetCapture } from '../../features/sign-recognition/dataset/useDatasetCapture';
import { expectedHandsMatch, signConfigurationErrors } from '../../features/sign-recognition/dataset/signCatalog';
import type { DatasetParticipant, DatasetSample, DatasetSign } from '../../features/sign-recognition/dataset/datasetTypes';
import { SampleReview } from './SampleReview';

export function RecordingPanel({ participant, sign, sessionConsent, repetition, disabled, onLocked, onSave }: {
  participant: DatasetParticipant | undefined; sign: DatasetSign; sessionConsent: boolean; repetition: number; disabled: boolean;
  onLocked: (locked: boolean) => void; onSave: (sample: DatasetSample) => Promise<boolean>;
}) {
  const capture = useDatasetCapture();
  const { view, camera } = capture;
  const locked = view.phase !== 'idle';
  const configurationErrors = signConfigurationErrors(sign);
  const configured = configurationErrors.length === 0;
  const permitted = !!participant && sessionConsent && configured;
  const cameraDisabledReason = !participant ? 'Crea un participante con el botón + de Participantes o selecciona uno existente.'
    : !sessionConsent ? 'Confirma que esta persona dio su consentimiento y pulsa Registrar consentimiento en Participantes. Debes confirmarlo de nuevo al recargar o cambiar de participante.'
      : !configured ? `Configura esta etiqueta antes de activar la cámara: ${configurationErrors.join(' ')}`
        : 'Espera a que termine la operación de almacenamiento para activar la cámara.';
  const recording = ['countdown', 'recording', 'finishing'].includes(view.phase);
  useEffect(() => { onLocked(locked); }, [locked, onLocked]);
  const selection = participant ? { participant, sign, repetition, sessionConsent } : null;
  function begin() { if (selection) capture.start(selection); }
  return <section className="dataset-panel dataset-recording" aria-labelledby="dataset-record-title">
    <div className="dataset-section-title"><div><span className="dataset-eyebrow">03 / RECOPILACIÓN</span><h2 id="dataset-record-title">Una repetición, una secuencia</h2></div><Video size={26} aria-hidden="true" /></div>
    <div className="dataset-session-labels"><span>{participant?.id ?? 'Sin participante'}</span><span>{sign.name || 'Etiqueta sin configurar'}</span><span>Repetición {repetition}</span></div>
    <div className="dataset-instructions"><strong>Instrucciones de ejecución · {sign.id}</strong><p>{sign.instructions || 'Configura las instrucciones de esta etiqueta antes de recopilar.'}</p>{sign.referenceUrl && <a href={sign.referenceUrl} target="_blank" rel="noopener noreferrer">{sign.sourceReference ? `Consultar MINEDU (2015) · página ${sign.sourceReference.page}` : 'Abrir referencia documental o audiovisual'} ↗</a>}
      {sign.category === 'lsp' && <p>Referencia pendiente de revisión lingüística. La lateralidad descrita no impone una adaptación para personas zurdas o diestras; cualquier adaptación requiere revisión previa.</p>}
    </div>
    <p className="dataset-muted">{sign.type === 'static' ? 'Se guardará una secuencia de la postura durante todo el intervalo.' : 'Se guardará la secuencia temporal completa del movimiento.'} Cámara en espejo solo para la vista; coordenadas y lateralidad originales del detector, sin invertir.</p>
    <PracticeCamera disabled={!permitted || disabled} disabledReason={cameraDisabledReason} onFreshInference={capture.onFreshInference} onSessionState={capture.onSessionState} />
    <div className={`dataset-recording-status${recording ? ' is-recording' : ''}`} aria-live="polite"><span><Timer size={19} aria-hidden="true" />{view.phase === 'countdown' ? `Prepárate · ${view.countdown}` : view.phase === 'recording' ? 'Grabando landmarks' : view.phase === 'finishing' ? 'Finalizando resultados pendientes…' : view.phase === 'review' ? 'Captura pendiente de guardar' : 'Lista para preparar la captura'}</span><strong>{(view.elapsedMs / 1000).toFixed(1)} / {(sign.durationMs / 1000).toFixed(1)} s</strong></div>
    <div className="dataset-live-count"><span><Hand size={17} aria-hidden="true" /> {camera.detector.handCount} manos detectadas · {sign.expectedHands === 0 ? 'sin requisito de manos' : `${sign.expectedHands} esperadas`}</span><span>{view.frameCount} observaciones</span></div>
    {view.warning && <p className="dataset-notice" role="status">{view.warning}</p>}
    {capture.error && <p className="dataset-error" role="alert">{capture.error}</p>}
    {view.phase === 'idle' && <button type="button" className="button button-primary dataset-start" disabled={disabled || !permitted || camera.cameraStatus !== 'active' || ['idle', 'loading', 'error'].includes(camera.detector.status) || (sign.expectedHands > 0 && camera.detector.status !== 'detected') || !expectedHandsMatch(sign, camera.detector.handCount)} onClick={begin}><Circle size={17} fill="currentColor" /> Iniciar cuenta regresiva</button>}
    {recording && <button type="button" className="button button-outline dataset-start" onClick={capture.cancel}><CircleStop size={18} /> Cancelar captura</button>}
    {view.draft && <SampleReview key={view.draft.sampleId} sample={view.draft} disabled={disabled} onDiscard={capture.cancel} onRepeat={() => { capture.cancel(); begin(); }} onSave={() => { const draft = view.draft; if (draft) void onSave(draft).then(saved => { if (saved) capture.cancel(); }); }} />}
    {!permitted && <p className="dataset-muted">Selecciona una persona, confirma su consentimiento y configura una etiqueta para habilitar la cámara.</p>}
  </section>;
}
