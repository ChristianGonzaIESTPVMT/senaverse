import { useState } from 'react';
import { HAND_DETECTION_PROFILES, type HandDetectionProfile } from './config';
import type { HandDiagnosticSnapshot } from './types';
import { createHandDiagnosticReport } from './performanceMetrics';

const number = (value: number | null | undefined, unit = '') => value === null || value === undefined ? '—' : `${value.toFixed(1)}${unit}`;
const scenarios = [
  { id: 'static-one', name: 'Una mano quieta · 10 s', hands: 1 },
  { id: 'slow-one', name: 'Una mano · movimientos lentos', hands: 1 },
  { id: 'orientation-one', name: 'Una mano · cambios de orientación', hands: 1 },
  { id: 'lateral-one', name: 'Una mano · desplazamiento lateral', hands: 1 },
  { id: 'fingers-one', name: 'Una mano · abrir/cerrar dedos', hands: 1 },
  { id: 'static-two', name: 'Dos manos quietas', hands: 2 },
  { id: 'moving-two', name: 'Dos manos · movimiento simultáneo', hands: 2 },
  { id: 'empty-control', name: 'Control · ninguna mano visible', hands: 0 },
];

export default function HandDiagnostics({ snapshot, profile, onProfile, onReset, onDisable }: {
  snapshot: HandDiagnosticSnapshot | null;
  profile: HandDetectionProfile;
  onProfile: (profile: HandDetectionProfile) => void;
  onReset: () => void;
  onDisable: () => void;
}) {
  const [scenario, setScenario] = useState('');
  const [falsePositives, setFalsePositives] = useState('');
  function downloadReport() {
    if (!snapshot) return;
    const report = createHandDiagnosticReport(snapshot, {
      scenario: scenario || null, expectedHands: scenarios.find(item => item.id === scenario)?.hands ?? null,
      observedFalsePositives: falsePositives === '' ? null : Number(falsePositives),
    });
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `senaverse-seguimiento-${snapshot.profile}-${scenario || 'diagnostico'}.json`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const rows = [
    ['FPS reales de cámara', number(snapshot?.cameraFps)],
    ['FPS de inferencia', number(snapshot?.inferenceFps)],
    ['FPS de resultados aceptados', number(snapshot?.acceptedFps)],
    ['Latencia media / máxima', `${number(snapshot?.averageLatencyMs)} / ${number(snapshot?.maximumLatencyMs, ' ms')}`],
    ['Tiempo de inferencia medio', number(snapshot?.averageInferenceMs, ' ms')],
    ['Última recuperación', number(snapshot?.recoveryMs, ' ms')],
    ['Pérdidas observadas', snapshot?.detectionLosses ?? '—'],
    ['Recuperaciones observadas', snapshot?.detectionRecoveries ?? '—'],
    ['Último evento', snapshot ? ({ none: 'Sin eventos', detection: 'Detección', loss: 'Pérdida de detección', recovery: 'Recuperación' }[snapshot.lastTrackingEvent]) : '—'],
    ['Delegado / ejecución', `${snapshot?.delegate ?? '—'} / ${snapshot?.backend ?? '—'}`],
    ['Resolución de procesamiento', snapshot?.processingWidth ? `${snapshot.processingWidth} × ${snapshot.processingHeight}` : '—'],
    ['Cámara negociada', snapshot?.cameraWidth ? `${snapshot.cameraWidth} × ${snapshot.cameraHeight} · ${number(snapshot.configuredCameraFps, ' FPS')}` : '—'],
    ['Manos detectadas', snapshot?.handCount ?? '—'],
    ['Manos del último resultado del modelo', snapshot?.rawHandCount ?? '—'],
    ['Respuestas / aceptadas', snapshot ? `${snapshot.inferenceCount} / ${snapshot.acceptedFrames}` : '—'],
    ['Fotogramas sin detección · modelo / aceptados', snapshot ? `${snapshot.emptyModelFrames} / ${snapshot.emptyAcceptedFrames}` : '—'],
    ['Estado del seguimiento', snapshot?.trackingStatus ?? '—'],
    ['Dibujo actual', snapshot ? ({ none: 'Sin puntos', live: 'Detección real', held: 'Continuidad temporal · puntos anteriores atenuados' }[snapshot.visualState]) : '—'],
    ['Motivo de discontinuidad', snapshot ? (snapshot.lossReason ? { 'model-empty': 'El modelo devolvió cero manos', 'result-gap': 'Faltan resultados frescos', partial: 'Pérdida parcial de manos' }[snapshot.lossReason] : 'Sin discontinuidad') : '—'],
    ['Edad del último fotograma aceptado', number(snapshot?.lastAcceptedAgeMs, ' ms')],
    ['Fotogramas descartados', snapshot?.droppedFrames ?? '—'],
    ['Resultados antiguos descartados', snapshot?.staleResults ?? '—'],
    ['Descartes · edad / orden / pausa', snapshot ? `${snapshot.staleByAge} / ${snapshot.staleByOrder} / ${snapshot.pausedResults}` : '—'],
    ['Capturas caducadas antes de inferir', snapshot?.expiredCaptures ?? '—'],
    ['Cámara · saltados / sustituidos / limitados', snapshot ? `${snapshot.skippedCameraFrames} / ${snapshot.supersededFrames} / ${snapshot.throttledFrames}` : '—'],
    ['Respuestas con ID/timestamp incorrecto', snapshot?.mismatchedResponses ?? '—'],
    ['Caducidades visuales / retenciones', snapshot ? `${snapshot.freshnessExpirations} / ${snapshot.visualHolds}` : '—'],
    ['Redibujados de Canvas', snapshot?.canvasDraws ?? '—'],
    ['Fallos de sesión', snapshot?.failures ?? '—'],
    ['Tiempo de medición', number(snapshot?.elapsedSeconds, ' s')],
  ];
  return <details className="hand-diagnostics" open>
    <summary>Diagnóstico de manos · desarrollo</summary>
    <label>Ensayo de umbral<select value={profile} onChange={event => onProfile(event.currentTarget.value as HandDetectionProfile)}>
      {Object.entries(HAND_DETECTION_PROFILES).map(([id, option]) => <option key={id} value={id}>{option.label}</option>)}
    </select></label>
    <p>Cada perfil cambia un único umbral. No se ha validado físicamente que los valores menores mejoren el seguimiento.</p>
    <label>Escenario del ensayo<select value={scenario} onChange={event => { setScenario(event.currentTarget.value); setFalsePositives(''); }}>
      <option value="">Diagnóstico sin escenario asignado</option>{scenarios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {snapshot?.lastError && <p role="alert"><strong>Fallo en {snapshot.lastError.phase}:</strong> {snapshot.lastError.detail}</p>}
    <p>Scores de lateralidad: {snapshot?.handednessScores.length ? snapshot.handednessScores.map((item, index) => `${index + 1}: ${item.label} ${(item.score * 100).toFixed(1)}%`).join(' · ') : '—'}. Son scores de clasificación izquierda/derecha, no confianza de detección o presencia; el SDK no expone esas confidencias ni el IoU por fotograma.</p>
    <p>FPS de respuestas incluyen resultados después descartados; FPS aceptados solo incluyen observaciones frescas. Ventana: 2 s. Latencia: solicitud del bitmap → resultado recibido, sin medir exposición del sensor. Recuperación: regreso al número anterior de manos. Fuente de cámara: {snapshot?.cameraFpsSource ?? '—'}.</p>
    <label>Falsos positivos observados por el operador<input type="number" min="0" step="1" value={falsePositives} placeholder="Sin evaluar" onChange={event => { const value = event.currentTarget.value; if (value === '' || (/^\d+$/.test(value) && Number.isSafeInteger(Number(value)))) setFalsePositives(value); }} /></label>
    <p>El reporte contiene contadores y configuración; no guarda video, imágenes ni landmarks. Cambiar de escenario requiere reiniciar la medición. Un campo vacío significa sin evaluar.</p>
    <div className="hand-diagnostics-actions"><button type="button" className="button button-outline" disabled={!snapshot} onClick={downloadReport}>Descargar diagnóstico JSON</button><button type="button" className="button button-outline" onClick={() => { setFalsePositives(''); onReset(); }}>Reiniciar medición</button><button type="button" className="button button-outline" onClick={onDisable}>Desactivar diagnóstico</button></div>
  </details>;
}
