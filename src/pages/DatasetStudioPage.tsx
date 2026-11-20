import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileJson, FlaskConical, LockKeyhole, ShieldCheck, Upload, X } from 'lucide-react';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';
import { DatasetStatistics } from '../components/dataset/DatasetStatistics';
import { ParticipantSelector } from '../components/dataset/ParticipantSelector';
import { RecordingPanel } from '../components/dataset/RecordingPanel';
import { SavedSamples } from '../components/dataset/SavedSamples';
import { SampleFrames, SampleQuality } from '../components/dataset/SampleReview';
import { LegacyCatalogReview, SignEditor, SignSelector } from '../components/dataset/SignSelector';
import { DatasetStore } from '../features/sign-recognition/dataset/datasetStore';
import { loadCountdownPreferences, saveCountdownPreference } from '../features/sign-recognition/dataset/countdownPreferences';
import { downloadDataset, parseDatasetJSON } from '../features/sign-recognition/dataset/datasetExport';
import { MAX_IMPORT_BYTES, isOperatorReviewed, type DatasetDocument, type DatasetSample, type DatasetSign, type DatasetSnapshot, type SampleReviewAction, type SampleSummary } from '../features/sign-recognition/dataset/datasetTypes';
import './DatasetStudioPage.css';

type Confirmation = { title: string; message: string; actionLabel: string; acknowledgement?: string; action: () => Promise<boolean> };
const reviewLabels = { mark: 'Marcar como revisadas por operador', unmark: 'Desmarcar como revisadas', accept: 'Aceptar seleccionadas', reject: 'Rechazar seleccionadas' };

