import { createProfileExport, type StudentProfile } from './profile.ts';
import type { StudentProgress } from './progress.ts';
import { PHOTO_SIZE, validateStoredPhoto } from './profilePhoto.ts';

export async function createProfileBackup(profile: StudentProfile, progress: StudentProgress, photo: Blob | null, exportedAt = new Date().toISOString()) {
  if (profile.photoId && !photo) throw new Error('No se pudo recuperar tu foto. Elige otro avatar o vuelve a guardarla antes de exportar.');
  const portableProfile = { version: profile.version, displayName: profile.displayName, bio: profile.bio, avatarId: profile.avatarId };
  const data = createProfileExport(portableProfile, progress, exportedAt);
  let avatar: { kind: 'preset'; id: string } | { kind: 'photo'; mimeType: string; width: number; height: number; dataUrl: string } = { kind: 'preset', id: profile.avatarId };
  if (profile.photoId && photo) {
    await validateStoredPhoto(photo);
    const mimeType = photo.type;
    const bytes = new Uint8Array(await photo.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    avatar = { kind: 'photo', mimeType, width: PHOTO_SIZE, height: PHOTO_SIZE, dataUrl: `data:${mimeType};base64,${btoa(binary)}` };
  }
  return { ...data, schemaVersion: 2, profile: { ...data.profile, avatar } };
}
