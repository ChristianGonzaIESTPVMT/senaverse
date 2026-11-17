import { HAND_DETECTION_PROFILES, type HandDetectionProfile } from './config';
import type { HandDiagnosticSnapshot } from './types';

const number = (value: number | null | undefined, unit = '') => value === null || value === undefined ? '—' : `${value.toFixed(1)}${unit}`;

export default function HandDiagnostics({ snapshot, profile, onProfile, onReset, onDisable }: {
  snapshot: HandDiagnosticSnapshot | null;
  profile: HandDetectionProfile;
  onProfile: (profile: HandDetectionProfile) => void;
  onReset: () => void;
  onDisable: () => void;
}) {
  const rows = [
    ['FPS reales de cámara', number(snapshot?.cameraFps)],
    ['FPS de inferencia', number(snapshot?.inferenceFps)],
    ['Latencia media / máxima', `${number(snapshot?.averageLatencyMs)} / ${number(snapshot?.maximumLatencyMs, ' ms')}`],
    ['Tiempo de inferencia medio', number(snapshot?.averageInferenceMs, ' ms')],
    ['Última recuperación', number(snapshot?.recoveryMs, ' ms')],
    ['Pérdidas observadas', snapshot?.detectionLosses ?? '—'],
    ['Delegado / ejecución', `${snapshot?.delegate ?? '—'} / ${snapshot?.backend ?? '—'}`],
    ['Resolución de procesamiento', snapshot?.processingWidth ? `${snapshot.processingWidth} × ${snapshot.processingHeight}` : '—'],
    ['Cámara negociada', snapshot?.cameraWidth ? `${snapshot.cameraWidth} × ${snapshot.cameraHeight} · ${number(snapshot.configuredCameraFps, ' FPS')}` : '—'],
    ['Manos detectadas', snapshot?.handCount ?? '—'],
    ['Fotogramas descartados', snapshot?.droppedFrames ?? '—'],
    ['Resultados antiguos descartados', snapshot?.staleResults ?? '—'],
    ['Tiempo de medición', number(snapshot?.elapsedSeconds, ' s')],
  ];
  return <details className="hand-diagnostics" open>
    <summary>Diagnóstico de manos · desarrollo</summary>
    <label>Ensayo de umbral<select value={profile} onChange={event => onProfile(event.currentTarget.value as HandDetectionProfile)}>
      {Object.entries(HAND_DETECTION_PROFILES).map(([id, option]) => <option key={id} value={id}>{option.label}</option>)}
    </select></label>
    <p>Cada perfil cambia un único umbral. No se ha validado físicamente que los valores menores mejoren el seguimiento.</p>
    <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>FPS medidos en una ventana de 2 s. Latencia: captura → resultado recibido. Recuperación: regreso al número de manos anterior a una pérdida. Fuente de cámara: {snapshot?.cameraFpsSource ?? '—'}.</p>
    <div className="hand-diagnostics-actions"><button type="button" className="button button-outline" onClick={onReset}>Reiniciar medición</button><button type="button" className="button button-outline" onClick={onDisable}>Desactivar diagnóstico</button></div>
  </details>;
}
