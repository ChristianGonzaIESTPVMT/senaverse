import { useId, useState } from 'react';
import { ArrowRight, Check, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LessonActivity as Activity } from '../data/curriculum';
import { gradeAnswers } from '../data/lessonPlan';
import { getEducationalSign, getLibrarySignPath } from '../data/library';
import { getQuizVisual } from '../data/educationalMedia';
import { EducationalVisual } from './SignMediaViewer';
import { QuizSignMedia } from './QuizSignMedia';

const activityTitles = { choice: 'Comprueba lo aprendido', identify: 'Identifica la expresión', association: 'Relaciona los conceptos', order: 'Ordena los pasos' };

export function LessonAnswerFields({ activity, responses, onResponse, checked, disabled, motion = false }: {
  activity: Activity; responses: Record<string, string>; onResponse: (id: string, value: string) => void;
  checked: boolean; disabled?: boolean; motion?: boolean;
}) {
  const name = useId();
  const sign = activity.diagramId ? getEducationalSign(activity.diagramId) : undefined;
  const visual = sign && getQuizVisual(sign.media);
  const rows = activity.type === 'association' ? activity.pairs : activity.type === 'order'
    ? activity.order.map((answerId, index) => ({ id: String(index), label: `Paso ${index + 1}`, answerId, media: undefined })) : undefined;
  const hasVisualOptions = activity.options.some(option => option.media);
  const labelFor = (id: string) => activity.options.find(option => option.id === id)?.label;
  const choices = (activity.type === 'choice' || activity.type === 'identify') && activity.options.map((option, index) => {
    const selected = responses.choice === option.id;
    const feedback = checked && selected ? option.id === activity.correctId ? ' right' : ' wrong' : '';
    const label = <label className={`answer${selected ? ' selected' : ''}${feedback}`} key={option.id}>
      <input type="radio" name={name} value={option.id} checked={selected} onChange={() => onResponse('choice', option.id)} />
      {!option.media && <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>}{option.label}
      {feedback && <small className={motion ? 'lesson-answer-result' : undefined}>{motion && (feedback === ' right' ? <Check size={15} aria-hidden="true" /> : <Info size={15} aria-hidden="true" />)}{feedback === ' right' ? 'Correcta' : `Incorrecta. La respuesta correcta es «${labelFor(activity.correctId)}».`}</small>}
      {!option.media && checked && option.feedback && <small>{option.feedback}</small>}
    </label>;
    return option.media ? <div className="lesson-visual-option" key={option.id}>
      <QuizSignMedia media={option.media} />
      {label}
      {checked && option.feedback && <small>{option.feedback}</small>}
    </div> : label;
  });
  return <fieldset className="lesson-answer-fields" disabled={disabled}>
    <legend>{activity.question}</legend>
    {activity.type === 'order' && <small>Usa cada acción una sola vez.</small>}
    {visual && <div className="lesson-question-diagram"><EducationalVisual key={visual.id} visual={visual} /></div>}
    {activity.media && <QuizSignMedia key={activity.media.signId} media={activity.media} />}
    {rows?.map(pair => {
      const correct = responses[pair.id] === pair.answerId;
      const fieldId = `${name}-${pair.id}`;
      return <div className={`lesson-association-row${checked ? correct ? ' is-correct' : ' is-incorrect' : ''}`} key={pair.id}>
        <div><label htmlFor={fieldId}>{pair.label}</label>
          {checked && <small className={motion ? 'lesson-answer-result' : undefined} id={`${fieldId}-feedback`}>{motion && (correct ? <Check size={15} aria-hidden="true" /> : <Info size={15} aria-hidden="true" />)}{correct ? 'Correcta' : `Incorrecta. La respuesta correcta es «${labelFor(pair.answerId)}».`}</small>}
          {pair.media && <QuizSignMedia media={pair.media} />}
        </div>
        <select id={fieldId} aria-describedby={checked ? `${fieldId}-feedback` : undefined}
          value={responses[pair.id] ?? ''} onChange={event => onResponse(pair.id, event.target.value)}>
          <option value="">Elige una respuesta</option>
          {activity.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </div>;
    })}
    {hasVisualOptions ? <div className="lesson-visual-options">{choices}</div> : choices}
    {checked && activity.explanation && <p className="lesson-answer-explanation">{activity.explanation}</p>}
    {checked && activity.reviewSignIds && <div className="lesson-quiz-review" aria-label="Repasar material educativo">
      {activity.reviewSignIds.flatMap(id => {
        const entry = getEducationalSign(id);
        return entry ? [<Link key={id} to={getLibrarySignPath(id)}>Repasar {entry.word} en Biblioteca</Link>] : [];
      })}
    </div>}
  </fieldset>;
}

export function LessonActivity({ activity, onResult }: { activity: Activity; onResult?: (passed: boolean) => void }) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const result = gradeAnswers([{ id: 'activity', activity }], { activity: responses });
  const correct = !!result && result.score === result.total;

  function changeResponse(id: string, value: string) {
    setResponses(previous => ({ ...previous, [id]: value }));
    setChecked(false);
    onResult?.(false);
  }

  return (
    <section className="white-card lesson-article quiz">
      <span className="section-eyebrow">03 / PONTE A PRUEBA</span>
      <h2>{activityTitles[activity.type]}</h2>
      <LessonAnswerFields activity={activity} responses={responses} onResponse={changeResponse} checked={checked} motion />
      <div className="quiz-actions">
        <button className="button button-primary sv-motion-action" type="button" disabled={!result} onClick={() => { setChecked(true); onResult?.(correct); }}>Comprobar respuesta <ArrowRight size={17} aria-hidden="true" /></button>
        {checked && <p role="status" className={`lesson-motion-feedback ${correct ? 'success-message' : 'error-message'}`}>{correct ? <Check size={19} aria-hidden="true" /> : <Info size={19} aria-hidden="true" />}<span>{correct ? activity.success : 'Inténtalo de nuevo. Revisa la explicación y el contexto de cada expresión.'}</span></p>}
      </div>
    </section>
  );
}
