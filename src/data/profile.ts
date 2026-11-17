import { restoreProgress, summarizeProgress, type StudentProgress } from './progress.ts';

export const PROFILE_KEY = 'senaverse-student-profile-v1';
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
export type StudentProfile = PersonalInfo & { version: 1; avatarId: AvatarId; photoId?: string };

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

/** Only known fields from the supported schema enter the shared profile. */
export function restoreProfile(stored: string | null): StudentProfile {
  const fallback = defaultProfile();
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
    };
  } catch { return fallback; }
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
