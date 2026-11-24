import { memo, useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { PracticeCamera, type PracticeCameraSessionState } from './PracticeCamera';
import { recognitionSigns, recognitionSignsById, resolvePracticeSign } from '../features/sign-recognition/recognitionCatalog';
import { getEducationalSignForClass } from '../data/library';
import { loadEducationModel } from '../features/sign-recognition/educationModel';
import { useRecognition } from '../features/sign-recognition/useRecognition';
import { RECOGNITION_STATES } from '../features/sign-recognition/liveRecognition';
import type { RecognitionConfirmation, RecognitionObservation } from '../features/sign-recognition/recognitionResult';
import { SignMediaViewer } from './SignMediaViewer';
import { createGestureGate } from '../data/gameGestures';
import type { FreshHandInference } from '../features/sign-recognition/types';

const PracticePreview = memo(PracticeCamera);

export function GameRecognitionPractice({ step, accepting, onReady, onGesture }: {
  step: number; accepting: boolean; onReady: (ready: boolean) => void; onGesture: (id: string, step: number) => void;
}) {
  const gate = useRef(createGestureGate());
  const current = useRef({ step: -1, accepting: false, decided: false });
  const [release, setRelease] = useState(false);
  const [observed, setObserved] = useState<{ step: number; id: string }>();
  const [detectorReady, setDetectorReady] = useState(false);
  const recognition = useRecognition(loadEducationModel, {
    onConfirmed(event) {
      const objective = current.current;
      if (!objective.accepting || objective.decided) return;
      objective.decided = true;
      gate.current.open(performance.now(), true);
      setObserved({ step: objective.step, id: event.signId });
      onGesture(event.signId, objective.step);
    },
  });
  const ready = recognition.cameraActive && recognition.modelState.status === 'ready' && detectorReady;
  const { reset } = recognition;
  useLayoutEffect(() => {
    const enabled = accepting && ready;
    if (current.current.step === step && current.current.accepting === enabled) return;
    current.current = { step, accepting: enabled, decided: false };
    gate.current.open(enabled ? performance.now() : Infinity, step > 0);
    reset();
  }, [accepting, ready, reset, step]);

  useLayoutEffect(() => { onReady(ready); }, [onReady, ready]);

  const { onSessionState, onFreshInference } = recognition.cameraBindings;
  const sessionState = useCallback((state: PracticeCameraSessionState) => {
    onSessionState(state);
    setDetectorReady(state.cameraStatus === 'active' && state.detector.status !== 'loading'
      && state.detector.status !== 'error' && state.detector.status !== 'idle');
  }, [onSessionState]);
  const inference = useCallback((event: FreshHandInference) => {
    if (!current.current.accepting || document.hidden) return;
    const hadHands = event.result.landmarks.length > 0;
    const allow = gate.current.accept(event.capturedAtMs, hadHands);
    if (!allow) { setRelease(gate.current.needsRelease()); return; }
    if (current.current.decided) {
      current.current.decided = false;
      gate.current.open(performance.now(), false);
      reset();
      setRelease(false);
      return;
    }
    setRelease(gate.current.needsRelease());
    onFreshInference(event);
  }, [onFreshInference, reset]);

  return <div className="game-camera">
    <PracticePreview onSessionState={sessionState} onFreshInference={inference}
      disabled={recognition.modelState.status !== 'ready' && !recognition.cameraActive}
      disabledReason="La cámara se habilita cuando carga el modelo." />
    <p className="game-camera-status" role="status">{!accepting ? 'Prepara la mano y espera el inicio.'
      : release ? 'Retira la mano del encuadre y vuelve a realizar la seña.'
        : RECOGNITION_STATES[recognition.result.status]}</p>
    {accepting && observed?.step === step && <p role="status">El modelo observó «{recognitionSignsById.get(observed.id)?.name ?? 'seña sin nombre'}». Si la posición no avanzó, vuelve a intentarlo.</p>}
    {recognition.modelState.status === 'error' && <p role="alert">{recognition.modelState.message}{' '}
      <button type="button" className="button button-outline" onClick={recognition.reloadModel}>Reintentar carga</button></p>}
    <p className="game-source">Reconocimiento experimental de V1. Una coincidencia indica lo que identificó el modelo.</p>
  </div>;
}

export function RecognitionPractice({ initialSign = '', onConfirmed, guided, onSave, assessment }: {
  initialSign?: string;
  onConfirmed?: (event: RecognitionConfirmation) => void;
  onSave?: (signId: string) => void;
  guided?: { targetId: string; instruction: string; onAccept: (signId: string) => void; acceptLabel?: string };
  assessment?: { targetId: string; onObserve: (observation: RecognitionObservation) => void };
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
  const assessmentTarget = assessment && recognitionSignsById.get(assessment.targetId);
  const observation: RecognitionObservation | undefined = result.confirmation
    ? { status: 'recognized', signId: result.confirmation.signId }
    : result.status === 'unknown' ? { status: 'unknown' }
      : result.status === 'tracking' || result.status === 'searching' ? { status: 'tracking' } : undefined;
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
    {!guided && !assessment && <div className="practice-panel practice-selection">
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
          {assessment ? <button type="button" className="button button-primary" disabled={!cameraActive || modelState.status !== 'ready' || !observation}
            onClick={() => { if (observation) assessment.onObserve(observation); }}>Comprobar intento con cámara</button>
            : <button type="button" className="button button-outline" onClick={() => {
            setConfirmedMatch(null);
            clearSavedPractice();
            recognition.reset();
          }} disabled={!cameraActive || modelState.status !== 'ready'}>
            <RotateCcw size={17} aria-hidden="true" /> Reintentar práctica
          </button>}
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
        {assessment ? <section className="practice-panel practice-recognition-result">
          <h2>Realiza «{assessmentTarget?.name}»</h2>
          <p>Coloca la mano completa dentro del encuadre, con luz de frente. Mantén la postura hasta que termine el análisis.</p>
          <p>El modelo experimental puede reconocer cualquiera de sus diez señas.</p>
        </section> : <section className="practice-panel practice-recognition-result">
          <h2>{entry ? `Referencia educativa de «${entry.word}»` : 'Cómo practicar'}</h2>
          {entry ? <SignMediaViewer key={entry.id} sign={entry} instruction={guided?.instruction ?? entry.instructions} compact />
            : <p>Mantén las posturas estáticas hasta la confirmación. Para las señas dinámicas, realiza el movimiento completo.</p>}
        </section>}
      </div>
    </div>
    {!guided && !assessment && <details className="practice-panel practice-catalog">
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
