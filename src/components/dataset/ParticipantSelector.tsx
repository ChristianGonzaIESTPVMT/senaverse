import { useState } from 'react';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { DatasetSnapshot } from '../../features/sign-recognition/dataset/datasetTypes';

export function ParticipantSelector({ snapshot, selectedId, sessionConsent, disabled, onSelect, onCreate, onConsent, onDelete }: {
  snapshot: DatasetSnapshot; selectedId: string; sessionConsent: boolean; disabled: boolean;
  onSelect: (id: string) => void; onCreate: () => void; onConsent: () => void; onDelete: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const participant = snapshot.participants.find(person => person.id === selectedId);
  const samples = snapshot.samples.filter(sample => sample.participantId === selectedId);
  return <section className="dataset-panel" aria-labelledby="dataset-participants-title">
    <div className="dataset-section-title"><div><span className="dataset-eyebrow">01 / PERSONAS</span><h2 id="dataset-participants-title">Participantes</h2></div><button type="button" className="dataset-icon-button" disabled={disabled} aria-label="Crear participante anónimo" onClick={onCreate}><Plus size={20} /></button></div>
    <label className="dataset-field">Identificador anónimo<select value={selectedId} disabled={disabled} onChange={event => onSelect(event.target.value)}><option value="">Selecciona un participante</option>{snapshot.participants.map(person => <option key={person.id} value={person.id}>{person.id} · {snapshot.samples.filter(sample => sample.participantId === person.id).length} muestras</option>)}</select></label>
    {participant ? <>
      <div className="dataset-participant-summary"><strong>{participant.id}</strong><span>{samples.length} muestras</span><button type="button" className="dataset-text-danger" disabled={disabled} onClick={onDelete} aria-label={`Eliminar ${participant.id} y sus muestras`}><Trash2 size={16} /> Eliminar</button></div>
      <div className={`dataset-consent${sessionConsent ? ' is-confirmed' : ''}`}>
        {sessionConsent ? <p><ShieldCheck size={19} aria-hidden="true" /> Consentimiento confirmado para esta sesión.</p> : <>
          <p>La persona acepta guardar localmente los puntos de sus manos y sus movimientos para preparar datos de entrenamiento. No se guardan videos, imágenes, audio ni datos de identidad. Puede solicitar eliminar sus registros.</p>
          <label className="dataset-check"><input type="checkbox" checked={checked} disabled={disabled} onChange={event => setChecked(event.target.checked)} /> Confirmo que esta persona dio su consentimiento.</label>
          <button type="button" className="button button-outline" disabled={disabled || !checked} onClick={() => { setChecked(false); onConsent(); }}>Registrar consentimiento</button>
        </>}
      </div>
      <details className="dataset-progress-detail"><summary>Progreso de {participant.id} por seña</summary><ul>{snapshot.signs.map(sign => <li key={sign.id}><span>{sign.name || `Espacio ${sign.id.slice(-2)}`}</span><strong>{samples.filter(sample => sample.labelId === sign.id).length}</strong></li>)}</ul></details>
    </> : <p className="dataset-muted">Crea un participante para empezar. Los identificadores se asignan como P001, P002…</p>}
  </section>;
}
