import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Camera, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LessonAnswerFields } from './LessonActivity';
import { gradeAnswers, type Answers, type LessonPlan, type LessonReference, type Question, type StudyStep } from '../data/lessonPlan';
import { nextStudyStep, type Attempt, type StepProgress, type StudyInput, type StudyRun } from '../data/lessonStudy';
import { useStudentProgress } from '../hooks/progressContext';
import { recognitionSignsById } from '../features/sign-recognition/recognitionCatalog';

const DirectedLessonPractice = lazy(() => import('./DirectedLessonPractice'));
const emptyResponses: Record<string, string> = {};

function Reference({ reference }: { reference: LessonReference }) {
  return <a className="practice-reference-link" href={reference.url} target="_blank" rel="noopener noreferrer">
    <BookOpen size={18} aria-hidden="true" /> {reference.title} (nueva pestaña)
  </a>;
}

function Questions({ questions, method, previous, complete, submit }: {
  questions: Question[]; method: 'answers' | 'alternative'; previous?: Attempt; complete?: boolean;
  submit: (input: StudyInput) => void;
}) {
  const saved = previous?.input.method === method && previous.input.answers;
  const [answers, setAnswers] = useState<Answers>(() => saved || {});
  const [editing, setEditing] = useState(false);
  const grade = gradeAnswers(questions, answers);
  const checked = !!saved && !editing;
  const score = previous?.grade;

  return <div className="lesson-sequence-questions">
    {questions.map(({ id, activity }) => <LessonAnswerFields key={id} activity={activity} responses={answers[id] ?? emptyResponses}
      onResponse={(field, value) => {
        setEditing(true);
        setAnswers(current => ({ ...current, [id]: { ...current[id], [field]: value } }));
      }} checked={checked} disabled={complete} />)}
    {!complete && <button className="button button-primary" type="button" disabled={!grade || checked} onClick={() => {
      if (!grade) return;
      setEditing(false);
      submit({ method, answers: grade.answers });
    }}>Comprobar respuestas</button>}
    {checked && score && <p className={score.score === score.total ? 'success-message' : 'error-message'} role="status">
      {score.score} de {score.total} correctas. {complete ? 'Puedes continuar.' : 'Revisa las respuestas marcadas y cambia tu elección para volver a intentar.'}
    </p>}
  </div>;
}

function PracticeStep({ step, previous, submit }: {
  step: Extract<StudyStep, { kind: 'practice' }>;
  previous?: StepProgress;
  submit: (input: StudyInput, advance?: boolean) => void;
}) {
  const last = previous?.attempts.at(-1);
  const [path, setPath] = useState<'choose' | 'camera' | 'alternative'>(last?.input.method === 'alternative' ? 'alternative' : 'choose');
  const supportsCamera = recognitionSignsById.has(step.targetId);
  if (previous?.complete) {
    return <div className="lesson-sequence-stack">
      <p>{last?.input.method === 'camera' ? 'Práctica registrada con coincidencia experimental de cámara.' : 'Ejercicio alternativo sin cámara completado.'}</p>
      <Reference reference={step.reference} />
    </div>;
  }

  return <div className="lesson-sequence-stack">
    {path !== 'camera' && <><p>{step.instruction}</p><Reference reference={step.reference} /></>}
    {supportsCamera && <p className="lesson-warning">Reconocimiento experimental. La revisión lingüística está pendiente. Si te cuesta obtener una coincidencia, puedes elegir el ejercicio sin cámara.</p>}
    <div className="lesson-sequence-nav">
      {supportsCamera && path !== 'camera' && <button type="button" className="button button-outline" onClick={() => setPath('camera')}>
        <Camera size={17} aria-hidden="true" /> Practicar con cámara
      </button>}
      {path !== 'alternative' && <button type="button" className="button button-outline" onClick={() => setPath('alternative')}>
        Hacer ejercicio sin cámara
      </button>}
    </div>
    {path === 'camera' && <Suspense fallback={<p role="status">Preparando la práctica con cámara…</p>}>
      <DirectedLessonPractice targetId={step.targetId} instruction={step.instruction} reference={step.reference}
        onContinue={signId => submit({ method: 'camera', signId }, true)} />
    </Suspense>}
    {path === 'alternative' && <Questions questions={step.alternative} method="alternative" previous={last} submit={submit} />}
  </div>;
}

function Summary({ plan, run, finish }: { plan: LessonPlan; run?: StudyRun; finish: () => void }) {
  return <div className="lesson-sequence-stack">
    <ul className="lesson-result-list">{plan.steps.filter(step => step.kind === 'practice' || step.kind === 'assessment').map(step => {
      const result = run?.steps[step.id]?.attempts.at(-1);
      return <li key={step.id}><strong>{step.title}</strong><span>{result?.grade && step.kind === 'assessment'
        ? `${result.grade.score} de ${result.grade.total} correctas`
        : result?.input.method === 'camera' ? 'Coincidencia experimental con cámara' : 'Ejercicio sin cámara'}</span></li>;
    })}</ul>
    <p>El resultado de cámara es orientativo. La evaluación final mide comprensión de las configuraciones y las cantidades.</p>
    {run?.completedAt ? <p role="status" className="success-message">Lección completada y guardada.</p>
      : <button className="button button-primary" type="button" onClick={finish}><Check size={17} aria-hidden="true" /> Finalizar lección</button>}
  </div>;
}

