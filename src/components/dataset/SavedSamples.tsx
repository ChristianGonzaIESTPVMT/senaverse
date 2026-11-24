import { useMemo, useState } from 'react';
import { FileJson } from 'lucide-react';
import { isOperatorReviewed, type DatasetSnapshot, type SampleReviewAction, type SampleSummary } from '../../features/sign-recognition/dataset/datasetTypes';

const PAGE_SIZE = 8;
const initialFilters = { sign: '', participant: '', reviewed: '', acceptance: '', quality: '', id: '' };
const acceptance = { pending: 'Pendiente de decisión', accepted: 'Aceptada', rejected: 'Rechazada' };
const dateFormat = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'medium' });

export function SavedSamples({ snapshot, locked, notice, onReview, onDelete, onBulkAction, onExportSelection }: {
  snapshot: DatasetSnapshot; locked: boolean; notice: string;
  onReview: (id: string) => void; onDelete: (id: string) => void;
  onBulkAction: (selected: SampleSummary[], action: SampleReviewAction, clear: () => void) => void;
  onExportSelection?: (sampleIds: string[]) => void;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());
  const [samplePage, setSamplePage] = useState(1);
  const filtered = useMemo(() => snapshot.samples.filter(sample =>
    (!filters.sign || sample.labelId === filters.sign)
    && (!filters.participant || sample.participantId === filters.participant)
    && (!filters.reviewed || isOperatorReviewed(sample) === (filters.reviewed === 'reviewed'))
    && (!filters.acceptance || sample.reviewStatus === filters.acceptance)
    && (!filters.quality || sample.qualityMetrics.sufficient === (filters.quality === 'sufficient'))
    && sample.sampleId.toLowerCase().includes(filters.id.trim().toLowerCase())), [snapshot.samples, filters]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(samplePage, pageCount);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = useMemo(() => filtered.filter(sample => selectedIds.has(sample.sampleId)), [filtered, selectedIds]);
  const visibleCount = visible.filter(sample => selectedIds.has(sample.sampleId)).length;
  const pageSelected = visible.length > 0 && visibleCount === visible.length;
  const counts = useMemo(() => {
    const totals = new Map<string, number>();
    for (const sample of snapshot.samples) totals.set(sample.labelId, (totals.get(sample.labelId) ?? 0) + 1);
    return totals;
  }, [snapshot.samples]);

  function clear() { setSelectedIds(new Set()); }
  function changeFilter(key: keyof typeof initialFilters, value: string) {
    setFilters(previous => ({ ...previous, [key]: value }));
    setSamplePage(1);
    clear();
  }
  function select(samples: SampleSummary[], checked: boolean) {
    setSelectedIds(previous => {
      const next = new Set(previous);
      for (const { sampleId } of samples) {
        if (checked) next.add(sampleId);
        else next.delete(sampleId);
      }
      return next;
    });
  }

  return <section className="dataset-panel dataset-samples" aria-labelledby="dataset-samples-title">
    <div className="dataset-section-title"><div><span className="dataset-eyebrow">04 / REVISIÓN</span><h2 id="dataset-samples-title">Muestras guardadas</h2></div></div>
    <div className="dataset-sample-filters">
      <label className="dataset-field">ID de muestra<input type="search" disabled={locked} value={filters.id} onChange={event => changeFilter('id', event.target.value)} /></label>
      <label className="dataset-field">Seña<select disabled={locked} value={filters.sign} onChange={event => changeFilter('sign', event.target.value)}>
        <option value="">Todas</option>{snapshot.signs.map(sign => <option key={sign.id} value={sign.id}>{sign.id} · {sign.name || 'Etiqueta anterior'}</option>)}
      </select></label>
      <label className="dataset-field">Participante<select disabled={locked} value={filters.participant} onChange={event => changeFilter('participant', event.target.value)}>
        <option value="">Todos</option>{snapshot.participants.map(person => <option key={person.id} value={person.id}>{person.id}</option>)}
      </select></label>
      <label className="dataset-field">Revisión por operador<select disabled={locked} value={filters.reviewed} onChange={event => changeFilter('reviewed', event.target.value)}>
        <option value="">Todas</option><option value="reviewed">Revisadas</option><option value="pending">Sin revisar</option>
      </select></label>
      <label className="dataset-field">Aceptación<select disabled={locked} value={filters.acceptance} onChange={event => changeFilter('acceptance', event.target.value)}>
        <option value="">Todas</option>{Object.entries(acceptance).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className="dataset-field">Calidad de captura<select disabled={locked} value={filters.quality} onChange={event => changeFilter('quality', event.target.value)}>
        <option value="">Todas</option><option value="sufficient">Suficiente</option><option value="insufficient">Insuficiente</option>
      </select></label>
    </div>
    {notice && <p className="dataset-notice" role="status">{notice}</p>}
    {selected.length > 0 && <div className="dataset-bulk-actions">
      <strong role="status">{selected.length} {selected.length === 1 ? 'muestra seleccionada' : 'muestras seleccionadas'}</strong>
      <button className="button button-primary" type="button" disabled={locked} onClick={() => onBulkAction(selected, 'mark', clear)}>Marcar como revisadas por operador</button>
      {onExportSelection && <button className="button button-outline" type="button" disabled={locked}
        onClick={() => onExportSelection(selected.map(sample => sample.sampleId))}>Exportar selección por bloques</button>}
      <details><summary>Más acciones</summary><div className="dataset-bulk-options">
        <button type="button" disabled={locked} onClick={() => onBulkAction(selected, 'unmark', clear)}>Desmarcar como revisadas</button>
        <button type="button" disabled={locked || !selected.some(sample => sample.qualityMetrics.sufficient)} onClick={() => onBulkAction(selected, 'accept', clear)}>Aceptar seleccionadas</button>
        <button type="button" disabled={locked} onClick={() => onBulkAction(selected, 'reject', clear)}>Rechazar seleccionadas</button>
      </div></details>
      <button className="button button-outline" type="button" disabled={locked} onClick={clear}>Limpiar selección</button>
    </div>}
    {visible.length > 0 ? <>
      <div className="dataset-selection-actions">
        <span>{filtered.length} {filtered.length === 1 ? 'muestra' : 'muestras'} en el filtro</span>
        <button className="button button-outline" type="button" disabled={locked || selected.length === filtered.length}
          onClick={() => setSelectedIds(new Set(filtered.map(sample => sample.sampleId)))}>Seleccionar todas las del filtro ({filtered.length})</button>
      </div>
      <div className="dataset-table-scroll"><table>
        <thead><tr>
          <th scope="col"><label className="dataset-sample-check">
            <input type="checkbox" disabled={locked} checked={pageSelected}
              ref={input => { if (input) input.indeterminate = visibleCount > 0 && !pageSelected; }}
              onChange={event => select(visible, event.target.checked)} /> Esta página
          </label></th>
          <th scope="col">Etiqueta / repetición</th><th scope="col">Participante</th><th scope="col">Datos</th>
          <th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th>
        </tr></thead>
        <tbody>{visible.map(sample => {
          const label = sample.captureMetadata.labelSnapshot.name;
          return <tr key={sample.sampleId}>
            <td><input className="dataset-sample-checkbox" type="checkbox" disabled={locked} checked={selectedIds.has(sample.sampleId)}
              aria-label={`Seleccionar ${label}, ${sample.participantId}, repetición ${sample.repetition}`}
              onChange={event => select([sample], event.target.checked)} /></td>
            <td><strong>{label}</strong><span>Repetición {sample.repetition} · {dateFormat.format(new Date(sample.recordedAt))}</span></td>
            <td>{sample.participantId}{sample.captureMetadata.campaign && <span>Sesión {sample.captureMetadata.campaign.session}</span>}</td>
            <td>{sample.qualityMetrics.frameCount} observaciones<span>{sample.qualityMetrics.averageFps.toFixed(1)} obs/s · {(sample.qualityMetrics.expectedHandsRatio * 100).toFixed(0)}% manos esperadas</span></td>
            <td>
              <span className="dataset-badge">{isOperatorReviewed(sample) ? 'Revisada por operador' : 'Sin revisar'}</span>
              <span className={`dataset-badge${sample.reviewStatus === 'accepted' ? ' is-accepted' : ''}`}>{acceptance[sample.reviewStatus]}</span>
              {!sample.qualityMetrics.sufficient && <span className="dataset-quality-flag">Calidad insuficiente</span>}
              {sample.excludedFromV2 && <span className="dataset-badge">Excluida de V2</span>}
            </td>
            <td><div className="dataset-row-actions">
              <button type="button" disabled={locked} onClick={() => onReview(sample.sampleId)}>Revisar</button>
              <button className="dataset-text-danger" type="button" disabled={locked} onClick={() => onDelete(sample.sampleId)}>Eliminar</button>
            </div></td>
          </tr>;
        })}</tbody>
      </table></div>
      <div className="dataset-pagination">
        <button className="button button-outline" type="button" disabled={locked || page === 1} onClick={() => setSamplePage(page - 1)}>Anterior</button>
        <span>{page} / {pageCount}</span>
        <button className="button button-outline" type="button" disabled={locked || page === pageCount} onClick={() => setSamplePage(page + 1)}>Siguiente</button>
      </div>
    </> : <div className="dataset-empty"><FileJson size={30} aria-hidden="true" />
      <h3>{snapshot.samples.length ? 'Ninguna muestra coincide con los filtros' : 'Tus primeras muestras aparecerán aquí'}</h3>
      {snapshot.samples.length ? <button className="button button-outline" type="button" disabled={locked} onClick={() => { setFilters(initialFilters); setSamplePage(1); clear(); }}>Limpiar filtros</button>
        : <p>Completa una captura y guárdala después de revisar su calidad.</p>}
    </div>}
    <details className="dataset-progress-detail"><summary>Muestras por etiqueta o categoría</summary>
      <ul>{snapshot.signs.map(sign => <li key={sign.id}><span>{sign.id} · {sign.name || `Espacio ${sign.id.slice(-2)}`}{sign.category === 'negative' ? ' · categoría técnica' : sign.category === undefined ? ' · catálogo anterior' : ''}</span>
        <strong>{counts.get(sign.id) ?? 0}</strong></li>)}</ul>
    </details>
  </section>;
}
