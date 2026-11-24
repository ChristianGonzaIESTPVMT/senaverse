import { parseDatasetJSON, validateDatasetDocument, validateDatasetSample } from './datasetExport.ts';
import { MAX_IMPORT_BYTES, type DatasetDocument, type DatasetMeta, type DatasetParticipant, type DatasetSample } from './datasetTypes.ts';

const format = 'senaverse-block-v1';
const encoder = new TextEncoder();
const bytes = (text: string) => encoder.encode(text).byteLength;
type Block = { format: typeof format; batchId: string; index: number; count: number; sampleCount: number; sha256: string; payload: string };
type Header = Omit<DatasetDocument, 'samples' | 'collectedAt'>;
type BlockFile = Pick<File, 'name' | 'size' | 'text'>;
export type EncodedDatasetBlock = { name: string; text: string; size: number };
export type ExportScope = { participantId?: string; session?: 1 | 2; sampleIds?: string[] };

async function digest(text: string) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function buildPayloads(header: Header, recordings: AsyncIterable<DatasetSample>, maxBytes: number) {
  if (!Number.isInteger(maxBytes) || maxBytes < 4096 || maxBytes > MAX_IMPORT_BYTES) throw new Error('Elige un tamaño de bloque válido.');
  const headerSize = bytes(JSON.stringify(JSON.stringify({ ...header, collectedAt: null, samples: [] }))) + 512;
  const payloads: string[] = [];
  let rows: string[] = [], size = headerSize, collectedAt: string | undefined;
  function flush() {
    const prefix = JSON.stringify({ ...header, collectedAt }).slice(0, -1);
    payloads.push(`${prefix},"samples":[${rows.join(',')}]}`);
    rows = []; size = headerSize; collectedAt = undefined;
  }
  for await (const sample of recordings) {
    validateDatasetSample(sample);
    const row = JSON.stringify(sample);
    const rowSize = bytes(JSON.stringify(row)) - 1; // Remove the wrapping quotes and reserve a comma.
    if (headerSize + rowSize > maxBytes) throw new Error(`La muestra ${sample.sampleId} supera el tamaño elegido para un bloque.`);
    if (rows.length && size + rowSize > maxBytes) flush();
    rows.push(row);
    size += rowSize;
    if (!collectedAt || Date.parse(sample.recordedAt) < Date.parse(collectedAt)) collectedAt = sample.recordedAt;
  }
  if (rows.length) flush();
  if (!payloads.length) throw new Error('No hay muestras para exportar con este filtro.');
  return payloads;
}

export async function encodeBlocks(payloads: string[], sampleCount: number, maxBytes: number) {
  const batchId = crypto.randomUUID();
  const files: EncodedDatasetBlock[] = [];
  for (const [offset, payload] of payloads.entries()) {
    const index = offset + 1;
    const block: Block = { format, batchId, index, count: payloads.length, sampleCount, sha256: await digest(payload), payload };
    const text = JSON.stringify(block);
    const size = bytes(text);
    if (size > maxBytes || size > MAX_IMPORT_BYTES) throw new Error('Un bloque superó el tamaño permitido.');
    files.push({ name: `senaverse-bloque-${batchId}-${index}-de-${payloads.length}.json`, text, size });
  }
  return files;
}

async function decodeBlocks(files: BlockFile[]) {
  const groups = new Map<string, { count: number; sampleCount: number; blocks: Map<number, { hash: string; document: DatasetDocument }> }>();
  const documents: DatasetDocument[] = [];
  for (const file of files) {
    if (file.size > MAX_IMPORT_BYTES) throw new Error(`${file.name} supera 100 MiB.`);
    const text = await file.text();
    let parsed: DatasetDocument | Block;
    try { parsed = JSON.parse(text); } catch { throw new Error(`${file.name} no contiene JSON válido.`); }
    if (!parsed || !('format' in Object(parsed))) {
      validateDatasetDocument(parsed);
      documents.push(parsed);
      continue;
    }
    const { format: kind, batchId, index, count, sampleCount, sha256, payload } = parsed as Block;
    if (kind !== format || typeof batchId !== 'string' || !/^[a-f0-9-]{36}$/.test(batchId)
      || !Number.isInteger(index) || !Number.isInteger(count) || index < 1 || index > count || count > 20000
      || !Number.isInteger(sampleCount) || sampleCount < count || sampleCount > 20000
      || typeof payload !== 'string' || await digest(payload) !== sha256) throw new Error(`Fallo de integridad en ${file.name}.`);
    const group = groups.get(batchId) ?? { count, sampleCount, blocks: new Map() };
    if (group.count !== count || group.sampleCount !== sampleCount) throw new Error(`Metadatos incompatibles en el lote ${batchId}.`);
    const previous = group.blocks.get(index);
    if (previous && previous.hash !== sha256) throw new Error(`Conflicto en el bloque ${index} del lote ${batchId}.`);
    if (!previous) group.blocks.set(index, { hash: sha256, document: parseDatasetJSON(payload) });
    groups.set(batchId, group);
  }
  for (const [id, group] of groups) {
    const parts = [...group.blocks.values()].map(block => block.document);
    const count = parts.reduce((sum, doc) => sum + doc.samples.length, 0);
    if (group.blocks.size !== group.count || count !== group.sampleCount) throw new Error(`Lote incompleto ${id}: ${group.blocks.size}/${group.count} bloques, ${count}/${group.sampleCount} tomas.`);
    if (new Set(parts.flatMap(part => part.samples.map(sample => sample.sampleId))).size !== count) throw new Error(`Muestras repetidas dentro del lote ${id}.`);
    documents.push(...parts);
  }
  return documents;
}

