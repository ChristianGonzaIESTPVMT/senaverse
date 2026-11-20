import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { PracticeCamera, type PracticeCameraSessionState } from '../components/PracticeCamera';
import { ThemeToggle } from '../components/ThemeToggle';
import { LAB_SIGNS, LAB_SIGNS_BY_ID, loadLabModel, type LabModel } from '../features/sign-recognition/labModel';
import { createRecognitionSession, directedOutcome, initialRecognition, recognitionDefaults, RECOGNITION_STATES,
  type RecognitionSettings, type RecognitionSnapshot } from '../features/sign-recognition/liveRecognition';
import type { FreshHandInference, HandDiagnosticSnapshot } from '../features/sign-recognition/types';
import './RecognitionLabPage.css';

type ModelState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; model: LabModel };
const LabCamera = memo(PracticeCamera);
const reasonText = {
  'low-score': 'La puntuación líder quedó por debajo del umbral.',
  'low-margin': 'Las dos mejores señas quedaron demasiado cerca.',
  'hand-count': 'La cantidad de manos visibles no coincide con la seña candidata.',
  coverage: 'La ventana contiene demasiadas observaciones sin seguimiento.',
  stale: 'Se interrumpió el flujo de resultados recientes.',
} as const;

const controls: { key: keyof RecognitionSettings; label: string; min: number; max: number; step: number; unit?: string }[] = [
  { key: 'frequencyHz', label: 'Frecuencia de análisis', min: 4, max: 15, step: 1, unit: ' Hz' },
  { key: 'score', label: 'Puntuación mínima', min: .10, max: 1, step: .01 },
  { key: 'margin', label: 'Margen mínimo', min: 0, max: 1, step: .01 },
  { key: 'handRatio', label: 'Proporción de pasos con las manos esperadas', min: .60, max: 1, step: .01 },
  { key: 'confirmMs', label: 'Confirmación', min: 80, max: 800, step: 20, unit: ' ms' },
  { key: 'switchMs', label: 'Confirmación de cambio', min: 80, max: 1000, step: 20, unit: ' ms' },
  { key: 'releaseMs', label: 'Retención ante una predicción dudosa', min: 0, max: 500, step: 20, unit: ' ms' },
];

const decimal = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });
function metric(value: number | null | undefined, unit = '') {
  return value == null ? '—' : decimal.format(value) + unit;
}

