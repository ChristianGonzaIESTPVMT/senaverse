import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { LessonActivity as Activity } from '../data/curriculum';

function checkResponses(activity: Activity, responses: Record<string, string>) {
  if (activity.type === 'association') {
    return { answered: activity.pairs.every(pair => !!responses[pair.id]), correct: activity.pairs.every(pair => responses[pair.id] === pair.answerId) };
  }
  return { answered: !!responses.choice, correct: responses.choice === activity.correctId };
}

const activityTitles = { choice: 'Comprueba lo aprendido', identify: 'Identifica la expresión', association: 'Relaciona los conceptos' };

export function LessonActivity({ activity, onResult }: { activity: Activity; onResult: (passed: boolean) => void }) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const result = checkResponses(activity, responses);
  const correct = checked && result.correct;

  function changeResponse(id: string, value: string) {
    setResponses(previous => ({ ...previous, [id]: value }));
    setChecked(false);
    onResult(false);
  }

  return (
    <section className="white-card lesson-article quiz">
      <span className="section-eyebrow">03 / PONTE A PRUEBA</span>
      <h2>{activityTitles[activity.type]}</h2>
      <p>{activity.question}</p>
      <fieldset>
        <legend className="sr-only">{activity.type === 'association' ? 'Relaciona cada concepto' : 'Elige una respuesta'}</legend>
        {activity.type === 'association' ? activity.pairs.map(pair => (
          <label className={`lesson-association-row${checked ? responses[pair.id] === pair.answerId ? ' is-correct' : ' is-incorrect' : ''}`} key={pair.id}>
            <span>{pair.label}</span>
            <select value={responses[pair.id] ?? ''} onChange={event => changeResponse(pair.id, event.target.value)}>
              <option value="">Elige una expresión</option>
              {activity.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        )) : activity.options.map((option, index) => {
          const selected = responses.choice === option.id;
          const feedback = checked && selected ? correct ? ' right' : ' wrong' : '';
          return (
            <label className={`answer${selected ? ' selected' : ''}${feedback}`} key={option.id}>
              <input type="radio" name="lesson-answer" value={option.id} checked={selected} onChange={() => changeResponse('choice', option.id)} />
              <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>{option.label}
            </label>
          );
        })}
      </fieldset>
      <div className="quiz-actions">
        <button className="button button-primary" type="button" disabled={!result.answered} onClick={() => { setChecked(true); onResult(result.correct); }}>Comprobar respuesta <ArrowRight size={17} aria-hidden="true" /></button>
        {checked && <p role="status" className={correct ? 'success-message' : 'error-message'}>{correct ? activity.success : 'Inténtalo de nuevo. Revisa la explicación y el contexto de cada expresión.'}</p>}
      </div>
    </section>
  );
}
