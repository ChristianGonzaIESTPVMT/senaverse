import { restoreProgress, summarizeProgress, type StudentProgress } from './progress.ts';
import { getEducationalSign, normalizeLibrarySignIds } from './library.ts';

export const PROFILE_KEY = 'senaverse-student-profile-v1';
export const LEGACY_FAVORITES_KEY = 'senaverse-library-saved-v1';
export const PROFILE_NAME_LIMIT = 40;
export const PROFILE_BIO_LIMIT = 180;

export const profileAvatars = [
  { id: 'hand', label: 'Saludo' },
  { id: 'smile', label: 'Sonrisa' },
  { id: 'cat', label: 'Gato' },
  { id: 'bird', label: 'Colibrí' },
  { id: 'sprout', label: 'Brote' },
  { id: 'rocket', label: 'Cohete' },
] as const;

export type AvatarId = typeof profileAvatars[number]['id'];
export type PersonalInfo = { displayName: string; bio: string };
export type PersonalInfoErrors = Partial<Record<keyof PersonalInfo, string>>;
export type StudentProfile = PersonalInfo & { version: 1; avatarId: AvatarId; photoId?: string; favoriteSignIds?: string[] };

export const isPhotoId = (value: unknown): value is string => typeof value === 'string' && /^photo-[a-zA-Z0-9-]{8,80}$/.test(value);

export const defaultProfile = (): StudentProfile => ({ version: 1, displayName: 'Estudiante', bio: '', avatarId: 'hand' });

export function isAvatarId(value: unknown): value is AvatarId {
  return profileAvatars.some(avatar => avatar.id === value);
}

function cleanText(value: string) {
  return value.replace(/\s+/gu, ' ').trim();
}

export function validatePersonalInfo(input: PersonalInfo) {
  const value = { displayName: cleanText(input.displayName), bio: cleanText(input.bio) };
  const errors: PersonalInfoErrors = {};
  if (!value.displayName) errors.displayName = 'Escribe un nombre visible.';
  else if (value.displayName.length > PROFILE_NAME_LIMIT) errors.displayName = `El nombre puede tener hasta ${PROFILE_NAME_LIMIT} caracteres.`;
  if (value.bio.length > PROFILE_BIO_LIMIT) errors.bio = `La biografía puede tener hasta ${PROFILE_BIO_LIMIT} caracteres.`;
  return { value, errors };
}

function readLegacyFavorites(stored: string | null) {
  try {
    const value: unknown = JSON.parse(stored ?? 'null');
    if (Array.isArray(value)) return normalizeLibrarySignIds(value);
  } catch { /* Unreadable bookmarks have no effect on profile recovery. */ }
}

/** Only known fields from the supported schema enter the shared profile. */
export function restoreProfile(stored: string | null, legacyFavorites: string | null = null): StudentProfile {
  const migrated = readLegacyFavorites(legacyFavorites);
  const fallback = { ...defaultProfile(), ...(migrated && { favoriteSignIds: migrated }) };
  try {
    const parsed: unknown = JSON.parse(stored ?? 'null');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !('version' in parsed) || parsed.version !== 1) return fallback;
    const source = parsed as Record<string, unknown>;
    const { value, errors } = validatePersonalInfo({
      displayName: typeof source.displayName === 'string' ? source.displayName : '',
      bio: typeof source.bio === 'string' ? source.bio : '',
    });
    return {
      version: 1,
      displayName: errors.displayName ? fallback.displayName : value.displayName,
      bio: errors.bio ? fallback.bio : value.bio,
      avatarId: isAvatarId(source.avatarId) ? source.avatarId : fallback.avatarId,
      ...(isPhotoId(source.photoId) ? { photoId: source.photoId } : {}),
      ...(Array.isArray(source.favoriteSignIds) ? { favoriteSignIds: normalizeLibrarySignIds(source.favoriteSignIds) }
        : migrated ? { favoriteSignIds: migrated } : {}),
    };
  } catch { return fallback; }
}

export function toggleFavoriteSign(profile: StudentProfile, id: string): StudentProfile {
  const entry = getEducationalSign(id);
  if (!entry) return profile;
  const current = profile.favoriteSignIds ?? [];
  const favoriteSignIds = current.includes(entry.id) ? current.filter(item => item !== entry.id) : [...current, entry.id];
  return { ...profile, favoriteSignIds };
}

export function createProfileExport(profile: StudentProfile, progress: StudentProgress, exportedAt = new Date().toISOString()) {
  const validatedProgress = restoreProgress(JSON.stringify(progress));
  const summary = summarizeProgress(validatedProgress);
  return {
    schemaVersion: 1,
    exportedAt,
    profile: restoreProfile(JSON.stringify(profile)),
    progress: validatedProgress,
    progressSummary: {
      xp: summary.xp,
      completedLessons: summary.completed.length,
      achievements: summary.achievements.filter(achievement => achievement.obtained).map(({ id, name }) => ({ id, name })),
    },
  };
}
