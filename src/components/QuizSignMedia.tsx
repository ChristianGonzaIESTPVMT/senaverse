import { useState } from 'react';
import type { QuizMedia } from '../data/educationalMedia';
import { getEducationalSign } from '../data/library';
import { EducationalVisual, VideoPlayer } from './SignMediaViewer';
import './QuizSignMedia.css';

export function QuizSignMedia({ media, thumbnail = false }: { media: QuizMedia; thumbnail?: boolean }) {
  const [failed, setFailed] = useState(false);
  const source = getEducationalSign(media.signId)?.media;
  const { kind, description } = media;

  if (!source || failed) return <span role="status">Recurso no disponible. {description}</span>;
  if (kind === 'diagram' && source.quizVisual) return <span className="quiz-sign-diagram">
    <EducationalVisual visual={{ ...source.quizVisual, diagram: { ...source.quizVisual.diagram, description } }} />
  </span>;

  const resource = kind === 'photo' ? source.visual : source.video;
  if (resource.availability !== 'available' || (resource.kind !== 'image' && resource.kind !== 'video')) return null;
  if (resource.kind === 'video') return <VideoPlayer key={resource.id} resource={resource} quizDescription={description} />;
  const image = thumbnail ? resource.thumbnail ?? resource : resource;
  const { url, type } = image.location;
  const src = type === 'local' ? import.meta.env.BASE_URL + url.slice(1) : url;
  return <img className="quiz-sign-image" src={src} alt={description} width={image.width} height={image.height}
    loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
