import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PracticePageHeading({ title, description }: { title: string; description: string }) {
  return (
    <>
      <nav className="lesson-breadcrumb practice-breadcrumb" aria-label="Ruta de práctica">
        <Link to="/camara"><ArrowLeft size={16} aria-hidden="true" /> Centro de práctica</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{title}</span>
      </nav>
      <header className="practice-page-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
    </>
  );
}
