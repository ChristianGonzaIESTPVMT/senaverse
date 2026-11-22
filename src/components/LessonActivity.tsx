import { useId, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { LessonActivity as Activity } from '../data/curriculum';
import { gradeAnswers } from '../data/lessonPlan';
import { getEducationalSign } from '../data/library';
import { SignHandDiagram } from './SignHandDiagram';

const activityTitles = { choice: 'Comprueba lo aprendido', identify: 'Identifica la expresión', association: 'Relaciona los conceptos', order: 'Ordena los pasos' };

export function LessonAnswerFields({ activity, responses, onResponse, checked, disabled }: {
  activity: Activity; responses: Record<string, string>; onResponse: (id: string, value: string) => void;
  checked: boolean; disabled?: boolean;
}) {
  const name = useId();
  const diagram = activity.diagramId ? getEducationalSign(activity.diagramId)?.handDiagram : undefined;
  const rows = activity.type === 'association' ? activity.pairs : activity.type === 'order'
    ? activity.order.map((answerId, index) => ({ id: String(index), label: `Paso ${index + 1}`, answerId })) : undefined;
  const labelFor = (id: string) => activity.options.find(option => option.id === id)?.label;
  return <fieldset className="lesson-answer-fields" disabled={disabled}>
    <legend>{activity.question}</legend>
    {diagram && <div className="lesson-question-diagram"><SignHandDiagram diagram={diagram} /></div>}
    {rows?.map(pair => {
      const correct = responses[pair.id] === pair.answerId;
      return <label className={`lesson-association-row${checked ? correct ? ' is-correct' : ' is-incorrect' : ''}`} key={pair.id}>
        <span>{pair.label}{checked && <small>{correct ? 'Correcta' : `Incorrecta. Respuesta correcta: ${labelFor(pair.answerId)}`}</small>}</span>
        <select value={responses[pair.id] ?? ''} onChange={event => onResponse(pair.id, event.target.value)}>
          <option value="">Elige una respuesta</option>
          {activity.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>;
    })}
    {(activity.type === 'choice' || activity.type === 'identify') && activity.options.map((option, index) => {
      const selected = responses.choice === option.id;
      const feedback = checked && selected ? option.id === activity.correctId ? ' right' : ' wrong' : '';
      return <label className={`answer${selected ? ' selected' : ''}${feedback}`} key={option.id}>
        <input type="radio" name={name} value={option.id} checked={selected} onChange={() => onResponse('choice', option.id)} />
        <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>{option.label}
        {feedback && <small>{feedback === ' right' ? 'Correcta' : `Incorrecta. Respuesta correcta: ${labelFor(activity.correctId)}`}</small>}
      </label>;
    })}
    {checked && activity.explanation && <p className="lesson-answer-explanation">{activity.explanation}</p>}
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
      <LessonAnswerFields activity={activity} responses={responses} onResponse={changeResponse} checked={checked} />
      <div className="quiz-actions">
        <button className="button button-primary" type="button" disabled={!result} onClick={() => { setChecked(true); onResult?.(correct); }}>Comprobar respuesta <ArrowRight size={17} aria-hidden="true" /></button>
        {checked && <p role="status" className={correct ? 'success-message' : 'error-message'}>{correct ? activity.success : 'Inténtalo de nuevo. Revisa la explicación y el contexto de cada expresión.'}</p>}
      </div>
    </section>
  );
}