export default function RecognitionLabPage() {
  const session = useRef<ReturnType<typeof createRecognitionSession> | null>(null);
  const active = useRef(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelState, setModelState] = useState<ModelState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<RecognitionSnapshot>(() => initialRecognition());
  const [settings, setSettings] = useState<RecognitionSettings | null>(null);
  const [diagnostics, setDiagnostics] = useState<HandDiagnosticSnapshot | null>(null);
  const [mode, setMode] = useState<'free' | 'directed'>('free');
  const [target, setTarget] = useState(LAB_SIGNS[0].id);

  useEffect(() => {
    const abort = new AbortController();
    void loadLabModel(import.meta.env.BASE_URL, abort.signal).then(model => {
      if (abort.signal.aborted) return;
      session.current = createRecognitionSession(model);
      setSettings(recognitionDefaults(model));
      setModelState({ status: 'ready', model });
    }).catch(error => {
      if (abort.signal.aborted) return;
      setModelState({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo cargar el modelo V1.' });
    });
    return () => {
      abort.abort();
      session.current?.stop();
      session.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    if (!cameraActive) return;
    const check = window.setInterval(() => {
      const next = session.current?.expire();
      if (next) setSnapshot(next);
    }, 50);
    const onVisibility = () => {
      if (document.hidden && session.current) setSnapshot(session.current.interrupt());
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(check);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [cameraActive]);

  const onSessionState = useCallback(({ cameraStatus, detector }: PracticeCameraSessionState) => {
    const isActive = cameraStatus === 'active';
    if (active.current !== isActive) {
      active.current = isActive;
      setCameraActive(isActive);
      if (session.current) setSnapshot(isActive ? session.current.start() : session.current.stop());
    }
    if (isActive && (detector.status === 'loading' || detector.status === 'error') && session.current) {
      setDiagnostics(null);
      setSnapshot(detector.status === 'error' ? session.current.interrupt() : session.current.reset());
    }
  }, []);

  const onFreshInference = useCallback((event: FreshHandInference) => {
    if (document.hidden) return;
    const next = session.current?.observe(event);
    if (next) setSnapshot(next);
  }, []);

  function configure(next: RecognitionSettings) {
    setSettings(next);
    if (session.current) setSnapshot(session.current.configure(next));
  }

  const model = modelState.status === 'ready' ? modelState.model : null;
  const stable = snapshot.stableId && LAB_SIGNS_BY_ID.get(snapshot.stableId);
  const outcome = directedOutcome(snapshot, target);
  const windowMs = model?.preprocessing.windowMs ?? 1350;

  return <div className="recognition-lab">
    <header className="recognition-topbar">
      <Brand />
      <div><ThemeToggle /><Link to="/" className="recognition-back"><ArrowLeft size={17} aria-hidden="true" /> Volver al inicio</Link></div>
    </header>
    <main className="recognition-content">
      <header className="recognition-intro">
        <div><h1>Laboratorio de reconocimiento</h1><p>Mantén las posturas estáticas hasta la confirmación. En las señas dinámicas, realiza el movimiento completo.</p></div>
        <span className="recognition-version">Modelo experimental V1</span>
      </header>
      {modelState.status === 'loading' && <p className="recognition-message" role="status">Cargando el modelo V1…</p>}
      {modelState.status === 'error' && <div className="recognition-message recognition-error">
        <p role="alert">{modelState.message}</p>
        <button type="button" className="button button-outline" onClick={() => { setModelState({ status: 'loading' }); setAttempt(value => value + 1); }}>
          Reintentar carga
        </button>
      </div>}
      <div className="recognition-grid">
        <LabCamera disabled={!model} disabledReason="La cámara estará disponible cuando cargue el modelo V1."
          onFreshInference={onFreshInference} onSessionState={onSessionState} onDiagnostics={setDiagnostics} />
        <section className="practice-panel recognition-result" aria-labelledby="recognition-result-title">
          <h2 id="recognition-result-title">Reconocimiento</h2>
          <fieldset className="recognition-mode">
            <legend>Modo</legend>
            <div>
              <label><input type="radio" name="lab-mode" checked={mode === 'free'} onChange={() => setMode('free')} /> Libre</label>
              <label><input type="radio" name="lab-mode" checked={mode === 'directed'} onChange={() => setMode('directed')} /> Dirigido</label>
            </div>
          </fieldset>
          {mode === 'directed' && <div className="recognition-target">
            <label htmlFor="recognition-target">Seña objetivo</label>
            <select id="recognition-target" value={target} onChange={event => setTarget(event.target.value)}>
              {LAB_SIGNS.map(sign => <option key={sign.id} value={sign.id}>{sign.name} · {sign.id}</option>)}
            </select>
            <p role="status">{outcome === 'matched' ? 'Coincide con la seña objetivo.' : outcome === 'different'
              ? 'La seña reconocida es distinta del objetivo.' : outcome === 'unknown' ? 'Sin coincidencia confirmada.' : 'Esperando una seña confirmada.'}</p>
          </div>}
          <div className="recognition-state" data-state={snapshot.status} role="status">
            {RECOGNITION_STATES[snapshot.status]}
          </div>
          {snapshot.reason && <p className="recognition-reason">{reasonText[snapshot.reason]}</p>}
          <dl className="recognition-predictions">
            <div><dt>Predicción instantánea</dt><dd>{snapshot.top[0]?.name ?? '—'}</dd></div>
            <div><dt>Predicción estabilizada</dt><dd>{stable ? stable.name : '—'}</dd></div>
          </dl>
          <div className="recognition-buffer">
            <label htmlFor="recognition-window">Ventana temporal</label>
            <span>{snapshot.hands} {snapshot.hands === 1 ? 'mano' : 'manos'} · {snapshot.window.frames} observaciones</span>
            <progress id="recognition-window" value={snapshot.window.spanMs} max={windowMs} />
          </div>
          <h3>Tres mejores puntuaciones</h3>
          {snapshot.top.length ? <ol className="recognition-scores">{snapshot.top.map(({ id, name, score }) =>
            <li key={id}><span>{name}</span><meter min={0} max={1} value={score} aria-label={'Puntuación de ' + name} /><strong>{metric(score)}</strong></li>)}</ol>
            : <p className="recognition-empty">Aparecen al analizar una ventana completa.</p>}
          <button className="button button-outline recognition-reset" type="button" disabled={!cameraActive}
            onClick={() => { if (session.current) setSnapshot(session.current.reset()); }}>
            <RotateCcw size={17} aria-hidden="true" /> Reiniciar reconocimiento
          </button>
        </section>
      </div>
      <details className="practice-panel recognition-diagnostics">
        <summary>Diagnóstico <ChevronDown size={20} aria-hidden="true" /></summary>
        <dl className="recognition-metrics">
          <div><dt>FPS de MediaPipe</dt><dd>{metric(diagnostics?.inferenceFps)}</dd></div>
          <div><dt>Resultados frescos por segundo</dt><dd>{metric(diagnostics?.acceptedFps)}</dd></div>
          <div><dt>Ventana + clasificación</dt><dd>{metric(snapshot.classifierMs, ' ms')}</dd></div>
          <div><dt>Captura → decisión</dt><dd>{metric(snapshot.captureToDecisionMs, ' ms')}</dd></div>
          <div><dt>Contexto en el buffer</dt><dd>{metric(Math.round(snapshot.window.spanMs), ' ms')} / {windowMs} ms</dd></div>
          <div><dt>Margen instantáneo</dt><dd>{metric(snapshot.margin)}</dd></div>
          <div><dt>Pasos con las manos esperadas</dt><dd>{metric(snapshot.handRatio)}</dd></div>
          <div><dt>Versión del modelo</dt><dd><code>{model?.modelVersion ?? '—'}</code></dd></div>
        </dl>
        {settings && model && <fieldset className="recognition-settings">
          <legend>Parámetros experimentales</legend>
          <div>{controls.map(({ key, label, min, max, step, unit }) => <label key={key}>
            <span>{label}</span><output>{metric(settings[key], unit)}</output>
            <input type="range" min={min} max={max} step={step} value={settings[key]}
              onChange={event => configure({ ...settings, [key]: event.target.valueAsNumber })} />
          </label>)}</div>
          <button type="button" className="button button-outline" onClick={() => configure(recognitionDefaults(model))}>Restaurar valores</button>
        </fieldset>}
      </details>
    </main>
  </div>;
}
