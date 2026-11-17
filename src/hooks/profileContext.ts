import { createContext, useContext } from 'react';
import type { AvatarId, PersonalInfo, PersonalInfoErrors, StudentProfile } from '../data/profile';

export const ProfileContext = createContext<{
  profile: StudentProfile;
  storageAvailable: boolean;
  photoUrl?: string;
  photoLoading: boolean;
  savePersonalInfo: (input: PersonalInfo) => PersonalInfoErrors;
  saveAvatar: (avatarId: AvatarId) => Promise<void>;
  savePhoto: (blob: Blob) => Promise<void>;
  resetProfile: () => Promise<void>;
} | null>(null);

export function useStudentProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useStudentProfile requiere StudentProfileProvider.');
  return context;
}
