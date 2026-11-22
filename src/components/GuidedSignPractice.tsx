import { lazy, Suspense, useState } from 'react';
import { Camera, CheckCircle2, Hand } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LessonAnswerFields } from './LessonActivity';
import { getLibrarySignPath, type LibraryEntry } from '../data/library';
import type { ChoiceExercise, SignPractice } from '../data/signExercises';
import { SignMediaViewer } from './SignMediaViewer';

const DirectedLessonPractice = lazy(() => import('./DirectedLessonPractice'));

function AlternativePractice({ exercise, onComplete }: { exercise: ChoiceExercise; onComplete: (input: SignPractice) => void }) {
  const [response, setResponse] = useState('');
  const [retry, setRetry] = useState(false);
  return <form className="situation-alternative quiz" onSubmit={event => {
    event.preventDefault();
    if (response === exercise.correctId) onComplete({ method: 'alternative', response });
    else setRetry(true);
  }}>
    <LessonAnswerFields activity={exercise} responses={{ choice: response }} checked={retry}
      onResponse={(_, value) => { setResponse(value); setRetry(false); }} />
    {retry && <p role="status" className="error-message">Revisa la ficha y vuelve a intentarlo. Tu respuesta al contexto ya está registrada.</p>}
    <button className="button button-primary" type="submit" disabled={!response}>
      Comprobar ejercicio sin cámara
    </button>
  </form>;
}

export function GuidedSignPractice({ sign, exercise, returnState, titleId, practice, onComplete }: {
  sign: LibraryEntry; exercise: ChoiceExercise; returnState: object; titleId: string;
  practice?: SignPractice; onComplete: (input: SignPractice) => void;
}) {
  const [mode, setMode] = useState<'camera' | 'alternative' | null>(null);
  const supportsCamera = !!(sign.recognitionClassId && sign.instructions && sign.reference);

  return <section className="situation-practice-step" aria-labelledby={titleId}>
    <div className="situation-practice-heading">
      <h2 id={titleId}><Hand size={24} aria-hidden="true" /> Practica «{sign.word}»</h2>
      {!sign.instructions && <p>{sign.meaning}</p>}
    </div>
    <div className="situation-practice-reference">
      {mode !== 'camera' && <SignMediaViewer key={sign.id} sign={sign} compact />}
      <Link to={getLibrarySignPath(sign.id)} state={returnState}>Ver ficha de {sign.word} en Biblioteca</Link>
    </div>
    {practice ? <div className="situation-answer-feedback is-correct" role="status">
      <CheckCircle2 size={21} aria-hidden="true" />
      <p>{practice.method === 'camera' ? 'Práctica guardada con una coincidencia experimental.' : 'Ejercicio sin cámara completado.'}</p>
    </div> : <>
      <p className="situation-question-note">{supportsCamera
        ? 'El reconocimiento es experimental. Puedes reintentar o completar el ejercicio sin cámara.'
        : sign.reference ? 'Esta seña se puede practicar con la lámina y un ejercicio sin cámara.'
          : 'Por ahora puedes repasar el significado con un ejercicio sin cámara.'}</p>
      <div className="situation-question-actions" role="group" aria-label="Método de práctica">
        {supportsCamera && <button className="button button-outline" type="button" aria-pressed={mode === 'camera'} onClick={() => setMode('camera')}>
          <Camera size={18} aria-hidden="true" /> Practicar con cámara
        </button>}
        <button className="button button-outline" type="button" aria-pressed={mode === 'alternative'} onClick={() => setMode('alternative')}>Hacer ejercicio sin cámara</button>
      </div>
      {mode === 'alternative' && <AlternativePractice exercise={exercise} onComplete={onComplete} />}
      {mode === 'camera' && sign.recognitionClassId && sign.instructions && sign.reference && <div className="situation-directed-practice">
        <Suspense fallback={<p role="status">Abriendo la práctica dirigida…</p>}>
          <DirectedLessonPractice targetId={sign.recognitionClassId} instruction={sign.instructions}
            continueLabel="Guardar práctica con cámara" onContinue={signId => onComplete({ method: 'camera', signId })} />
        </Suspense>
      </div>}
    </>}
  </section>;
}