export function sameRecord(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => sameRecord(item, right[index]));
  }
  const expected = right as Record<string, unknown>;
  const fields = Object.entries(left).filter(([, value]) => value !== undefined);
  return fields.length === Object.values(expected).filter(value => value !== undefined).length
    && fields.every(([key, value]) => Object.hasOwn(expected, key) && sameRecord(value, expected[key]));
}

export function sameDataset(left: DatasetMeta, right: DatasetMeta) {
  return left.datasetId === right.datasetId && left.createdAt === right.createdAt && left.schemaVersion === right.schemaVersion
    && sameRecord(left.captureConfiguration, right.captureConfiguration) && sameRecord(left.mediaPipeModel, right.mediaPipeModel);
}

export function mergeParticipant(previous: DatasetParticipant | undefined, person: DatasetParticipant) {
  if (!previous) return person;
  if (previous.createdAt !== person.createdAt || (previous.partition && person.partition && previous.partition !== person.partition)) {
    throw new Error(`Conflicto de identidad o partición para ${person.id}.`);
  }
  const latest = person.consentedAt && (!previous.consentedAt || Date.parse(person.consentedAt) > Date.parse(previous.consentedAt)) ? person : previous;
  const partition = previous.partition ?? person.partition;
  return partition ? { ...latest, partition } : latest;
}

export async function combineDatasetFiles(files: BlockFile[]): Promise<DatasetDocument> {
  const documents = (await decodeBlocks(files)).toSorted((a, b) => Date.parse(a.exportedAt) - Date.parse(b.exportedAt));
  if (!documents.length) throw new Error('Selecciona al menos un archivo.');
  const first = documents[0], latest = documents.at(-1)!;
  const participants = new Map<string, DatasetParticipant>();
  const signs = new Map<string, { sign: DatasetDocument['signs'][number]; exportedAt: number }>();
  const samples = new Map<string, DatasetSample>(), repetitions = new Map<string, string>();
  for (const doc of documents) {
    if (!sameDataset(first, doc)) throw new Error('Los archivos pertenecen a datasets distintos o usan otra configuración.');
    const exportedAt = Date.parse(doc.exportedAt);
    for (const sign of doc.signs) {
      const previous = signs.get(sign.id);
      if (previous && previous.exportedAt === exportedAt && !sameRecord(previous.sign, sign)) throw new Error(`Catálogo incompatible para ${sign.id}.`);
      signs.set(sign.id, { sign, exportedAt });
    }
    for (const person of doc.participants) participants.set(person.id, mergeParticipant(participants.get(person.id), person));
    for (const sample of doc.samples) {
      const previous = samples.get(sample.sampleId);
      if (previous && !sameRecord(previous, sample)) throw new Error(`Conflicto de contenido para sampleId ${sample.sampleId}.`);
      const key = `${sample.participantId}/${sample.labelId}/${sample.repetition}`;
      if (repetitions.has(key) && repetitions.get(key) !== sample.sampleId) throw new Error(`Conflicto de repetición ${key}.`);
      repetitions.set(key, sample.sampleId);
      samples.set(sample.sampleId, sample);
    }
  }
  const ordered = [...samples.values()].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt) || a.sampleId.localeCompare(b.sampleId));
  return { ...latest, nextParticipantNumber: Math.max(...documents.map(doc => doc.nextParticipantNumber)), participants: [...participants.values()],
    signs: [...signs.values()].map(record => record.sign), samples: ordered, collectedAt: ordered[0]?.recordedAt ?? null };
}
