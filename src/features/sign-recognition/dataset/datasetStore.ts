import { CAPTURE_DEFAULTS, CONSENT_VERSION, DATASET_DATABASE_NAME, MODEL_METADATA, type DatasetDocument, type DatasetMeta, type DatasetParticipant, type DatasetSample, type DatasetSign, type DatasetSnapshot, type SampleSummary } from './datasetTypes.ts';
import { validateDatasetDocument, validateDatasetSample, validateSign } from './datasetExport.ts';
import { isOperatorReviewed, type SampleReviewAction } from './datasetTypes.ts';
import { catalogAdditions, createDatasetCatalog, signConfigurationErrors } from './signCatalog.ts';

const STORES = ['meta', 'participants', 'signs', 'samples', 'sequences'];
const request = <T>(value: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  value.onsuccess = () => resolve(value.result); value.onerror = () => reject(value.error ?? new Error('No se pudo acceder al almacenamiento.'));
});

async function transaction<T>(db: IDBDatabase, stores: string[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const tx = db.transaction(stores, mode);
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error ?? new Error('La operación de almacenamiento se canceló.'));
    tx.onerror = () => { /* onabort reports failures; success is only reported after commit. */ };
  });
  try { const result = await work(tx); await done; return result; }
  catch (error) { try { tx.abort(); } catch { /* Already completed/aborted. */ } await done.catch(() => {}); throw error; }
}

export class DatasetStore {
  private factory: IDBFactory | undefined;
  private name: string;
  private opening: Promise<IDBDatabase> | null = null;
  constructor(factory: IDBFactory | undefined = globalThis.indexedDB, name = DATASET_DATABASE_NAME) { this.factory = factory; this.name = name; }

