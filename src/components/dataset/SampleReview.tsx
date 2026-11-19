import { useState } from 'react';
import { CheckCircle2, RotateCcw, Save, Trash2 } from 'lucide-react';
import type { DatasetSample, SampleSummary } from '../../features/sign-recognition/dataset/datasetTypes';
import { sampleCanBeSaved, sampleReviewWarnings } from '../../features/sign-recognition/dataset/datasetValidation';
import { HAND_CONNECTIONS } from '../../features/sign-recognition/drawHandLandmarks';

export function SampleFrames({ sample }: { sample: DatasetSample }) {
  const [index, setIndex] = useState(0);
  const frame = sample.frames[Math.min(index, sample.frames.length - 1)];
  if (!frame) return null;
  const { cameraWidth: width, cameraHeight: height } = sample.captureMetadata.configuration;
  return <div className="dataset-frame-viewer"><div><strong>Inspección de fotogramas</strong><span>{index + 1} / {sample.frames.length} · {frame.timestampMs.toFixed(1)} ms</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Observación ${index + 1}: ${frame.handCount} manos, ${frame.timestampMs.toFixed(1)} milisegundos`}><g transform={`translate(${width} 0) scale(-1 1)`}>{frame.hands.map((hand, handIndex) => <g key={handIndex} stroke={handIndex === 0 ? '#7543d6' : '#008971'}>{HAND_CONNECTIONS.map(([start, end]) => <line key={`${start}-${end}`} x1={hand.landmarks[start].x * width} y1={hand.landmarks[start].y * height} x2={hand.landmarks[end].x * width} y2={hand.landmarks[end].y * height} strokeWidth={width / 250} />)}{hand.landmarks.map((point, pointIndex) => <circle key={pointIndex} cx={point.x * width} cy={point.y * height} r={width / 140} fill="white" strokeWidth={width / 400} />)}</g>)}</g></svg>
    <label className="dataset-field">Elegir una observación real<input type="range" min={0} max={sample.frames.length - 1} step={1} value={index} onChange={event => setIndex(Number(event.target.value))} /></label><p className="dataset-muted">Solo puntos guardados, sin interpolación. Vista reflejada; los datos originales no están reflejados.</p></div>;
}

export function SampleQuality({ sample }: { sample: SampleSummary }) {
  const quality = sample.qualityMetrics;
  const warnings = sampleReviewWarnings(sample);
  const values = [['Observaciones', quality.frameCount], ['Ventana de grabación', `${(sample.durationMs / 1000).toFixed(2)} s`],
    ['Datos observados', `${(quality.observedDurationMs / 1000).toFixed(2)} s`], ['Manos detectadas', `${quality.minimumHands}–${quality.maximumHands}`],
    [sample.captureMetadata.labelSnapshot.expectedHands === 0 ? 'Requisito de manos' : 'Con las manos esperadas', sample.captureMetadata.labelSnapshot.expectedHands === 0 ? 'Sin requisito' : `${(quality.expectedHandsRatio * 100).toFixed(1)}%`], ['Frecuencia real', `${quality.averageFps.toFixed(1)} obs/s`], ['Pérdidas de seguimiento', quality.trackingLosses], ['Incidencias', sample.incidents.length]];
  return <><dl className="dataset-quality-grid">{values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {warnings.length > 0 && <ul className="dataset-quality-warnings">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
    <p className="dataset-muted">La calidad describe la captura de puntos. No demuestra que la seña ejecutada sea lingüísticamente correcta.</p></>;
}

export function SampleReview({ sample, disabled, onSave, onDiscard, onRepeat }: { sample: DatasetSample; disabled: boolean;
  onSave: () => void; onDiscard: () => void; onRepeat: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  return <section className="dataset-draft" aria-labelledby="dataset-draft-title"><div className="dataset-section-title"><div><span className="dataset-eyebrow">CAPTURA COMPLETADA</span><h3 id="dataset-draft-title">Revisa antes de guardar</h3></div><CheckCircle2 size={23} aria-hidden="true" /></div>
    <p><strong>{sample.participantId}</strong> · {sample.captureMetadata.labelSnapshot.name} · repetición {sample.repetition}</p>
    <SampleQuality sample={sample} />
    <SampleFrames sample={sample} />
    {!sample.qualityMetrics.sufficient && sampleCanBeSaved(sample) && <label className="dataset-check"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} disabled={disabled} /> Conservar esta captura de calidad insuficiente como pendiente de revisión.</label>}
    {!sampleCanBeSaved(sample) && <p className="dataset-error">La muestra no contiene suficientes datos de manos para guardarse. Repítela.</p>}
    <div className="dataset-actions"><button type="button" className="button button-primary" disabled={disabled || !sampleCanBeSaved(sample) || (!sample.qualityMetrics.sufficient && !acknowledged)} onClick={onSave}><Save size={17} /> Guardar como pendiente</button><button type="button" className="button button-outline" disabled={disabled} onClick={onRepeat}><RotateCcw size={17} /> Repetir</button><button type="button" className="dataset-text-danger" disabled={disabled} onClick={onDiscard}><Trash2 size={16} /> Descartar</button></div>
  </section>;
}
