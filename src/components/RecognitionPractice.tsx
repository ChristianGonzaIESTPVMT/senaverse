import { memo, useId, useRef, useState } from 'react';
import { BookOpen, RotateCcw } from 'lucide-react';
import { PracticeCamera } from './PracticeCamera';
import { mineduGuidePdf, recognitionSigns, recognitionSignsById, resolvePracticeSign } from '../features/sign-recognition/recognitionCatalog';
import { loadEducationModel } from '../features/sign-recognition/educationModel';
import { useRecognition } from '../features/sign-recognition/useRecognition';
import { RECOGNITION_STATES } from '../features/sign-recognition/liveRecognition';
import type { RecognitionConfirmation } from '../features/sign-recognition/recognitionResult';

const PracticePreview = memo(PracticeCamera);

export function RecognitionPractice({ initialSign = '', onConfirmed }: {
  initialSign?: string;
  onConfirmed?: (event: RecognitionConfirmation) => void;
}) {
  const initial = resolvePracticeSign(initialSign);
  const recognition = useRecognition(loadEducationModel, {
    initialMode: initial ? { type: 'directed', targetId: initial.id } : { type: 'free' }, onConfirmed,
  });
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(() => !!initialSign && !initial);
  const selectRef = useRef<HTMLSelectElement>(null);
  const id = useId();
  const { mode, result, modelState, cameraActive } = recognition;
  const targetId = mode.type === 'directed' ? mode.targetId : '';
  const confirmed = result.confirmation && recognitionSignsById.get(result.confirmation.signId);
  const reference = targetId ? recognitionSignsById.get(targetId) : confirmed;

  function selectTarget(signId: string) {
    setShowUnavailable(false);
    recognition.changeMode(signId ? { type: 'directed', targetId: signId } : { type: 'free' });
  }

  return <section aria-label="Práctica con reconocimiento">
    <div className="practice-panel practice-selection">
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
    </div>
    {showUnavailable && <p className="practice-feedback" role="status">La seña del enlace está fuera del catálogo de reconocimiento. Elige una de las diez disponibles.</p>}
    {modelState.status === 'loading' && <p className="practice-feedback" role="status">Cargando el reconocimiento…</p>}
    {modelState.status === 'error' && <div className="practice-recognition-error">
      <p className="practice-feedback" role="alert">{modelState.message}</p>
      <button type="button" className="button button-outline" onClick={recognition.reloadModel}>Reintentar carga</button>
    </div>}
    <div className="practice-workspace">
      <div className="practice-recognition-column">
        <PracticePreview {...recognition.cameraBindings} disabled={modelState.status !== 'ready' && !cameraActive}
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
          <button type="button" className="button button-outline" onClick={recognition.reset} disabled={!cameraActive || modelState.status !== 'ready'}>
            <RotateCcw size={17} aria-hidden="true" /> Reintentar práctica
          </button>
        </section>
        <section className="practice-panel practice-recognition-result">
          <h2>{reference ? `Cómo hacer «${reference.name}»` : 'Cómo practicar'}</h2>
          {reference ? <>
            <p>{reference.instructions}</p>
            {reference.sourceReference && <a className="practice-reference-link" href={`${mineduGuidePdf}#page=${reference.sourceReference.page}`}
              target="_blank" rel="noopener noreferrer"><BookOpen size={18} aria-hidden="true" /> Ver la guía ilustrada del MINEDU, pág. {reference.sourceReference.page} (nueva pestaña)</a>}
          </> : <p>Mantén las posturas estáticas hasta la confirmación. Para las señas dinámicas, realiza el movimiento completo.</p>}
        </section>
      </div>
    </div>
    <details className="practice-panel practice-catalog">
      <summary>Consultar las diez señas compatibles</summary>
      <ul>{recognitionSigns.map(sign => <li key={sign.id}>
        <button type="button" className="button button-outline" aria-pressed={targetId === sign.id} onClick={() => {
          selectTarget(sign.id);
          selectRef.current?.focus();
        }}>{sign.name}</button>
      </li>)}</ul>
    </details>
  </section>;
}
