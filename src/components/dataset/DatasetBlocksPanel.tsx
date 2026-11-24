import { useState } from 'react';
import type { EncodedDatasetBlock, ExportScope } from '../../features/sign-recognition/dataset/datasetBlocks';
import type { DatasetParticipant } from '../../features/sign-recognition/dataset/datasetTypes';

function download(file: EncodedDatasetBlock) {
  const url = URL.createObjectURL(new Blob([file.text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = file.name; link.hidden = true;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DatasetBlocksPanel({ participants, selectedIds, scope, disabled, onScopeChange, onExport, onImport }: {
  participants: DatasetParticipant[];
  selectedIds: string[];
  scope: string;
  disabled: boolean;
  onScopeChange: (scope: string) => void;
  onExport: (scope: ExportScope, maxBytes: number) => Promise<EncodedDatasetBlock[] | undefined>;
  onImport: (files: File[], action: 'verify' | 'backup' | 'merge') => void;
}) {
  const [participantId, setParticipantId] = useState('');
  const [session, setSession] = useState<1 | 2>(1);
  const [mib, setMib] = useState(25);
  const [files, setFiles] = useState<EncodedDatasetBlock[]>([]);
  const [incoming, setIncoming] = useState<File[]>([]);

  async function prepare() {
    setFiles([]);
    const filters: ExportScope = scope === 'selected' ? { sampleIds: selectedIds }
      : scope === 'participant' ? { participantId }
        : scope === 'session' ? { participantId, session } : {};
    setFiles(await onExport(filters, mib * 1024 * 1024) ?? []);
  }

  return <section className="dataset-panel" aria-labelledby="dataset-blocks-title">
    <h2 id="dataset-blocks-title" tabIndex={-1}>Bloques verificables</h2>
    <p className="dataset-muted">Prepara archivos de hasta el tamaño elegido. Descarga todos los bloques del lote y vuelve a seleccionarlos para comprobar el respaldo.</p>
    <div className="dataset-sample-filters">
      <label className="dataset-field">Alcance<select value={scope} disabled={disabled} onChange={event => onScopeChange(event.target.value)}>
        <option value="all">Todas las muestras</option><option value="participant">Participante</option>
        <option value="session">Sesión de un participante</option><option value="selected">Selección de la tabla ({selectedIds.length})</option>
      </select></label>
      {(scope === 'participant' || scope === 'session') && <label className="dataset-field">Identificador
        <select disabled={disabled} value={participantId} onChange={event => setParticipantId(event.target.value)}>
          <option value="">Selecciona un participante</option>
          {participants.map(person => <option key={person.id} value={person.id}>{person.id}</option>)}
        </select>
      </label>}
      {scope === 'session' && <label className="dataset-field">Sesión<select value={session} disabled={disabled} onChange={event => setSession(event.target.value === '1' ? 1 : 2)}>
        <option value="1">Sesión 1</option><option value="2">Sesión 2</option>
      </select></label>}
      <label className="dataset-field">Máximo por bloque<select value={mib} disabled={disabled} onChange={event => setMib(Number(event.target.value))}>
        {[10, 25, 50, 90].map(value => <option key={value} value={value}>{value} MiB</option>)}
      </select></label>
    </div>
    <button type="button" className="button button-primary" disabled={disabled || (scope === 'selected' && !selectedIds.length)
      || ((scope === 'participant' || scope === 'session') && !participants.some(person => person.id === participantId))} onClick={() => void prepare()}>Preparar bloques</button>
    {files.length > 0 && <ol className="dataset-generated-blocks">
      {files.map((file, index) => <li key={file.name}><button type="button" className="button button-outline" disabled={disabled} onClick={() => download(file)}>
        Descargar bloque {index + 1} de {files.length}
      </button> <span>{(file.size / 1024 / 1024).toFixed(2)} MiB</span></li>)}
    </ol>}
    <div className="dataset-block-import">
      <label className="dataset-field">Bloques o respaldos JSON del mismo dataset
        <input type="file" accept=".json,application/json" multiple disabled={disabled} onChange={event => setIncoming(Array.from(event.target.files ?? []))} />
      </label>
      <div className="dataset-actions">
        <button type="button" className="button button-outline" disabled={disabled || !incoming.length} onClick={() => onImport(incoming, 'verify')}>Verificar archivos</button>
        <button type="button" className="button button-outline" disabled={disabled || !incoming.length} onClick={() => onImport(incoming, 'backup')}>Verificar respaldo del almacén local</button>
        <button type="button" className="button button-primary" disabled={disabled || !incoming.length} onClick={() => onImport(incoming, 'merge')}>Combinar sin sustituir</button>
      </div>
    </div>
  </section>;
}
