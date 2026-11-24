import { useState } from 'react';
import type { QuizMedia } from '../data/educationalMedia';
import { getEducationalSign } from '../data/library';
import { EducationalVisual } from './SignMediaViewer';
import './QuizSignMedia.css';

export function QuizSignMedia({ media }: { media: QuizMedia }) {
  const [failed, setFailed] = useState(false);
  const source = getEducationalSign(media.signId)?.media;
  const { kind, description } = media;

  if (!source || failed) return <span role="status">Recurso no disponible. {description}</span>;
  if (kind === 'diagram' && source.quizVisual) return <span className="quiz-sign-diagram">
    <EducationalVisual visual={{ ...source.quizVisual, diagram: { ...source.quizVisual.diagram, description } }} />
  </span>;

  const resource = kind === 'photo' ? source.visual : source.video;
  if (resource.availability !== 'available' || (resource.kind !== 'image' && resource.kind !== 'video')) return null;
  const { url, type } = resource.location;
  const src = type === 'local' ? import.meta.env.BASE_URL + url.slice(1) : url;
  return resource.kind === 'image'
    ? <img className="quiz-sign-image" src={src} alt={description} width={resource.width} height={resource.height}
      loading="lazy" decoding="async" onError={() => setFailed(true)} />
    : <video className="quiz-sign-video" src={src} aria-label={description} controls playsInline preload="metadata"
      onError={() => setFailed(true)} />;
}