export function LessonSequence({ lessonId, plan, unitPath }: { lessonId: string; plan: LessonPlan; unitPath: string }) {
  const { progress, recordActivity } = useStudentProgress();
  const [selected, setSelected] = useState<number | null>(null);
  const run = progress.lessonStudy?.[lessonId];
  const available = nextStudyStep(plan, run);
  const index = selected ?? available;
  const step = plan.steps[index];
  const result = step && run?.steps[step.id];
  const heading = useRef<HTMLHeadingElement>(null);
  const previousIndex = useRef(index);

  useEffect(() => {
    if (previousIndex.current !== index) heading.current?.focus();
    previousIndex.current = index;
  }, [index]);

  function submit(input: StudyInput, advance = false) {
    if (!step) return;
    if (!run) recordActivity({ type: 'lesson-start', lessonId });
    recordActivity({ type: 'lesson-step', lessonId, stepId: step.id, input });
    setSelected(advance ? null : index);
  }

  return <div className="lesson-sequence">
    <nav className="white-card lesson-sequence-outline" aria-label="Actividades de la lección">
      <p><strong>{available} de {plan.steps.length}</strong> actividades completadas</p>
      <progress value={available} max={plan.steps.length} aria-label="Avance en esta lección" />
      <details><summary>Ver actividades</summary>
        <ol>{[...plan.steps.map(item => item.title), 'Resumen'].map((title, i) =>
          <li key={i}><button type="button" disabled={i > available} aria-current={index === i ? 'step' : undefined}
            onClick={() => setSelected(i)}>{title}{i < available && <Check size={15} aria-label="Completada" />}</button></li>)}</ol>
      </details>
    </nav>
    <section className="white-card lesson-article lesson-sequence-step" aria-labelledby="study-step-title" key={step?.id ?? 'resumen'}>
      <h2 ref={heading} tabIndex={-1} id="study-step-title">{step?.title ?? 'Resumen de la lección'}</h2>
      {step?.kind === 'intro' && <><p>{step.text}</p><ul>{plan.objectives.map(objective => <li key={objective}>{objective}</li>)}</ul>
        {!run && progress.activities.some(activity => activity.id === `lesson:${lessonId}`) &&
          <p>Tu finalización anterior sigue registrada. Puedes recorrer esta versión de la lección.</p>}</>}
      {step?.kind === 'study' && <>
        <p>{step.text}</p><Reference reference={step.reference} />
        <dl className="lesson-number-list">{step.signs.map(sign => <div key={sign.id}><dt>{sign.name}</dt><dd>{sign.explanation}</dd>
          <dd className="lesson-sign-availability">{recognitionSignsById.has(sign.id) ? 'Reconocimiento experimental disponible' : 'Contenido de estudio'}</dd>
        </div>)}</dl>
        <p className="lesson-warning">La lección se basa en la lámina del MINEDU. La revisión lingüística del contenido en SeñaVerse está pendiente.</p>
      </>}
      {(step?.kind === 'question' || step?.kind === 'assessment') && <Questions questions={step.questions} method="answers"
        previous={result?.attempts.at(-1)} complete={result?.complete} submit={submit} />}
      {step?.kind === 'practice' && <PracticeStep step={step} previous={result} submit={submit} />}
      {!step && <Summary plan={plan} run={run} finish={() => recordActivity({ type: 'lesson-finish', lessonId })} />}
      <div className="lesson-sequence-nav">
        {index > 0 && <button className="button button-outline" type="button" onClick={() => setSelected(index - 1)}>
          <ArrowLeft size={17} aria-hidden="true" /> Anterior
        </button>}
        {result?.complete && <button className="button button-primary" type="button" onClick={() => setSelected(index + 1)}>
          {index + 1 === plan.steps.length ? 'Ver resumen' : 'Continuar'} <ArrowRight size={17} aria-hidden="true" />
        </button>}
        {!result?.complete && (step?.kind === 'intro' || step?.kind === 'study') &&
          <button className="button button-primary" type="button" onClick={() => submit({ method: 'read' }, true)}>
            {step.kind === 'intro' ? 'Comenzar lección' : 'Continuar'} <ArrowRight size={17} aria-hidden="true" />
          </button>}
      </div>
    </section>
    <Link to={unitPath} className="button button-outline"><ArrowLeft size={17} aria-hidden="true" /> Volver a las lecciones</Link>
  </div>;
}