export default function DatasetStudioPage() {
  const [store] = useState(() => new DatasetStore());
  const [snapshot, setSnapshot] = useState<DatasetSnapshot | null>(null);
  const [participantId, setParticipantId] = useState('');
  const [signId, setSignId] = useState('LSP-001');
  const [countdowns, setCountdowns] = useState(loadCountdownPreferences);
  const [consentId, setConsentId] = useState('');
  const [operation, setOperation] = useState(false);
  const [recordingLocked, setRecordingLocked] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingSign, setEditingSign] = useState<DatasetSign | null>(null);
  const [reviewing, setReviewing] = useState<DatasetSample | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');
  const [reviewTableVersion, setReviewTableVersion] = useState(0);
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

  const perform = useCallback(async (work: () => Promise<void>, message = '', refresh = true) => {
    setOperation(true); setError(''); setNotice('');
    try {
      await work();
      if (!mounted.current) return true;
      if (refresh) {
        const next = await store.snapshot();
        if (mounted.current) setSnapshot(next);
      }
      if (mounted.current) setNotice(message);
      return true;
    } catch (error) { if (mounted.current) setError(error instanceof Error && error.name === 'QuotaExceededError' ? 'Se agotó el espacio del navegador. La operación se canceló sin guardar datos parciales. Descarga un respaldo y libera espacio.' : error instanceof Error ? error.message : 'No se pudo completar la operación local.'); return false; }
    finally { if (mounted.current) setOperation(false); }
  }, [store]);

  function closeDetail() { detailRef.current?.close(); setEditingSign(null); setReviewing(null); }
  const locked = operation || recordingLocked;
  const participant = snapshot?.participants.find(person => person.id === participantId);
  const sign = snapshot?.signs.find(item => item.id === signId);
  const repetition = Math.max(0, ...(snapshot?.samples.filter(sample => sample.participantId === participantId && sample.labelId === signId).map(sample => sample.repetition) ?? [])) + 1;

  function reviewOne(sample: DatasetSample, action: SampleReviewAction) {
    void perform(async () => {
      if (action === 'accept' || action === 'reject') await store.reviewSample(sample.sampleId, action === 'accept' ? 'accepted' : 'rejected');
      else if ((await store.updateSampleReviews([sample.sampleId], action)).missingIds.length) throw new Error('La muestra ya no existe.');
    }, 'Estado de la muestra actualizado.').then(saved => { if (saved) closeDetail(); });
  }

  function confirmBulkReview(selected: SampleSummary[], action: SampleReviewAction, clear: () => void) {
    const ids = selected.map(sample => sample.sampleId);
    const changes = selected.filter(sample => {
      if (action === 'accept') return sample.qualityMetrics.sufficient && sample.reviewStatus !== 'accepted';
      if (action === 'reject') return sample.reviewStatus !== 'rejected';
      return isOperatorReviewed(sample) !== (action === 'mark');
    }).length;
    const excluded = action === 'accept' ? selected.filter(sample => !sample.qualityMetrics.sufficient).length : 0;
    setAcknowledged(false);
    setConfirmation({
      title: reviewLabels[action],
      message: `Se actualizarán ${changes} de ${ids.length} muestras seleccionadas.${excluded ? ` Se omitirán ${excluded} de calidad insuficiente.` : ''}`,
      actionLabel: 'Aplicar cambios',
      acknowledgement: action === 'mark' || action === 'accept' ? 'Confirmo que revisé las muestras que se actualizarán.' : undefined,
      action: () => perform(async () => {
        const result = await store.updateSampleReviews(ids, action);
        if (!mounted.current) return;
        const updates = new Map(result.updated.map(sample => [sample.sampleId, sample]));
        const missing = new Set(result.missingIds);
        setSnapshot(previous => previous && ({ ...previous,
          samples: previous.samples.filter(sample => !missing.has(sample.sampleId)).map(sample => updates.get(sample.sampleId) ?? sample) }));
        setReviewNotice([
          `Muestras actualizadas: ${result.updated.length}.`,
          result.unchanged ? `Ya tenían el estado solicitado: ${result.unchanged}.` : '',
          result.insufficient ? `Omitidas por calidad insuficiente: ${result.insufficient}.` : '',
          missing.size ? `Muestras que ya no estaban disponibles: ${missing.size}.` : '',
        ].filter(Boolean).join(' '));
        clear();
      }, '', false),
    });
  }

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
        action: () => perform(async () => { await store.replace(document); setParticipantId(''); setConsentId(''); setSignId('LSP-001'); setReviewTableVersion(previous => previous + 1); setReviewNotice(''); }, 'Dataset restaurado. Las etiquetas anteriores se conservan; se incorporó el catálogo LSP sin reetiquetar muestras. Confirma el consentimiento de cada persona antes de continuar recopilando.') });
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
        <LegacyCatalogReview signs={snapshot.signs} samples={snapshot.samples} />
        <div className="dataset-workspace"><aside className="dataset-setup"><ParticipantSelector key={participantId} snapshot={snapshot} selectedId={participantId} sessionConsent={consentId === participantId && !!participantId} disabled={locked}
          onSelect={id => { setParticipantId(id); setConsentId(''); }} onCreate={createParticipant} onDelete={deleteParticipant}
          onConsent={() => { void perform(async () => { await store.consentParticipant(participantId); setConsentId(participantId); }, 'Consentimiento registrado para esta sesión.'); }} />
          <SignSelector signs={snapshot.signs} selectedId={signId} disabled={locked} onSelect={setSignId} onEdit={() => { if (sign) setEditingSign(sign); }} />
          <div className="dataset-local-note"><FileJson size={21} aria-hidden="true" /><p>Diez señas LSP pendientes de revisión lingüística, con duración individual. Los ejemplos negativos pertenecen a una categoría técnica independiente. Cada repetición conserva su secuencia temporal.</p></div>
        </aside>{sign && <RecordingPanel key={`${participantId}/${signId}/${consentId}`} participant={participant} sign={sign} sessionConsent={!!participantId && consentId === participantId} repetition={repetition} disabled={operation} onLocked={setRecordingLocked}
          countdownSeconds={countdowns[sign.expectedHands]} onCountdownChange={seconds => {
            saveCountdownPreference(sign.expectedHands, seconds);
            setCountdowns(previous => ({ ...previous, [sign.expectedHands]: seconds }));
          }}
          onSave={sample => perform(async () => { await store.saveSample(sample); }, 'Muestra guardada como pendiente de revisión.')} />}</div>

        <SavedSamples key={reviewTableVersion} snapshot={snapshot} locked={locked} notice={reviewNotice} onDelete={deleteSample}
          onReview={id => { void perform(async () => { setReviewing(await store.getSample(id)); }); }} onBulkAction={confirmBulkReview} />

        <section className="dataset-panel dataset-export" aria-labelledby="dataset-export-title"><div><span className="dataset-eyebrow">05 / EXPORTACIÓN Y RESPALDO</span><h2 id="dataset-export-title">Tus secuencias, listas para el siguiente paso</h2><p>JSON con secuencias, lateralidad, coordenadas, consentimiento, calidad y configuración de captura. Incluye todos los estados de revisión; la revisión lingüística sigue siendo independiente.</p><span className="dataset-id">{snapshot.meta.datasetId}</span></div><div className="dataset-export-actions"><button type="button" className="button button-primary" disabled={locked} onClick={() => exportFile('dataset')}><Download size={18} /> Exportar dataset JSON</button><button type="button" className="button button-outline" disabled={locked} onClick={() => exportFile('backup')}><FileJson size={18} /> Descargar respaldo</button><button type="button" className="button button-outline" disabled={locked} onClick={() => fileRef.current?.click()}><Upload size={18} /> Importar / restaurar JSON</button><input ref={fileRef} className="sr-only" type="file" accept="application/json,.json" disabled={locked} onChange={event => { void importFile(event.target.files?.[0]); }} /></div></section>
      </>}
    </main>
    <dialog ref={detailRef} className="dataset-dialog" aria-label={editingSign ? 'Editar etiqueta del catálogo' : 'Revisar muestra guardada'} onCancel={event => { if (operation) event.preventDefault(); }} onClose={() => { setEditingSign(null); setReviewing(null); }} onClick={event => { if (event.target === event.currentTarget && !operation) closeDetail(); }}>
      {error && <p role="alert" className="dataset-error">{error}</p>}
      {editingSign && <SignEditor key={editingSign.id} sign={editingSign} saving={operation} onCancel={closeDetail} onSave={updated => { void perform(() => store.saveSign(updated), 'Metadatos guardados.').then(saved => { if (saved) closeDetail(); }); }} />}
      {reviewing && <>
        <div className="dataset-section-title">
          <div><span className="dataset-eyebrow">{reviewing.participantId} · REPETICIÓN {reviewing.repetition}</span><h2>{reviewing.captureMetadata.labelSnapshot.name}</h2></div>
          <button className="dataset-icon-button" type="button" aria-label="Cerrar revisión" autoFocus onClick={closeDetail}><X size={21} /></button>
        </div>
        <SampleQuality sample={reviewing} /><SampleFrames key={reviewing.sampleId} sample={reviewing} />
        <div className="dataset-actions">
          <button className="button button-primary" type="button" disabled={operation} onClick={() => reviewOne(reviewing, isOperatorReviewed(reviewing) ? 'unmark' : 'mark')}>
            {isOperatorReviewed(reviewing) ? 'Desmarcar como revisada' : 'Marcar como revisada por operador'}
          </button>
          <button className="button button-outline" type="button" disabled={operation || !reviewing.qualityMetrics.sufficient || reviewing.reviewStatus === 'accepted'}
            onClick={() => reviewOne(reviewing, 'accept')}>Aceptar muestra</button>
          <button className="button button-outline" type="button" disabled={operation || reviewing.reviewStatus === 'rejected'}
            onClick={() => reviewOne(reviewing, 'reject')}>Descartar de uso</button>
        </div>
      </>}
    </dialog>
    <dialog ref={confirmationRef} className="dataset-dialog dataset-confirm" aria-labelledby="dataset-confirm-title" onCancel={event => { if (operation) event.preventDefault(); }} onClose={() => setConfirmation(null)}>{confirmation && <><h2 id="dataset-confirm-title">{confirmation.title}</h2><p>{confirmation.message}</p>{confirmation.acknowledgement && <label className="dataset-check"><input type="checkbox" disabled={operation} checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> {confirmation.acknowledgement}</label>}{error && <p role="alert" className="dataset-error">{error}</p>}<div className="dataset-actions"><button type="button" className="button button-outline" autoFocus disabled={operation} onClick={() => confirmationRef.current?.close()}>Cancelar</button><button type="button" className="button button-primary" disabled={operation || (!!confirmation.acknowledgement && !acknowledged)} onClick={() => { void confirmation.action().then(done => { if (done) confirmationRef.current?.close(); }); }}>{operation ? 'Procesando…' : confirmation.actionLabel}</button></div></>}</dialog>
  </div>;
}
