import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Illustration } from './Illustration';
import { LessonAnswerFields } from './LessonActivity';
import { MediaSourceLink, SignMediaViewer } from './SignMediaViewer';
import { gradeAnswers, type Answers, type LessonPlan, type Question, type StudyStep } from '../data/lessonPlan';
import { nextStudyStep, type Attempt, type StepProgress, type StudyInput, type StudyRun } from '../data/lessonStudy';
import { useStudentProgress } from '../hooks/progressContext';
import { recognitionSignsById } from '../features/sign-recognition/recognitionCatalog';
import { getEducationalSign, getLibrarySignPath } from '../data/library';

const DirectedLessonPractice = lazy(() => import('./DirectedLessonPractice'));
const emptyResponses: Record<string, string> = {};

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
  const sign = getEducationalSign(step.targetId);
  const visualAlternative = step.alternative.some(({ activity }) => activity.options.some(option => option.media));
  if (previous?.complete) {
    return <div className="lesson-sequence-stack">
      <p>{last?.input.method === 'camera' ? 'Práctica registrada con coincidencia experimental de cámara.' : 'Ejercicio alternativo sin cámara completado.'}</p>
      {sign && <SignMediaViewer sign={sign} compact />}
    </div>;
  }

  return <div className="lesson-sequence-stack">
    {path !== 'camera' && (path !== 'alternative' || !visualAlternative) && sign && <SignMediaViewer sign={sign} instruction={step.instruction} compact />}
    {supportsCamera && <p className="lesson-warning">Reconocimiento experimental. La revisión lingüística está pendiente. Si te cuesta obtener una coincidencia, puedes elegir el ejercicio sin cámara.</p>}
    {step.notice && <p>{step.notice}</p>}
    <div className="lesson-sequence-nav">
      {supportsCamera && path !== 'camera' && <button type="button" className="button button-outline" onClick={() => setPath('camera')}>
        <Camera size={17} aria-hidden="true" /> Practicar con cámara
      </button>}
      {path !== 'alternative' && <button type="button" className="button button-outline" onClick={() => setPath('alternative')}>
        Hacer ejercicio sin cámara
      </button>}
    </div>
    {path === 'camera' && <Suspense fallback={<p role="status">Preparando la práctica con cámara…</p>}>
      <DirectedLessonPractice targetId={step.targetId} instruction={step.instruction}
        onContinue={signId => submit({ method: 'camera', signId }, true)} />
    </Suspense>}
    {path === 'alternative' && <Questions questions={step.alternative} method="alternative" previous={last} submit={submit} />}
  </div>;
}

function Assessment({ step, result, submit, review }: {
  step: Extract<StudyStep, { questions: Question[] }>; result?: StepProgress;
  submit: (input: StudyInput) => void; review: (input: StudyInput) => void;
}) {
  const [repeating, setRepeating] = useState(false);
  const previous = result?.reviewAttempts?.at(-1) ?? result?.attempts.at(-1);
  return <div className="lesson-sequence-stack">
    <Questions key={repeating ? 'retry' : 'result'} questions={step.questions} method="answers"
      previous={repeating ? undefined : previous} complete={result?.complete && !repeating} submit={input => {
        if (!repeating) { submit(input); return; }
        review(input);
        setRepeating(false);
      }} />
    {result?.complete && <div className="lesson-sequence-nav">
      <button type="button" className="button button-outline" onClick={() => setRepeating(!repeating)}>
        {repeating ? 'Cancelar repetición' : 'Repetir evaluación'}
      </button>
    </div>}
  </div>;
}

function Summary({ plan, run, finish, onReview, nextPath }: {
  plan: LessonPlan; run?: StudyRun; finish: () => void; onReview: (index: number) => void; nextPath?: string;
}) {
  return <div className="lesson-sequence-stack">
    <ul className="lesson-result-list">{plan.steps.map((step, index) => {
      if (step.kind !== 'practice' && step.kind !== 'assessment') return null;
      const progress = run?.steps[step.id];
      const result = progress?.reviewAttempts?.at(-1) ?? progress?.attempts.at(-1);
      const assessment = step.kind === 'assessment' && result?.grade;
      return <li key={step.id}><strong>{step.title}</strong><span>{assessment
        ? `${assessment.score} de ${assessment.total} correctas`
        : result?.input.method === 'camera' ? 'Coincidencia experimental con cámara' : 'Ejercicio sin cámara'}</span>
        {assessment && <><button type="button" className="button button-outline" onClick={() => onReview(index)}>Revisar evaluación</button>
          {assessment.score < assessment.total && <p>Repasa las referencias y vuelve a intentar las preguntas que marcaste incorrectamente.</p>}</>}
      </li>;
    })}</ul>
    {plan.steps.some(step => step.kind === 'practice') && <p>Las coincidencias de cámara son orientativas. La evaluación se califica con las respuestas del ejercicio.</p>}
    {run?.completedAt ? <><p role="status" className="success-message">Lección completada y guardada.</p>
      {nextPath && <Link className="button button-primary" to={nextPath}>Siguiente lección <ArrowRight size={17} aria-hidden="true" /></Link>}</>
      : <button className="button button-primary" type="button" onClick={finish}><Check size={17} aria-hidden="true" /> Finalizar lección</button>}
  </div>;
}

