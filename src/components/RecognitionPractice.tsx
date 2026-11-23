import { memo, useCallback, useId, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { PracticeCamera, type PracticeCameraSessionState } from './PracticeCamera';
import { recognitionSigns, recognitionSignsById, resolvePracticeSign } from '../features/sign-recognition/recognitionCatalog';
import { getEducationalSignForClass } from '../data/library';
import { loadEducationModel } from '../features/sign-recognition/educationModel';
import { useRecognition } from '../features/sign-recognition/useRecognition';
import { RECOGNITION_STATES } from '../features/sign-recognition/liveRecognition';
import type { RecognitionConfirmation } from '../features/sign-recognition/recognitionResult';
import { SignMediaViewer } from './SignMediaViewer';

const PracticePreview = memo(PracticeCamera);

export function RecognitionPractice({ initialSign = '', onConfirmed, guided, onSave }: {
  initialSign?: string;
  onConfirmed?: (event: RecognitionConfirmation) => void;
  onSave?: (signId: string) => void;
  guided?: { targetId: string; instruction: string; onAccept: (signId: string) => void; acceptLabel?: string };
}) {
  const initial = resolvePracticeSign(guided?.targetId ?? initialSign);
  const [confirmedMatch, setConfirmedMatch] = useState<string | null>(null);
  const [saveableSignId, setSaveableSignId] = useState<string | null>(null);
  const [practiceSaved, setPracticeSaved] = useState(false);
  const savedAttempt = useRef(false);
  const recognition = useRecognition(loadEducationModel, {
    initialMode: initial ? { type: 'directed', targetId: initial.id } : { type: 'free' },
    onConfirmed(event) {
      onConfirmed?.(event);
      if (guided) setConfirmedMatch(event.outcome === 'matched' && event.signId === guided.targetId ? event.signId : null);
      if (onSave) setSaveableSignId(event.outcome === 'different' ? null : event.signId);
    },
  });
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(() => !!initialSign && !initial);
  const selectRef = useRef<HTMLSelectElement>(null);
  const id = useId();
  const { mode, result, modelState, cameraActive } = recognition;
  const targetId = mode.type === 'directed' ? mode.targetId : '';
  const confirmed = result.confirmation && recognitionSignsById.get(result.confirmation.signId);
  const entry = getEducationalSignForClass(targetId || confirmed?.id || '');

  const clearSavedPractice = useCallback(() => {
    savedAttempt.current = false;
    setPracticeSaved(false);
    setSaveableSignId(null);
  }, []);
  const { onSessionState } = recognition.cameraBindings;
  const trackPracticeState = useCallback((state: PracticeCameraSessionState) => {
    onSessionState(state);
    if (state.cameraStatus !== 'active' || state.detector.status === 'error' || state.detector.status === 'loading') {
      setConfirmedMatch(null);
      if (onSave) clearSavedPractice();
    }
  }, [clearSavedPractice, onSave, onSessionState]);

  function selectTarget(signId: string) {
    clearSavedPractice();
    setShowUnavailable(false);
    recognition.changeMode(signId ? { type: 'directed', targetId: signId } : { type: 'free' });
  }

  return <section aria-label="Práctica con reconocimiento">
    {!guided && <div className="practice-panel practice-selection">
      <div className="practice-select-field">
        <label htmlFor={id}>Modo de práctica</label>
        <select id={id} ref={selectRef} value={targetId} onChange={event => selectTarget(event.target.value)}>
          <option value="">Reconocimiento libre</option>
          <optgroup label="Práctica dirigida">
            {recognitionSigns.map(sign => <option key={sign.id} value={sign.id}>{sign.name}</option>)}
          </optgroup>
        </select>
      </div>
      <div className="practice-selection-note">
        <span className="practice-demo-label">Reconocimiento experimental</span>
        <p>Procesamiento local de diez señas de LSP.</p>
      </div>
    </div>}
    {showUnavailable && <p className="practice-feedback" role="status">La seña del enlace está fuera del catálogo de reconocimiento. Elige una de las diez disponibles.</p>}
    {modelState.status === 'loading' && <p className="practice-feedback" role="status">Cargando el reconocimiento…</p>}
    {modelState.status === 'error' && <div className="practice-recognition-error">
      <p className="practice-feedback" role="alert">{modelState.message}</p>
      <button type="button" className="button button-outline" onClick={recognition.reloadModel}>Reintentar carga</button>
    </div>}
    <div className="practice-workspace">
      <div className="practice-recognition-column">
        <PracticePreview {...recognition.cameraBindings} onSessionState={onSave || guided ? trackPracticeState : onSessionState} disabled={modelState.status !== 'ready' && !cameraActive}
          disabledReason="La cámara estará disponible cuando cargue el reconocimiento." showLandmarks={showLandmarks} />
        <label className="practice-panel practice-overlay-toggle">
          <input type="checkbox" checked={showLandmarks} onChange={event => setShowLandmarks(event.target.checked)} />
          Mostrar puntos de la mano
        </label>
      </div>
      <div className="practice-recognition-column">
        <section className="practice-panel practice-recognition-result">
          <h2>Resultado de reconocimiento</h2>
          <div className="practice-student-result" role="status" aria-atomic="true">
            <p>{RECOGNITION_STATES[result.status]}</p>
            {confirmed && <><strong>{confirmed.name}</strong>
              {result.confirmation?.outcome === 'matched' && <p>Coincide con la seña que estás practicando.</p>}
              {result.confirmation?.outcome === 'different' && <p>El modelo confirmó una seña distinta de la elegida.</p>}
            </>}
          </div>
          <button type="button" className="button button-outline" onClick={() => {
            setConfirmedMatch(null);
            clearSavedPractice();
            recognition.reset();
          }} disabled={!cameraActive || modelState.status !== 'ready'}>
            <RotateCcw size={17} aria-hidden="true" /> Reintentar práctica
          </button>
          {onSave && (practiceSaved ? <p role="status">Práctica experimental guardada en Mi progreso.</p>
            : cameraActive && saveableSignId && <><p>Coincidencia experimental disponible · {recognitionSignsById.get(saveableSignId)?.name}</p>
              <button className="button button-primary" type="button" onClick={() => {
              if (savedAttempt.current) return;
              savedAttempt.current = true;
              setPracticeSaved(true);
              onSave(saveableSignId);
            }}>Guardar práctica con cámara</button></>)}
          {cameraActive && guided && confirmedMatch === guided.targetId && <>
            <p>Coincidencia experimental disponible para registrar en este intento.</p>
            <button type="button" className="button button-primary" onClick={() => guided.onAccept(confirmedMatch)}>{guided.acceptLabel ?? 'Guardar práctica y continuar'}</button>
          </>}
        </section>
        <section className="practice-panel practice-recognition-result">
          <h2>{entry ? `Referencia educativa de «${entry.word}»` : 'Cómo practicar'}</h2>
          {entry ? <SignMediaViewer key={entry.id} sign={entry} instruction={guided?.instruction ?? entry.instructions} compact />
            : <p>Mantén las posturas estáticas hasta la confirmación. Para las señas dinámicas, realiza el movimiento completo.</p>}
        </section>
      </div>
    </div>
    {!guided && <details className="practice-panel practice-catalog">
      <summary>Consultar las diez señas compatibles</summary>
      <ul>{recognitionSigns.map(sign => <li key={sign.id}>
        <button type="button" className="button button-outline" aria-pressed={targetId === sign.id} onClick={() => {
          selectTarget(sign.id);
          selectRef.current?.focus();
        }}>{sign.name}</button>
      </li>)}</ul>
    </details>}
  </section>;
}
