import { Link } from 'react-router-dom';
import { HomeVisual } from './HomeVisual';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label="SeñaVerse, ir al inicio">
      <span className="brand-icon"><HomeVisual name="brand" /></span>
      {!compact && <span>Seña<span className="brand-accent">Verse</span></span>}
    </Link>
  );
}
