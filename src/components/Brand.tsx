import { HandHeart } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label="SeñaVerse, ir al inicio">
      <span className="brand-icon"><HandHeart size={24} strokeWidth={2.1} aria-hidden="true" /></span>
      {!compact && <span>Seña<span className="brand-accent">Verse</span></span>}
    </Link>
  );
}