  private open(): Promise<IDBDatabase> {
    if (this.opening) return this.opening;
    if (!this.factory) return Promise.reject(new Error('IndexedDB no está disponible. Habilita el almacenamiento del navegador para usar Dataset Studio.'));
    this.opening = new Promise<IDBDatabase>((resolve, reject) => {
      const opening = this.factory!.open(this.name, 1);
      let blocked = false;
      opening.onupgradeneeded = () => {
        const db = opening.result;
        db.createObjectStore('meta');
        db.createObjectStore('participants', { keyPath: 'id' });
        db.createObjectStore('signs', { keyPath: 'id' });
        const samples = db.createObjectStore('samples', { keyPath: 'sampleId' });
        samples.createIndex('participantId', 'participantId'); samples.createIndex('labelId', 'labelId');
        samples.createIndex('participantLabel', ['participantId', 'labelId']);
        samples.createIndex('repetition', ['participantId', 'labelId', 'repetition'], { unique: true });
        db.createObjectStore('sequences', { keyPath: 'sampleId' });
      };
      opening.onerror = () => reject(opening.error ?? new Error('No se pudo abrir IndexedDB.'));
      opening.onblocked = () => { blocked = true; reject(new Error('Otra pestaña está bloqueando la apertura del dataset. Ciérrala y vuelve a intentar.')); };
      opening.onsuccess = () => {
        const db = opening.result;
        if (blocked) { db.close(); return; }
        db.onversionchange = () => { db.close(); this.opening = null; };
        void transaction(db, ['meta', 'signs', 'participants'], 'readwrite', async tx => {
          const meta = tx.objectStore('meta');
          const existing = await request<DatasetMeta | undefined>(meta.get('dataset'));
          if (!existing) {
            const initial: DatasetMeta = { datasetId: `dataset-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), schemaVersion: 1,
              nextParticipantNumber: 1, captureConfiguration: structuredClone(CAPTURE_DEFAULTS), mediaPipeModel: structuredClone(MODEL_METADATA) };
            meta.put(initial, 'dataset');
            for (const sign of createDatasetCatalog()) tx.objectStore('signs').add(sign);
          } else {
            if (!Number.isInteger(existing.nextParticipantNumber)) {
              const participants = await request<DatasetParticipant[]>(tx.objectStore('participants').getAll());
              meta.put({ ...existing, nextParticipantNumber: Math.max(0, ...participants.map(person => Number(person.id.slice(1)))) + 1 }, 'dataset');
            }
            const signs = tx.objectStore('signs');
            for (const sign of catalogAdditions(await request<DatasetSign[]>(signs.getAll()))) signs.add(sign);
          }
        }).then(() => resolve(db), error => { db.close(); reject(error); });
      };
    }).catch(error => { this.opening = null; throw error; });
    return this.opening;
  }

  async snapshot(): Promise<DatasetSnapshot> {
    return transaction(await this.open(), ['meta', 'participants', 'signs', 'samples'], 'readonly', async tx => {
      const [meta, participants, signs, samples] = await Promise.all([
        request<DatasetMeta>(tx.objectStore('meta').get('dataset')), request<DatasetParticipant[]>(tx.objectStore('participants').getAll()),
        request<DatasetSign[]>(tx.objectStore('signs').getAll()), request<SampleSummary[]>(tx.objectStore('samples').getAll()),
      ]);
      return { meta, participants, signs, samples: samples.toSorted((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt) || b.repetition - a.repetition) };
    });
  }

  async createParticipant(): Promise<DatasetParticipant> {
    return transaction(await this.open(), ['participants', 'meta'], 'readwrite', async tx => {
      const store = tx.objectStore('participants');
      const meta = await request<DatasetMeta>(tx.objectStore('meta').get('dataset'));
      const next = meta.nextParticipantNumber;
      if (next > 999999) throw new Error('Se alcanzó el límite de identificadores.');
      const participant: DatasetParticipant = { id: `P${String(next).padStart(3, '0')}`, createdAt: new Date().toISOString(), consentedAt: null, consentVersion: null };
      store.add(participant); tx.objectStore('meta').put({ ...meta, nextParticipantNumber: next + 1 }, 'dataset'); return participant;
    });
  }

  async consentParticipant(id: string): Promise<DatasetParticipant> {
    return transaction(await this.open(), ['participants'], 'readwrite', async tx => {
      const store = tx.objectStore('participants');
      const participant = await request<DatasetParticipant | undefined>(store.get(id));
      if (!participant) throw new Error('El participante ya no existe.');
      const updated = { ...participant, consentedAt: new Date().toISOString(), consentVersion: CONSENT_VERSION };
      store.put(updated); return updated;
    });
  }

  async saveSign(sign: DatasetSign) {
    validateSign(sign);
    return transaction(await this.open(), ['signs'], 'readwrite', async tx => {
      const store = tx.objectStore('signs');
      if (!await request(store.get(sign.id))) throw new Error('El espacio de la seña no existe.');
      store.put(structuredClone(sign));
    });
  }

  async saveSample(sample: DatasetSample): Promise<DatasetSample> {
    validateDatasetSample(sample);
    return transaction(await this.open(), ['samples', 'sequences', 'participants', 'signs'], 'readwrite', async tx => {
      const participant = await request<DatasetParticipant | undefined>(tx.objectStore('participants').get(sample.participantId));
      if (!participant?.consentedAt || participant.consentVersion !== CONSENT_VERSION) throw new Error('Falta consentimiento del participante.');
      if (!await request(tx.objectStore('signs').get(sample.labelId))) throw new Error('La etiqueta no existe en este dataset.');
      const samples = tx.objectStore('samples');
      if (await request(samples.get(sample.sampleId))) throw new Error('Esta muestra ya está guardada.');
      const previous = await request<SampleSummary[]>(samples.index('participantLabel').getAll([sample.participantId, sample.labelId]));
      const saved = { ...structuredClone(sample), repetition: Math.max(0, ...previous.map(item => item.repetition)) + 1, reviewStatus: 'pending' as const };
      delete saved.operatorReviewed;
      const { frames, ...summary } = saved;
      samples.add(summary); tx.objectStore('sequences').add({ sampleId: saved.sampleId, frames });
      return saved;
    });
  }

  async getSample(id: string): Promise<DatasetSample> {
    return transaction(await this.open(), ['samples', 'sequences'], 'readonly', async tx => {
      const summary = await request<SampleSummary | undefined>(tx.objectStore('samples').get(id));
      const sequence = await request<{ frames: DatasetSample['frames'] } | undefined>(tx.objectStore('sequences').get(id));
      if (!summary || !sequence) throw new Error('No se encontró la muestra completa.');
      return { ...summary, frames: sequence.frames };
    });
  }

  async reviewSample(id: string, status: 'accepted' | 'rejected') {
    const result = await this.updateSampleReviews([id], status === 'accepted' ? 'accept' : 'reject');
    if (result.missingIds.length) throw new Error('La muestra ya no existe.');
    if (result.insufficient) throw new Error('Una muestra de calidad insuficiente debe repetirse o mantenerse pendiente.');
  }

  async updateSampleReviews(ids: readonly string[], action: SampleReviewAction) {
    return transaction(await this.open(), ['samples'], 'readwrite', async tx => {
      const store = tx.objectStore('samples');
      const updated: SampleSummary[] = [];
      const missingIds: string[] = [];
      let insufficient = 0, unchanged = 0;
      const uniqueIds = [...new Set(ids)];
      const samples = await Promise.all(uniqueIds.map(id => request<SampleSummary | undefined>(store.get(id))));
      for (const [index, sample] of samples.entries()) {
        if (!sample) { missingIds.push(uniqueIds[index]); continue; }
        if (action === 'accept' && !sample.qualityMetrics.sufficient) { insufficient++; continue; }
        const wasReviewed = isOperatorReviewed(sample);
        const operatorReviewed = action === 'mark' ? true : action === 'unmark' ? false : wasReviewed;
        const reviewStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : sample.reviewStatus;
        if (operatorReviewed === wasReviewed && reviewStatus === sample.reviewStatus) { unchanged++; continue; }
        const next = { ...sample, operatorReviewed, reviewStatus };
        store.put(next);
        updated.push(next);
      }
      return { updated, missingIds, insufficient, unchanged };
    });
  }

  async deleteSample(id: string) {
    return transaction(await this.open(), ['samples', 'sequences'], 'readwrite', async tx => {
      tx.objectStore('samples').delete(id); tx.objectStore('sequences').delete(id);
    });
  }

  async deleteParticipant(id: string) {
    return transaction(await this.open(), ['participants', 'samples', 'sequences'], 'readwrite', async tx => {
      const samples = tx.objectStore('samples');
      const keys = await request(samples.index('participantId').getAllKeys(id));
      for (const key of keys) { samples.delete(key); tx.objectStore('sequences').delete(key); }
      tx.objectStore('participants').delete(id);
    });
  }

  async document(exportType: DatasetDocument['exportType'], exportedAt = new Date().toISOString()): Promise<DatasetDocument> {
    return transaction(await this.open(), STORES, 'readonly', async tx => {
      const [meta, participants, signs, summaries, sequences] = await Promise.all([
        request<DatasetMeta>(tx.objectStore('meta').get('dataset')), request<DatasetParticipant[]>(tx.objectStore('participants').getAll()),
        request<DatasetSign[]>(tx.objectStore('signs').getAll()), request<SampleSummary[]>(tx.objectStore('samples').getAll()),
        request<{ sampleId: string; frames: DatasetSample['frames'] }[]>(tx.objectStore('sequences').getAll()),
      ]);
      const byId = new Map(sequences.map(sequence => [sequence.sampleId, sequence.frames]));
      const samples = summaries.map(summary => {
        const frames = byId.get(summary.sampleId);
        if (!frames) throw new Error('Falta una secuencia; no se exportará un respaldo incompleto.');
        return { ...summary, frames };
      });
      return { ...meta, exportType, exportedAt, collectedAt: samples.map(sample => sample.recordedAt).sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null,
        participants, signs, samples };
    });
  }

  async replace(document: DatasetDocument) {
    validateDatasetDocument(document); // Validate everything before opening a write transaction.
    return transaction(await this.open(), STORES, 'readwrite', async tx => {
      for (const name of STORES) tx.objectStore(name).clear();
      const { datasetId, createdAt, schemaVersion, nextParticipantNumber, captureConfiguration, mediaPipeModel } = document;
      tx.objectStore('meta').put({ datasetId, createdAt, schemaVersion, nextParticipantNumber, captureConfiguration, mediaPipeModel }, 'dataset');
      for (const person of document.participants) tx.objectStore('participants').add(person);
      for (const sign of [...document.signs, ...catalogAdditions(document.signs)]) tx.objectStore('signs').add(sign);
      for (const sample of document.samples) {
        const { frames, ...summary } = sample;
        tx.objectStore('samples').add(summary); tx.objectStore('sequences').add({ sampleId: sample.sampleId, frames });
      }
    });
  }

  async close() { const db = await this.opening?.catch(() => null); db?.close(); this.opening = null; }
}

export function datasetStatistics(snapshot: DatasetSnapshot) {
  return { participants: snapshot.participants.length, configuredSigns: snapshot.signs.filter(sign => sign.category === 'lsp' && signConfigurationErrors(sign).length === 0).length,
    samples: snapshot.samples.length, pending: snapshot.samples.filter(sample => !isOperatorReviewed(sample)).length,
    bySign: Object.fromEntries(snapshot.signs.map(sign => [sign.id, snapshot.samples.filter(sample => sample.labelId === sign.id).length])),
    byParticipant: Object.fromEntries(snapshot.participants.map(person => [person.id, snapshot.samples.filter(sample => sample.participantId === person.id).length])) };
}
