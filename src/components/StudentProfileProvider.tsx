import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { PROFILE_KEY, defaultProfile, isAvatarId, restoreProfile, validatePersonalInfo, type AvatarId, type PersonalInfo, type StudentProfile } from '../data/profile';
import { ProfileContext } from '../hooks/profileContext';
import { cleanProfilePhotos, commitProfilePhoto, deleteProfilePhoto, readProfilePhoto } from '../data/profilePhotoStore';

export function StudentProfileProvider({ children }: { children: ReactNode }) {
  const [{ profile, storageAvailable }, setState] = useState(() => {
    try { return { profile: restoreProfile(localStorage.getItem(PROFILE_KEY)), storageAvailable: true }; }
    catch { return { profile: defaultProfile(), storageAvailable: false }; }
  });
  const currentProfile = useRef(profile);
  const photoOperation = useRef(false);
  const [photo, setPhoto] = useState<{ id: string; url?: string } | null>(null);

  useEffect(() => {
    let active = true;
    let url: string | undefined;
    if (profile.photoId) {
      const id = profile.photoId;
      void readProfilePhoto(id).then(async blob => {
        if (active) { url = blob ? URL.createObjectURL(blob) : undefined; setPhoto({ id, url }); }
      }).catch(() => { if (active) setPhoto({ id }); });
    }
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [profile.photoId]);
  useEffect(() => { void cleanProfilePhotos().catch(() => { /* Cleanup is retried at the next startup. */ }); }, []);

  const persist = useCallback((next: StudentProfile, required = false) => {
    let stored = true;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); }
    catch {
      if (required) throw new Error('No se pudo guardar el cambio. Comprueba el almacenamiento local del navegador.');
      stored = false;
    }
    currentProfile.current = next;
    setState({ profile: next, storageAvailable: stored });
  }, []);

  useEffect(() => {
    const syncProfile = (event: StorageEvent) => {
      if (event.key !== PROFILE_KEY && event.key !== null) return;
      try {
        if (event.storageArea !== localStorage) return;
        const next = restoreProfile(event.newValue);
        currentProfile.current = next;
        setState({ profile: next, storageAvailable: true });
      } catch { setState(previous => ({ ...previous, storageAvailable: false })); }
    };
    window.addEventListener('storage', syncProfile);
    return () => window.removeEventListener('storage', syncProfile);
  }, []);

  const savePersonalInfo = useCallback((input: PersonalInfo) => {
    const { value, errors } = validatePersonalInfo(input);
    if (Object.keys(errors).length === 0) persist({ ...currentProfile.current, ...value });
    return errors;
  }, [persist]);

  const saveAvatar = useCallback(async (avatarId: AvatarId) => {
    if (!isAvatarId(avatarId)) return;
    if (photoOperation.current) throw new Error('Espera a que termine el cambio de foto.');
    const { photoId, ...previous } = currentProfile.current;
    persist({ ...previous, avatarId }, !!photoId);
    if (photoId) await deleteProfilePhoto(photoId);
  }, [persist]);

  const savePhoto = useCallback(async (blob: Blob) => {
    if (photoOperation.current) throw new Error('Espera a que termine el cambio de foto.');
    photoOperation.current = true;
    try {
      const previousId = currentProfile.current.photoId;
      const next = await commitProfilePhoto(currentProfile.current, blob);
      currentProfile.current = next;
      setState({ profile: next, storageAvailable: true });
      if (previousId) await deleteProfilePhoto(previousId);
    } finally { photoOperation.current = false; }
  }, []);

  const resetProfile = useCallback(async () => {
    if (photoOperation.current) throw new Error('Espera a que termine el cambio de foto.');
    const previousId = currentProfile.current.photoId;
    persist(defaultProfile(), !!previousId);
    if (previousId) await deleteProfilePhoto(previousId);
  }, [persist]);

  const photoUrl = photo?.id === profile.photoId ? photo?.url : undefined;
  const photoLoading = !!profile.photoId && photo?.id !== profile.photoId;
  return <ProfileContext value={{ profile, storageAvailable, photoUrl, photoLoading, savePersonalInfo, saveAvatar, savePhoto, resetProfile }}>{children}</ProfileContext>;
}
