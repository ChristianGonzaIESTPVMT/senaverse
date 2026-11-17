import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileJson, FlaskConical, LockKeyhole, ShieldCheck, Upload, X } from 'lucide-react';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';
import { DatasetStatistics } from '../components/dataset/DatasetStatistics';
import { ParticipantSelector } from '../components/dataset/ParticipantSelector';
import { RecordingPanel } from '../components/dataset/RecordingPanel';
import { SampleFrames, SampleQuality } from '../components/dataset/SampleReview';
import { SignEditor, SignSelector } from '../components/dataset/SignSelector';
import { DatasetStore } from '../features/sign-recognition/dataset/datasetStore';
import { downloadDataset, parseDatasetJSON } from '../features/sign-recognition/dataset/datasetExport';
import { MAX_IMPORT_BYTES, type DatasetDocument, type DatasetSample, type DatasetSign, type DatasetSnapshot } from '../features/sign-recognition/dataset/datasetTypes';
import './DatasetStudioPage.css';

type Confirmation = { title: string; message: string; actionLabel: string; action: () => Promise<boolean> };

export default function DatasetStudioPage() {
  const [store] = useState(() => new DatasetStore());
  const [snapshot, setSnapshot] = useState<DatasetSnapshot | null>(null);
  const [participantId, setParticipantId] = useState('');
  const [signId, setSignId] = useState('sign-01');
  const [consentId, setConsentId] = useState('');
  const [operation, setOperation] = useState(false);
  const [recordingLocked, setRecordingLocked] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingSign, setEditingSign] = useState<DatasetSign | null>(null);
  const [reviewing, setReviewing] = useState<DatasetSample | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [sampleFilter, setSampleFilter] = useState('all');
  const [samplePage, setSamplePage] = useState(1);
  const detailRef = useRef<HTMLDialogElement>(null);
  const confirmationRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    void store.snapshot().then(value => { if (mounted.current) setSnapshot(value); }, error => { if (mounted.current) setError(error instanceof Error ? error.message : 'No se pudo abrir el dataset.'); });
    return () => { mounted.current = false; closeTimer.current = setTimeout(() => { void store.close(); }, 0); };
  }, [store]);
  useEffect(() => { if ((editingSign || reviewing) && !detailRef.current?.open) detailRef.current?.showModal(); }, [editingSign, reviewing]);
  useEffect(() => { if (confirmation && !confirmationRef.current?.open) confirmationRef.current?.showModal(); }, [confirmation]);

  const perform = useCallback(async (work: () => Promise<void>, message = '') => {
    setOperation(true); setError(''); setNotice('');
    try {
      await work();
      if (!mounted.current) return true;
      const next = await store.snapshot();
      if (mounted.current) { setSnapshot(next); setNotice(message); }
      return true;
    } catch (error) { if (mounted.current) setError(error instanceof Error && error.name === 'QuotaExceededError' ? 'Se agotó el espacio del navegador. La operación se canceló sin guardar datos parciales. Descarga un respaldo y libera espacio.' : error instanceof Error ? error.message : 'No se pudo completar la operación local.'); return false; }
    finally { if (mounted.current) setOperation(false); }
  }, [store]);

  function closeDetail() { detailRef.current?.close(); setEditingSign(null); setReviewing(null); }
  const locked = operation || recordingLocked;
  const participant = snapshot?.participants.find(person => person.id === participantId);
  const sign = snapshot?.signs.find(item => item.id === signId);
  const repetition = Math.max(0, ...(snapshot?.samples.filter(sample => sample.participantId === participantId && sample.labelId === signId).map(sample => sample.repetition) ?? [])) + 1;
  const samples = snapshot?.samples.filter(sample => sampleFilter === 'all' || sample.reviewStatus === sampleFilter) ?? [];
  const pageCount = Math.max(1, Math.ceil(samples.length / 8));
  const page = Math.min(samplePage, pageCount);

  function createParticipant() {
    void perform(async () => { const person = await store.createParticipant(); setParticipantId(person.id); setConsentId(''); }, 'Participante creado. Confirma su consentimiento antes de activar la cámara.');
  }
  function deleteParticipant() {
    if (!participant) return;
    const id = participant.id;
    setConfirmation({ title: `Eliminar participante ${id}`, message: 'Se eliminarán este identificador y todas sus muestras y secuencias de este navegador. Los archivos JSON que hayas descargado se gestionan por separado.', actionLabel: 'Eliminar participante y muestras',
      action: () => perform(async () => { await store.deleteParticipant(id); setParticipantId(''); setConsentId(''); }, 'Participante y muestras eliminados.') });
  }
  function deleteSample(sampleId: string) {
    setConfirmation({ title: 'Eliminar esta muestra', message: 'Se eliminarán sus puntos y metadatos del almacenamiento local. Esta acción no afecta otras repeticiones.', actionLabel: 'Eliminar muestra',
      action: () => perform(() => store.deleteSample(sampleId), 'Muestra eliminada.') });
  }
  function exportFile(type: DatasetDocument['exportType']) {
    void perform(async () => { downloadDataset(await store.document(type)); }, type === 'backup' ? 'Respaldo JSON generado para descargar.' : 'Dataset JSON generado para descargar.');
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    setOperation(true); setError(''); setNotice('');
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('El archivo supera el límite de importación de 100 MB.');
      const document = parseDatasetJSON(await file.text());
      if (mounted.current) setConfirmation({ title: 'Restaurar dataset validado', message: `${document.participants.length} participantes, ${document.signs.filter(sign => sign.validationStatus !== 'unconfigured').length} etiquetas configuradas y ${document.samples.length} muestras. Sustituirá por completo el dataset local actual. Exporta antes un respaldo si necesitas conservarlo.`, actionLabel: 'Sustituir dataset local',
        action: () => perform(async () => { await store.replace(document); setParticipantId(''); setConsentId(''); setSignId(document.signs[0].id); setSamplePage(1); }, 'Dataset restaurado. Confirma el consentimiento de cada persona antes de continuar recopilando.') });
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : 'No se pudo validar el archivo.'); }
    finally { if (mounted.current) setOperation(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  return <div className="dataset-studio">
    <header className="dataset-topbar"><Brand /><div className="header-controls"><ThemeToggle /><Link to="/" className="dataset-back"><ArrowLeft size={17} aria-hidden="true" /> Volver a SeñaVerse</Link></div></header>
    <main className="dataset-content"><header className="dataset-heading"><div className="dataset-heading-icon"><FlaskConical size={31} aria-hidden="true" /></div><div><span className="dataset-eyebrow">HERRAMIENTA INTERNA · HITO 2</span><h1>SeñaVerse Dataset Studio</h1><p>Recopila secuencias reales de manos. Revisa cada repetición antes de guardarla.</p></div></header>
      <div className="dataset-privacy"><ShieldCheck size={22} aria-hidden="true" /><p><strong>Puntos de referencia y metadatos, guardados localmente.</strong> Sin videos, rostros, fotografías, audio ni datos de identidad. Esta herramienta se habilita por configuración; todavía no tiene autenticación.</p></div>
      {error && <p className="dataset-error dataset-feedback" role="alert">{error}</p>}{notice && <p className="dataset-success dataset-feedback" role="status">{notice}</p>}
      {!snapshot ? <section className="dataset-panel dataset-loading"><LockKeyhole size={27} aria-hidden="true" /><p>{error ? 'No se habilitará la recopilación hasta poder abrir el almacenamiento local.' : 'Abriendo el dataset local…'}</p>{error && <button className="button button-outline" type="button" onClick={() => void perform(async () => {})}>Reintentar almacenamiento</button>}</section> : <>
        <DatasetStatistics snapshot={snapshot} />
        <div className="dataset-workspace"><aside className="dataset-setup"><ParticipantSelector key={participantId} snapshot={snapshot} selectedId={participantId} sessionConsent={consentId === participantId && !!participantId} disabled={locked}
          onSelect={id => { setParticipantId(id); setConsentId(''); }} onCreate={createParticipant} onDelete={deleteParticipant}
          onConsent={() => { void perform(async () => { await store.consentParticipant(participantId); setConsentId(participantId); }, 'Consentimiento registrado para esta sesión.'); }} />
          <SignSelector signs={snapshot.signs} selectedId={signId} disabled={locked} onSelect={setSignId} onEdit={() => { if (sign) setEditingSign(sign); }} />
          <div className="dataset-local-note"><FileJson size={21} aria-hidden="true" /><p>Cada repetición conserva su secuencia temporal. El catálogo comienza con diez espacios sin vocabulario propuesto.</p></div>
        </aside>{sign && <RecordingPanel key={`${participantId}/${signId}/${consentId}`} participant={participant} sign={sign} sessionConsent={!!participantId && consentId === participantId} repetition={repetition} disabled={operation} onLocked={setRecordingLocked}
          onSave={sample => perform(async () => { await store.saveSample(sample); }, 'Muestra guardada como pendiente de revisión.')} />}</div>

        <section className="dataset-panel dataset-samples" aria-labelledby="dataset-samples-title"><div className="dataset-section-title"><div><span className="dataset-eyebrow">04 / REVISIÓN</span><h2 id="dataset-samples-title">Muestras guardadas</h2></div><label className="dataset-field dataset-inline-filter">Estado<select value={sampleFilter} disabled={locked} onChange={event => { setSampleFilter(event.target.value); setSamplePage(1); }}><option value="all">Todas</option><option value="pending">Pendientes</option><option value="accepted">Revisadas por operador</option><option value="rejected">Descartadas de uso</option></select></label></div>
          {samples.length ? <><div className="dataset-table-scroll"><table><thead><tr><th>Etiqueta / repetición</th><th>Participante</th><th>Datos</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{samples.slice((page - 1) * 8, page * 8).map(sample => <tr key={sample.sampleId}><td><strong>{sample.captureMetadata.labelSnapshot.name}</strong><span>Repetición {sample.repetition} · {new Date(sample.recordedAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</span></td><td>{sample.participantId}</td><td>{sample.qualityMetrics.frameCount} observaciones<span>{sample.qualityMetrics.averageFps.toFixed(1)} obs/s · {(sample.qualityMetrics.expectedHandsRatio * 100).toFixed(0)}% manos esperadas</span></td><td><span className={`dataset-badge${sample.reviewStatus === 'accepted' ? ' is-accepted' : ''}`}>{sample.reviewStatus === 'accepted' ? 'Revisada por operador' : sample.reviewStatus === 'rejected' ? 'Descartada de uso' : 'Pendiente'}</span>{!sample.qualityMetrics.sufficient && <span className="dataset-quality-flag">Calidad insuficiente</span>}</td><td><div className="dataset-row-actions"><button type="button" disabled={locked} onClick={() => { void perform(async () => { setReviewing(await store.getSample(sample.sampleId)); }); }}>Revisar</button><button className="dataset-text-danger" type="button" disabled={locked} onClick={() => deleteSample(sample.sampleId)}>Eliminar</button></div></td></tr>)}</tbody></table></div><div className="dataset-pagination"><button className="button button-outline" type="button" disabled={page === 1} onClick={() => setSamplePage(page - 1)}>Anterior</button><span>{page} / {pageCount}</span><button className="button button-outline" type="button" disabled={page === pageCount} onClick={() => setSamplePage(page + 1)}>Siguiente</button></div></> : <div className="dataset-empty"><FileJson size={30} aria-hidden="true" /><h3>Tus primeras muestras aparecerán aquí</h3><p>Completa una captura y guárdala después de revisar su calidad.</p></div>}
          <details className="dataset-progress-detail"><summary>Muestras por seña</summary><ul>{snapshot.signs.map(sign => <li key={sign.id}><span>{sign.name || `Espacio ${sign.id.slice(-2)}`}</span><strong>{snapshot.samples.filter(sample => sample.labelId === sign.id).length}</strong></li>)}</ul></details>
        </section>

        <section className="dataset-panel dataset-export" aria-labelledby="dataset-export-title"><div><span className="dataset-eyebrow">05 / EXPORTACIÓN Y RESPALDO</span><h2 id="dataset-export-title">Tus secuencias, listas para el siguiente paso</h2><p>JSON con secuencias, lateralidad, coordenadas, consentimiento, calidad y configuración de captura. Incluye todos los estados de revisión; la revisión lingüística sigue siendo independiente.</p><span className="dataset-id">{snapshot.meta.datasetId}</span></div><div className="dataset-export-actions"><button type="button" className="button button-primary" disabled={locked} onClick={() => exportFile('dataset')}><Download size={18} /> Exportar dataset JSON</button><button type="button" className="button button-outline" disabled={locked} onClick={() => exportFile('backup')}><FileJson size={18} /> Descargar respaldo</button><button type="button" className="button button-outline" disabled={locked} onClick={() => fileRef.current?.click()}><Upload size={18} /> Importar / restaurar JSON</button><input ref={fileRef} className="sr-only" type="file" accept="application/json,.json" disabled={locked} onChange={event => { void importFile(event.target.files?.[0]); }} /></div></section>
      </>}
    </main>
    <dialog ref={detailRef} className="dataset-dialog" aria-label={editingSign ? 'Editar etiqueta del catálogo' : 'Revisar muestra guardada'} onCancel={event => { if (operation) event.preventDefault(); }} onClose={() => { setEditingSign(null); setReviewing(null); }} onClick={event => { if (event.target === event.currentTarget && !operation) closeDetail(); }}>
      {error && <p role="alert" className="dataset-error">{error}</p>}
      {editingSign && <SignEditor key={editingSign.id} sign={editingSign} saving={operation} onCancel={closeDetail} onSave={updated => { void perform(() => store.saveSign(updated), 'Metadatos guardados.').then(saved => { if (saved) closeDetail(); }); }} />}
      {reviewing && <><div className="dataset-section-title"><div><span className="dataset-eyebrow">{reviewing.participantId} · REPETICIÓN {reviewing.repetition}</span><h2>{reviewing.captureMetadata.labelSnapshot.name}</h2></div><button className="dataset-icon-button" type="button" aria-label="Cerrar revisión" autoFocus onClick={closeDetail}><X size={21} /></button></div><SampleQuality sample={reviewing} /><SampleFrames key={reviewing.sampleId} sample={reviewing} /><div className="dataset-actions"><button className="button button-primary" type="button" disabled={operation || !reviewing.qualityMetrics.sufficient} onClick={() => { void perform(() => store.reviewSample(reviewing.sampleId, 'accepted'), 'Muestra revisada por operador.').then(saved => { if (saved) closeDetail(); }); }}>Marcar revisada por operador</button><button className="button button-outline" type="button" disabled={operation} onClick={() => { void perform(() => store.reviewSample(reviewing.sampleId, 'rejected'), 'Muestra descartada de uso; puedes eliminarla desde la lista.').then(saved => { if (saved) closeDetail(); }); }}>Descartar de uso</button></div></>}
    </dialog>
    <dialog ref={confirmationRef} className="dataset-dialog dataset-confirm" aria-labelledby="dataset-confirm-title" onCancel={event => { if (operation) event.preventDefault(); }} onClose={() => setConfirmation(null)}>{confirmation && <><h2 id="dataset-confirm-title">{confirmation.title}</h2><p>{confirmation.message}</p>{error && <p role="alert" className="dataset-error">{error}</p>}<div className="dataset-actions"><button type="button" className="button button-outline" autoFocus disabled={operation} onClick={() => confirmationRef.current?.close()}>Cancelar</button><button type="button" className="button button-primary" disabled={operation} onClick={() => { void confirmation.action().then(done => { if (done) confirmationRef.current?.close(); }); }}>{operation ? 'Procesando…' : confirmation.actionLabel}</button></div></>}</dialog>
  </div>;
}
