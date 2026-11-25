import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { BookOpen, Film, Maximize, RotateCcw, X } from 'lucide-react';
import type { EducationalVideo, EducationalVisual as Visual, IndividualImage, MediaLink, MediaSource, Usage } from '../data/educationalMedia';
import type { LibraryEntry } from '../data/library';
import { SignHandDiagram } from './SignHandDiagram';
import { ExternalReference } from './ExternalReference';
import './SignMediaViewer.css';

export function MediaSourceLink({ reference }: { reference: MediaLink }) {
  return <ExternalReference className="practice-reference-link" href={reference.url}>
    <BookOpen size={18} aria-hidden="true" /> {reference.title} (nueva pestaña)
  </ExternalReference>;
}

function localOrExternal({ type, url }: { type: 'local' | 'external'; url: string }) {
  return type === 'local' ? import.meta.env.BASE_URL + url.slice(1) : url;
}

function MediaCredit({ source, usage }: { source: MediaSource; usage: Usage }) {
  return <p className="sign-media-credit">{source.publisher} · {source.url
    ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
    : source.title}{source.page && ` · p. ${source.page}`}. {usage.label}.</p>;
}

export function EducationalVisual({ visual, decorative = false, thumbnail = false, onUnavailable }: {
  visual: Visual; decorative?: boolean; thumbnail?: boolean; onUnavailable?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="sign-media-error" role="status">La imagen no se pudo cargar.</span>;
  if (visual.kind === 'diagram') return <span className="sign-media-diagram" aria-hidden={decorative || undefined}>
    <SignHandDiagram diagram={visual.diagram} />
  </span>;

  const frames = visual.kind === 'sequence' ? visual.frames
    : [thumbnail && visual.thumbnail ? { ...visual.thumbnail, alt: visual.alt } : visual];
  return <span className={visual.kind === 'sequence' ? 'sign-media-frames' : 'sign-media-image'}>
    {frames.map((frame, index) => <span className="sign-media-frame" key={frame.location.url + index}>
      <img src={localOrExternal(frame.location)} width={frame.width} height={frame.height}
        alt={decorative ? '' : frame.alt} loading="lazy" decoding="async"
        onError={() => { setFailed(true); onUnavailable?.(); }} />
      {visual.kind === 'sequence' && !decorative && <span>Paso {index + 1}</span>}
    </span>)}
  </span>;
}

function MediaPreview({ visual, word }: { visual: Visual; word: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return <div className="sign-media-preview">
    <EducationalVisual visual={visual} onUnavailable={() => setFailed(true)} />
    {!failed && <button type="button" ref={opener} className="button button-outline sign-media-open"
      onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
      <Maximize size={16} aria-hidden="true" /> Ampliar {visual.kind === 'sequence' ? 'secuencia' : 'imagen'}
    </button>}
    <dialog className="sign-media-dialog" ref={dialog} aria-labelledby={titleId}
      onClose={() => { setOpen(false); opener.current?.focus(); }}
      onCancel={event => { event.stopPropagation(); event.preventDefault(); dialog.current?.close(); }}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="sign-media-dialog-body">
        <header><h3 id={titleId}>Referencia de {word}</h3>
          <button type="button" className="button button-outline" autoFocus onClick={() => dialog.current?.close()}
            aria-label="Cerrar ampliación"><X size={20} aria-hidden="true" /></button>
        </header>
        {open && <EducationalVisual visual={visual} />}
        <MediaCredit source={visual.source} usage={visual.usage} />
      </div>
    </dialog>
  </div>;
}

export function VideoPlayer({ resource, poster, showCredit = false, quizDescription }: {
  resource: EducationalVideo; poster?: IndividualImage['location']; showCredit?: boolean; quizDescription?: string;
}) {
  const [requested, setRequested] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playNotice, setPlayNotice] = useState('');
  const [rate, setRate] = useState(1);
  const player = useRef<HTMLVideoElement>(null);
  const attach = useCallback((video: HTMLVideoElement | null) => {
    player.current = video;
    if (video) return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      player.current = null;
    };
  }, []);
  const rateId = useId();
  useEffect(() => {
    if (requested && !failed) player.current?.focus();
  }, [requested, failed]);

  function repeat() {
    const video = player.current;
    if (!video || video.readyState === 0) return;
    video.currentTime = 0;
    void video.play().catch(() => setPlayNotice('Usa el control de reproducción para volver a iniciar el video.'));
  }

  if (!requested) return <button className="button button-outline sign-media-load" type="button"
    aria-label={quizDescription && `Cargar video. ${quizDescription}`} onClick={() => setRequested(true)}>
    <Film size={17} aria-hidden="true" /> Cargar video{resource.location.type === 'external' && ' externo'}
  </button>;

  return <div className="sign-media-player">
    {failed ? <div className="sign-media-actions">
      <p role="status">El video no se pudo cargar. Puedes reintentar o consultar la referencia de la seña.</p>
      <button type="button" className="button button-outline" onClick={() => {
        setRequested(false);
        setFailed(false);
        setRate(1);
        setPlayNotice('');
      }}>Volver a intentar</button>
    </div> : <>
      <video controls playsInline preload="metadata" tabIndex={0} ref={attach} src={localOrExternal(resource.location)}
        poster={poster && localOrExternal(poster)}
        className={quizDescription ? 'quiz-sign-video' : undefined}
        controlsList={quizDescription ? 'nodownload' : undefined}
        aria-label={quizDescription ?? resource.alt} onError={() => setFailed(true)} onPlay={() => setPlayNotice('')}>
        {resource.captionsUrl && <track kind="captions" src={localOrExternal({ type: 'local', url: resource.captionsUrl })}
          srcLang="es" label="Español" default />}
        Tu navegador no admite este video.
      </video>
      <div className="sign-media-actions">
        <button type="button" className="button button-outline" onClick={repeat}>
          <RotateCcw size={16} aria-hidden="true" /> Repetir video
        </button>
        <label htmlFor={rateId}>Velocidad <select id={rateId} value={rate} onChange={event => {
          const nextRate = Number(event.target.value);
          if (player.current) player.current.playbackRate = nextRate;
          setRate(nextRate);
        }}>
          <option value={0.5}>0,5×</option><option value={0.75}>0,75×</option><option value={1}>1×</option>
        </select></label>
      </div>
      {playNotice && <p role="status">{playNotice}</p>}
    </>}
    {showCredit && <MediaCredit source={resource.source} usage={resource.usage} />}
  </div>;
}

