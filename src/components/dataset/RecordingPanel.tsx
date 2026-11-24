import { useEffect } from 'react';
import { Circle, CircleStop, Hand, Timer, Video } from 'lucide-react';
import { PracticeCamera } from '../PracticeCamera';
import { COUNTDOWN_OPTIONS, type CountdownSeconds } from '../../features/sign-recognition/dataset/countdownPreferences';
import { useDatasetCapture } from '../../features/sign-recognition/dataset/useDatasetCapture';
import { expectedHandsMatch, NADA_EXECUTION, signConfigurationErrors } from '../../features/sign-recognition/dataset/signCatalog';
import type { DatasetParticipant, DatasetSample, DatasetSign } from '../../features/sign-recognition/dataset/datasetTypes';
import type { CampaignCapture } from '../../features/sign-recognition/dataset/datasetCampaign';
import { SampleReview } from './SampleReview';

const captureStatus = {
  idle: 'En espera',
  countdown: 'Prepárate',
  recording: 'Grabando landmarks',
  finishing: 'Finalizando resultados pendientes…',
  review: 'Captura pendiente de guardar',
};

export function RecordingPanel({ participant, sign, sessionConsent, repetition, disabled, countdownSeconds, campaign, campaignCount = 0, onCountdownChange, onLocked, onSave }: {
  participant: DatasetParticipant | undefined; sign: DatasetSign; sessionConsent: boolean; repetition: number; disabled: boolean;
  countdownSeconds: CountdownSeconds; campaignCount?: number; onCountdownChange: (seconds: CountdownSeconds) => void;
  campaign?: CampaignCapture;
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
  const recording = ['recording', 'finishing'].includes(view.phase);
  const preparing = view.phase === 'countdown';
  const canStart = !disabled && permitted && capture.sessionReady
    && (countdownSeconds > 0 || ((sign.expectedHands === 0 || camera.detector.status === 'detected')
      && (campaign?.hand === 'none' ? camera.detector.handCount === 0 : expectedHandsMatch(sign, camera.detector.handCount))));
  const timerDisplay = preparing ? `${Math.ceil(view.countdownRemainingMs / 1000)} s`
    : `${(view.elapsedMs / 1000).toFixed(1)} / ${(sign.durationMs / 1000).toFixed(1)} s`;
  useEffect(() => { onLocked(locked); }, [locked, onLocked]);
  const selection = participant ? { participant, sign, repetition, sessionConsent, campaign } : null;
  function begin() { if (selection) capture.start(selection, countdownSeconds); }
  return <section className="dataset-panel dataset-recording" aria-labelledby="dataset-record-title">
    <div className="dataset-section-title"><div><span className="dataset-eyebrow">03 / RECOPILACIÓN</span><h2 id="dataset-record-title">Una repetición, una secuencia</h2></div><Video size={26} aria-hidden="true" /></div>
    <div className="dataset-session-labels"><span>{participant?.id ?? 'Sin participante'}</span><span>{sign.name || 'Etiqueta sin configurar'}</span><span>Repetición {repetition}</span></div>
    <div className="dataset-instructions"><strong>Instrucciones de ejecución · {sign.id}</strong><p>{sign.id === 'LSP-007' ? NADA_EXECUTION : sign.instructions || 'Configura las instrucciones de esta etiqueta antes de recopilar.'}</p>{sign.referenceUrl && <a href={sign.referenceUrl} target="_blank" rel="noopener noreferrer">{sign.sourceReference ? `Consultar MINEDU (2015) · página ${sign.sourceReference.page}` : 'Abrir referencia documental o audiovisual'} ↗</a>}
      {!campaign && sign.id === 'LSP-007' && <p>{campaignCount} de unas 30 capturas del hito guardadas. Registra un poco de reposo antes y después del desplazamiento.</p>}
      {!campaign && sign.category === 'negative' && <p>{campaignCount} de unos 60 ejemplos del hito guardados. Alterna tomas sin manos, con una mano y con dos. Incluye reposo, gestos fuera del catálogo, transiciones, índice inmóvil y movimientos incompletos.</p>}
      {sign.category === 'lsp' && <p>Referencia pendiente de revisión lingüística. La lateralidad descrita no impone una adaptación para personas zurdas o diestras; cualquier adaptación requiere revisión previa.</p>}
    </div>
    <p className="dataset-muted">{sign.type === 'static' ? 'Se guardará una secuencia de la postura durante todo el intervalo.' : 'Se guardará la secuencia temporal completa del movimiento.'} Cámara en espejo solo para la vista; coordenadas y lateralidad originales del detector, sin invertir.</p>
    <PracticeCamera disabled={!permitted || disabled} disabledReason={cameraDisabledReason} onFreshInference={capture.onFreshInference} onSessionState={capture.onSessionState} />
    <div className={`dataset-recording-status${preparing ? ' is-preparing' : recording ? ' is-recording' : ''}`} aria-live="polite" aria-atomic={preparing}>
      <span><Timer size={19} aria-hidden="true" />{captureStatus[view.phase]}</span><strong>{timerDisplay}</strong>
    </div>
    <div className="dataset-live-count"><span><Hand size={17} aria-hidden="true" /> {camera.detector.handCount} manos detectadas · {sign.expectedHands === 0 && !campaign ? 'sin requisito de manos' : `${sign.expectedHands} esperadas`}</span><span>{view.frameCount} observaciones</span></div>
    {view.warning && <p className="dataset-notice" role="status">{view.warning}</p>}
    {capture.error && <p className="dataset-error" role="alert">{capture.error}</p>}
    <div className="dataset-recording-controls">
      <fieldset className="dataset-countdown-options" disabled={disabled || locked}>
        <legend>Cuenta regresiva</legend>
        <div>{COUNTDOWN_OPTIONS.map(seconds => <label key={seconds}>
          <input className="sr-only" type="radio" name="dataset-countdown" value={seconds} checked={seconds === countdownSeconds}
            onChange={() => onCountdownChange(seconds)} />
          <span>{seconds === 0 ? 'Sin espera' : `${seconds} s`}</span>
        </label>)}</div>
      </fieldset>
      {view.phase !== 'review' && <button type="button" className={`button button-${locked ? 'outline' : 'primary'} dataset-start`}
        disabled={!locked && !canStart} onClick={locked ? capture.cancel : begin}>
        {locked ? <><CircleStop size={18} /> {preparing ? 'Cancelar cuenta regresiva' : 'Cancelar captura'}</>
          : <><Circle size={17} fill="currentColor" /> Grabar muestra</>}
      </button>}
    </div>
    {view.draft && <SampleReview key={view.draft.sampleId} sample={view.draft} disabled={disabled} onDiscard={capture.cancel} onRepeat={() => { capture.cancel(); begin(); }} onSave={() => { const draft = view.draft; if (draft) void onSave(draft).then(saved => { if (saved) capture.cancel(); }); }} />}
    {!permitted && <p className="dataset-muted">Selecciona una persona, confirma su consentimiento y configura una etiqueta para habilitar la cámara.</p>}
  </section>;
}
