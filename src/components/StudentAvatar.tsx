import { Bird, Cat, Hand, Rocket, Smile, Sprout } from 'lucide-react';
import type { AvatarId } from '../data/profile';
import { useState } from 'react';
import './StudentAvatar.css';

const icons = { hand: Hand, smile: Smile, cat: Cat, bird: Bird, sprout: Sprout, rocket: Rocket };

export function StudentAvatar({ avatarId, photoUrl, className = '' }: { avatarId: AvatarId; photoUrl?: string; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const Icon = icons[avatarId];
  const safePhoto = photoUrl?.startsWith('blob:') && photoUrl !== failedUrl;
  return <span className={`student-avatar student-avatar-${avatarId} ${className}`} aria-hidden="true">{safePhoto ? <img src={photoUrl} alt="" onError={() => setFailedUrl(photoUrl)} /> : <Icon strokeWidth={1.7} />}</span>;
}
