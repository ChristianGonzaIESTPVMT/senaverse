import { isPhotoId, PROFILE_KEY, restoreProfile, type StudentProfile } from './profile.ts';
import { validateStoredPhoto } from './profilePhoto.ts';

export const PHOTO_DB_NAME = 'senaverse-profile-photos';
const STORE = 'photos';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento local de fotos.'));
    request.onblocked = () => reject(new Error('Cierra las otras pestañas de SeñaVerse e inténtalo de nuevo.'));
  });
}

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = operation(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error('No se pudo guardar el cambio de foto. Comprueba el almacenamiento del navegador.')); };
  });
}

export async function readProfilePhoto(id: string): Promise<Blob | null> {
  if (!isPhotoId(id)) return null;
  const value: unknown = await transaction('readonly', store => store.get(id));
  const blob = value instanceof Blob ? value : value && typeof value === 'object' && 'blob' in value ? value.blob : null;
  if (!(blob instanceof Blob)) return null;
  try { await validateStoredPhoto(blob); return blob; }
  catch { return null; }
}

export async function writeProfilePhoto(id: string, blob: Blob) {
  if (!isPhotoId(id)) throw new Error('Referencia de foto inválida.');
  await validateStoredPhoto(blob);
  await transaction('readwrite', store => store.put({ blob, createdAt: Date.now() }, id));
}

export async function deleteProfilePhoto(id: string) {
  if (isPhotoId(id)) await transaction('readwrite', store => store.delete(id));
}

/** Commit the reference only after its Blob exists; roll back a failed reference write. */
export async function commitProfilePhoto(profile: StudentProfile, blob: Blob, storage: Pick<Storage, 'setItem'> = localStorage) {
  const id = `photo-${crypto.randomUUID()}`;
  await writeProfilePhoto(id, blob);
  const next = { ...profile, photoId: id };
  try { storage.setItem(PROFILE_KEY, JSON.stringify(next)); }
  catch {
    await deleteProfilePhoto(id);
    throw new Error('No se pudo guardar la referencia de la foto. Habilita el almacenamiento local e inténtalo de nuevo.');
  }
  return next;
}

/** Only this dedicated database is cleaned; Dataset Studio is never opened. */
export async function cleanProfilePhotos(storage: Pick<Storage, 'getItem'> = localStorage) {
  const keys = await transaction('readonly', store => store.getAllKeys());
  for (const key of keys) {
    const active = restoreProfile(storage.getItem(PROFILE_KEY)).photoId;
    const entry = await transaction('readonly', store => store.get(key));
    // A grace period protects a Blob being committed in another tab before its reference is written.
    const recent = entry && typeof entry.createdAt === 'number' && Date.now() - entry.createdAt < 300_000;
    if (typeof key === 'string' && key !== active && !recent) await deleteProfilePhoto(key);
  }
}