export function SignMediaViewer({ sign, instruction = sign.instructions, showDocumentLink = true, compact = false }: {
  sign: LibraryEntry; instruction?: string; showDocumentLink?: boolean; compact?: boolean;
}) {
  const { visual, video, document } = sign.media;
  const photo = visual.kind === 'image' ? visual : undefined;
  const needsReview = [sign, visual, video, document].some(resource =>
    resource?.validation === 'pending' && (!('availability' in resource) || resource.availability === 'available'));
  return <div className={`sign-media${compact ? ' sign-media-compact' : ''}`} data-sign={sign.id}>
    {visual.availability === 'available' && <MediaPreview key={visual.id} visual={visual} word={sign.word} />}
    {video.availability === 'available' && <VideoPlayer key={video.id} resource={video} poster={photo?.location}
      showCredit={visual.availability !== 'available' || visual.kind === 'diagram' || visual.source !== video.source} />}
    {visual.availability === 'available' && visual.kind !== 'diagram' && <MediaCredit source={visual.source} usage={visual.usage} />}
    {instruction && <p>{instruction}</p>}
    {document ? <div className="sign-media-document">
      <p>{document.locator}</p>
      {showDocumentLink && <MediaSourceLink reference={document.link} />}
      {showDocumentLink && <p className="sign-media-credit">
        {document.source.publisher}{document.source.page && ` · p. ${document.source.page}`} · {document.usage.url
          ? <a href={document.usage.url} target="_blank" rel="noopener noreferrer">{document.usage.label}</a> : document.usage.label}.
      </p>}
    </div> : visual.availability === 'pending' && video.availability === 'pending' &&
      <p className="sign-media-credit">Referencia visual pendiente de incorporación.</p>}
    {video.availability === 'pending' && !compact && <p className="sign-media-credit">Video demostrativo pendiente.</p>}
    {needsReview && (showDocumentLink || !compact || photo) && <p className="sign-media-credit">Validación lingüística pendiente.</p>}
  </div>;
}