export function LessonSequence({ lessonId, plan, unitPath, nextPath }: {
  lessonId: string; plan: LessonPlan; unitPath: string; nextPath?: string;
}) {
  const { progress, recordActivity } = useStudentProgress();
  const location = useLocation();
  const run = progress.lessonStudy?.[lessonId];
  const available = nextStudyStep(plan, run);
  const returnIndex = plan.steps.findIndex(step => step.id === location.state?.lessonStep);
  const [selected, setSelected] = useState<number | null>(() => returnIndex >= 0 && returnIndex <= available ? returnIndex : null);
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
      {step?.kind === 'reading' && <div className="lesson-sequence-stack">
        {step.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        {step.illustration && <figure className="lesson-reading-illustration">
          <Illustration asset={step.illustration} alt={step.illustration.alt} />
        </figure>}
        {step.references?.map(reference => <MediaSourceLink key={reference.url} reference={reference} />)}
      </div>}
      {step?.kind === 'study' && <>
        <p>{step.text}</p>
        <div className="lesson-sequence-stack">{[...new Map(
          (step.reference ? [step.reference] : step.signs.flatMap(sign => {
            const reference = getEducationalSign(sign.id)?.media.document?.link;
            return reference ? [reference] : [];
          })).map(reference => [reference.url, reference]),
        ).values()].map(reference => <MediaSourceLink key={reference.url} reference={reference} />)}</div>
          <dl className="lesson-number-list">{step.signs.map(sign => {
            const entry = getEducationalSign(sign.id);
            const name = sign.name ?? entry?.word;
            return <div key={sign.id}>
              <dt>{name}</dt>
              {entry && <dd><SignMediaViewer sign={entry} instruction={sign.explanation ?? entry.instructions}
                showDocumentLink={false} compact /></dd>}
              <dd className="lesson-sign-availability">{entry?.recognitionClassId ? 'Reconocimiento experimental disponible' : 'Contenido de estudio'}</dd>
              {entry && <dd><Link to={getLibrarySignPath(entry.id)} state={{ lessonReturn: { lessonId, stepId: step.id } }}
                aria-label={`Ver ficha de ${name} en Biblioteca`}>Ver ficha en Biblioteca</Link></dd>}
            </div>;
          })}</dl>
        <p className="lesson-warning">Validación lingüística de las fichas pendiente.</p>
      </>}
      {step?.kind === 'question' && <Questions questions={step.questions} method="answers"
        previous={result?.attempts.at(-1)} complete={result?.complete} submit={submit} />}
      {step?.kind === 'assessment' && <Assessment step={step} result={result} submit={submit}
        review={input => recordActivity({ type: 'lesson-review', lessonId, stepId: step.id, input })} />}
      {step?.kind === 'practice' && <PracticeStep step={step} previous={result} submit={submit} />}
      {!step && <Summary plan={plan} run={run} onReview={setSelected} nextPath={nextPath}
        finish={() => recordActivity({ type: 'lesson-finish', lessonId })} />}
      <div className="lesson-sequence-nav">
        {index > 0 && <button className="button button-outline" type="button" onClick={() => setSelected(index - 1)}>
          <ArrowLeft size={17} aria-hidden="true" /> Anterior
        </button>}
        {result?.complete && <button className="button button-primary" type="button" onClick={() => setSelected(index + 1)}>
          {index + 1 === plan.steps.length ? 'Ver resumen' : 'Continuar'} <ArrowRight size={17} aria-hidden="true" />
        </button>}
        {!result?.complete && (step?.kind === 'intro' || step?.kind === 'reading' || step?.kind === 'study') &&
          <button className="button button-primary" type="button" onClick={() => submit({ method: 'read' }, true)}>
            {step.kind === 'intro' ? 'Comenzar lección' : 'Continuar'} <ArrowRight size={17} aria-hidden="true" />
          </button>}
      </div>
    </section>
    <Link to={unitPath} className="button button-outline"><ArrowLeft size={17} aria-hidden="true" /> Volver a las lecciones</Link>
  </div>;
}
