import { useState, type FormEvent } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { CAPTURE_DEFAULTS, type DatasetSign } from '../../features/sign-recognition/dataset/datasetTypes';
import { signConfigurationErrors, signDisplayName } from '../../features/sign-recognition/dataset/signCatalog';

export function SignSelector({ signs, selectedId, disabled, onSelect, onEdit }: { signs: DatasetSign[]; selectedId: string; disabled: boolean; onSelect: (id: string) => void; onEdit: () => void }) {
  const sign = signs.find(item => item.id === selectedId);
  return <section className="dataset-panel" aria-labelledby="dataset-signs-title">
    <div className="dataset-section-title"><div><span className="dataset-eyebrow">02 / ETIQUETAS</span><h2 id="dataset-signs-title">Catálogo de señas</h2></div><button type="button" className="dataset-icon-button" disabled={disabled || !sign} onClick={onEdit} aria-label="Editar metadatos de la seña"><Pencil size={19} /></button></div>
    <label className="dataset-field">Espacio del catálogo<select value={selectedId} disabled={disabled} onChange={event => onSelect(event.target.value)}>{signs.map(item => <option key={item.id} value={item.id}>{signDisplayName(item)}</option>)}</select></label>
    {sign && <><div className="dataset-tag-row"><span className="dataset-badge">{sign.type === 'static' ? 'Estática' : 'Dinámica'}</span><span className="dataset-badge">{sign.expectedHands} {sign.expectedHands === 1 ? 'mano' : 'manos'}</span><span className="dataset-badge">{sign.durationMs / 1000} s</span></div><p className="dataset-muted">{sign.description || 'Diez espacios vacíos para configurar el catálogo. Ninguna propuesta está declarada como validada.'}</p><span className={`dataset-validation-label${sign.validationStatus === 'validated' ? ' is-validated' : ''}`}>{sign.validationStatus === 'validated' ? 'Validación lingüística indicada por el operador' : sign.validationStatus === 'pending' ? 'Etiqueta provisional · validación pendiente' : 'Sin configurar'}</span>{signConfigurationErrors(sign).length > 0 && <button className="button button-outline dataset-configure" type="button" disabled={disabled} onClick={onEdit}>Configurar esta etiqueta</button>}</>}
  </section>;
}

export function SignEditor({ sign, saving, onSave, onCancel }: { sign: DatasetSign; saving: boolean; onSave: (sign: DatasetSign) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState({ ...sign });
  const [error, setError] = useState('');
  function change(patch: Partial<DatasetSign>) {
    setDraft(previous => ({ ...previous, ...patch, validationStatus: patch.validationStatus
      ?? (previous.validationStatus === 'validated' || previous.validationStatus === 'unconfigured' ? 'pending' : previous.validationStatus) }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const updated = { ...draft, name: draft.name.trim(), description: draft.description.trim(), instructions: draft.instructions.trim(), referenceUrl: draft.referenceUrl.trim() };
    const errors = signConfigurationErrors(updated);
    if (errors.length) { setError(errors.join(' ')); return; }
    onSave(updated);
  }
  return <form className="dataset-editor" onSubmit={submit}><div className="dataset-section-title"><div><span className="dataset-eyebrow">{sign.id}</span><h2>Configurar etiqueta</h2></div><button className="dataset-icon-button" type="button" onClick={onCancel} disabled={saving} aria-label="Cerrar edición"><X size={21} /></button></div>
    <p className="dataset-muted">Los metadatos se guardan en el dataset. La validación lingüística corresponde a una revisión humana independiente.</p>
    <label className="dataset-field">Nombre<input value={draft.name} maxLength={120} required onChange={event => change({ name: event.target.value })} /></label>
    <label className="dataset-field">Descripción<textarea value={draft.description} maxLength={2000} required onChange={event => change({ description: event.target.value })} /></label>
    <div className="dataset-form-grid"><label className="dataset-field">Tipo<select value={draft.type} onChange={event => { const type = event.target.value as DatasetSign['type']; change({ type, durationMs: type === 'static' ? CAPTURE_DEFAULTS.staticDurationMs : CAPTURE_DEFAULTS.dynamicDurationMs }); }}><option value="static">Estática</option><option value="dynamic">Dinámica</option></select></label><label className="dataset-field">Manos esperadas<select value={draft.expectedHands} onChange={event => change({ expectedHands: Number(event.target.value) as 1 | 2 })}><option value={1}>1 mano</option><option value={2}>2 manos</option></select></label><label className="dataset-field">Duración (segundos)<input type="number" min="0.5" max="10" step="0.1" value={draft.durationMs / 1000} onChange={event => change({ durationMs: Number(event.target.value) * 1000 })} required /></label></div>
    <label className="dataset-field">Instrucciones de ejecución<textarea value={draft.instructions} maxLength={2000} required onChange={event => change({ instructions: event.target.value })} /></label>
    <label className="dataset-field">Referencia audiovisual (opcional)<input value={draft.referenceUrl} maxLength={1000} placeholder="https://… o /videos/…" onChange={event => change({ referenceUrl: event.target.value })} /></label>
    <label className="dataset-field">Estado de validación<select value={draft.validationStatus} onChange={event => change({ validationStatus: event.target.value as DatasetSign['validationStatus'] })}><option value="unconfigured">Sin configurar</option><option value="pending">Pendiente de validación lingüística</option><option value="validated">Validada mediante revisión humana</option></select></label>
    <p className="dataset-muted">Cambiar los metadatos no reetiqueta las muestras anteriores: cada muestra conserva la configuración original de su etiqueta.</p>
    {error && <p role="alert" className="dataset-error">{error}</p>}<div className="dataset-actions"><button type="button" className="button button-outline" onClick={onCancel} disabled={saving}>Cancelar</button><button type="submit" className="button button-primary" disabled={saving}><Save size={17} /> Guardar metadatos</button></div>
  </form>;
}
