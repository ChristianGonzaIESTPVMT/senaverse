import { ArrowLeft, Check, CirclePlay, Hand, HeartHandshake, UserRound, X, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LibraryEntry } from '../data/library';

const signIcons: Record<string, LucideIcon> = {
  hola: Hand,
  gracias: HeartHandshake,
  adios: Hand,
  si: Check,
  no: X,
};

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

export function PracticeSignArt({ sign }: { sign: LibraryEntry }) {
  const Icon = signIcons[sign.id] ?? Hand;

  return (
    <span className={`practice-sign-art practice-sign-art-${sign.id}`} aria-hidden="true">
      {sign.thumbnailSrc ? <img src={sign.thumbnailSrc} alt="" loading="lazy" /> : <>
        <UserRound className="practice-sign-person" strokeWidth={1.5} />
        <Icon className="practice-sign-gesture" strokeWidth={1.8} />
      </>}
    </span>
  );
}

export function PracticeSignDemo({ sign }: { sign?: LibraryEntry }) {
  return (
    <section className="practice-panel practice-demo-panel" aria-labelledby="practice-demo-title">
      <div className="practice-panel-heading">
        <h2 id="practice-demo-title"><CirclePlay size={22} aria-hidden="true" /> Demostración visual</h2>
        {sign && <span className="practice-sign-label">{sign.word}</span>}
      </div>
      {sign?.videoSrc ? (
        <video className="practice-demo-video" key={sign.id} controls playsInline preload="metadata" poster={sign.thumbnailSrc} aria-label={`Demostración de ${sign.word} en LSP`}>
          <source src={sign.videoSrc} />
          {sign.captionsSrc && <track kind="captions" src={sign.captionsSrc} srcLang="es" label="Español" default />}
          Tu navegador no admite la reproducción de este video.
        </video>
      ) : (
        <div className="practice-demo-placeholder">
          <CirclePlay size={47} strokeWidth={1.5} aria-hidden="true" />
          <strong>{sign ? `Demostración de «${sign.word}»` : 'Elige una seña para comenzar'}</strong>
          <p>{sign ? 'El video demostrativo se incorporará próximamente.' : 'Selecciona una seña del catálogo de demostración.'}</p>
        </div>
      )}
      {sign && <p className="practice-demo-meaning">{sign.meaning}</p>}
    </section>
  );
}
