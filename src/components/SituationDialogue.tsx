import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Camera, CheckCircle2, CircleHelp, CircleX, Eye, Hand, MessageSquareText, ScanLine, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getEducationalSign, getEducationalSignForClass, getLibrarySignPath } from '../data/library';
import { getSituationCameraTarget, getSituationVisualExercise, type SceneStudy, type SituationAttempt, type SituationStudyEvent } from '../data/situationStudy';
import type { Situation, SituationFilter, SituationScene } from '../data/situations';
import { LessonAnswerFields } from './LessonActivity';
import { SituationIllustration } from './SituationContent';

const CameraPractice = lazy(async () => ({ default: (await import('./RecognitionPractice')).RecognitionPractice }));

export function SituationLine({ speaker, children, id }: { speaker: string; children: ReactNode; id?: string }) {
  return <div className="situation-dialogue-speaker">
    <MessageSquareText size={22} aria-hidden="true" />
    <div><strong>{speaker}</strong><p id={id}>{children}</p></div>
  </div>;
}

function Result({ title, passed, icon: Icon, children }: { title: string; passed: boolean; icon: LucideIcon; children: ReactNode }) {
  return <div className={`situation-answer-feedback${passed ? ' is-correct' : ''}`}>
    <Icon size={20} aria-hidden="true" />
    <p><strong>{title}</strong><br />{children}</p>
  </div>;
}

function AttemptFeedback({ attempt, explanation, visualExplanation }: {
  attempt: SituationAttempt; explanation: string; visualExplanation?: string;
}) {
  const observation = attempt.method === 'camera' ? attempt.observation : undefined;
  const recognized = observation?.status === 'recognized' && getEducationalSignForClass(observation.signId);
  const gestureIcon = attempt.matched ? CheckCircle2 : recognized ? Hand : observation?.status === 'unknown' ? CircleHelp : ScanLine;
  return <div className="situation-attempt-feedback" role="status" aria-atomic="true">
<<<<<<< Updated upstream
    <Result title={attempt.contextCorrect ? 'Contexto correcto' : 'Contexto por revisar'} passed={attempt.contextCorrect}>{explanation}</Result>
    {attempt.method === 'visual' ? <Result title={attempt.matched ? 'Comprensión visual correcta' : 'Comprensión visual por revisar'} passed={attempt.matched}>
      {attempt.matched ? 'Identificaste la demostración de la opción que elegiste.' : 'La demostración seleccionada corresponde a otra seña.'}
      {visualExplanation && ` ${visualExplanation}`}
    </Result> : <Result title={attempt.matched ? 'Coincidencia gestual' : recognized ? 'Seña diferente' : observation?.status === 'unknown'
      ? 'Gesto desconocido' : 'Seguimiento insuficiente'} passed={attempt.matched}>
      {recognized ? `V1 reconoció «${recognized.word}». ${attempt.matched ? 'Coincide con la opción que elegiste.' : `Vuelve a intentar «${getEducationalSign(attempt.choiceId)?.word}».`}`
        : 'Centra la mano completa, ilumínala de frente y mantenla visible. Puedes reintentar o elegir la práctica sin cámara.'}
    </Result>}
    {!attempt.passed && <p>{attempt.contextCorrect ? 'Conserva tu respuesta y repite la práctica.' : 'Revisa la situación y elige otra respuesta para avanzar.'}</p>}
=======
    <Result key={`context-${attempt.id}`} title={attempt.contextCorrect ? 'Contexto correcto' : 'Contexto por revisar'}
      icon={attempt.contextCorrect ? CheckCircle2 : CircleX} passed={attempt.contextCorrect}>{explanation}</Result>
    {attempt.method === 'visual' ? <Result key={`visual-${attempt.id}`} title={attempt.matched ? 'Comprensión visual correcta' : 'Comprensión visual por revisar'} passed={attempt.matched} icon={Eye}>
      {attempt.matched ? 'Identificaste la demostración elegida.' : 'Compara las demostraciones y fíjate en la posición de la mano y su movimiento.'}
      {visualExplanation && ` ${visualExplanation}`}
    </Result> : <Result key={`gesture-${attempt.id}`} title={attempt.matched ? 'Coincidencia gestual' : recognized ? 'Seña diferente' : observation?.status === 'unknown'
      ? 'Gesto desconocido' : 'Seguimiento insuficiente'} passed={attempt.matched} icon={gestureIcon}>
      {recognized ? `V1 reconoció «${recognized.word}». ${attempt.matched ? 'Coincide con tu respuesta.' : 'Vuelve a realizar la seña elegida.'}`
        : 'Centra la mano completa, ilumínala de frente y mantenla visible. Puedes reintentar o elegir la práctica sin cámara.'}
    </Result>}
    <div className="situation-dialogue-speaker situation-dialogue-reply" key={`reply-${attempt.id}`}>
      <MessageSquareText size={20} aria-hidden="true" />
      <div><strong>{speaker}</strong><p>
        {attempt.passed ? 'De acuerdo, continuemos.' : !attempt.contextCorrect ? 'Revisemos lo que hace falta aquí.' : 'Veamos otra vez cómo expresar tu respuesta.'}
      </p></div>
    </div>
>>>>>>> Stashed changes
  </div>;
}

export function SituationDialogue({ situation, scene, answer, filter, onEvent }: {
  situation: Situation; scene: SituationScene; answer?: SceneStudy; filter: SituationFilter;
  onEvent: (event: SituationStudyEvent) => void;
}) {
  const [mountedId, setMountedId] = useState<string>();
  const [response, setResponse] = useState('');
  const { id: situationId } = situation;
  const { id: sceneId } = scene;
  const active = answer?.active?.id === mountedId ? answer?.active : undefined;
  const last = answer?.checked ? answer.evaluations?.at(-1) : undefined;
  const selected = answer && getEducationalSign(answer.choiceId);
  const exercise = selected && getSituationVisualExercise(scene, selected);
  const cameraTarget = getSituationCameraTarget(scene, selected);
  const speaker = situation.speaker ?? 'Interlocutor';

  function start(method: 'camera' | 'visual') {
    const id = crypto.randomUUID();
    setResponse('');
    setMountedId(id);
    onEvent({ type: 'situation-attempt-start', situationId, sceneId, attempt: { id, method } });
  }

  return <section className="situation-dialogue" aria-labelledby="situation-scene-title">
    <div className="situation-dialogue-exchange">
      <h2 id="situation-scene-title">{scene.title}</h2>
      <p>{scene.context}</p>
      <SituationLine speaker={speaker} id="situation-question">{scene.question}</SituationLine>
      <fieldset className="situation-options" aria-labelledby="situation-question" disabled={!!answer?.practice}>
        {scene.optionIds.map((id, index) => <label className={`situation-option${selected?.id === id ? ' is-selected' : ''}`} key={id}>
          <input type="radio" name="situation-answer" value={id} checked={selected?.id === id}
            onChange={() => {
              setMountedId(undefined);
              onEvent({ type: 'situation-select', situationId, sceneId, choiceId: id });
            }} />
          <span className="situation-option-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
          <strong>{getEducationalSign(id)?.word}</strong>
        </label>)}
      </fieldset>
      {selected && !answer?.practice && <>
        {!last && <p className="situation-question-note">{cameraTarget
          ? `Realiza «${selected.word}» con la cámara o identifica su demostración.`
          : exercise ? 'Completa la segunda comprobación con el ejercicio sin cámara.'
            : 'Esta opción no tiene una demostración verificable aquí. Elige otra para continuar.'}</p>}
        <div className="situation-question-actions" role="group" aria-label="Método de práctica">
<<<<<<< Updated upstream
          {cameraTarget && <button className="button button-outline" type="button" disabled={active?.method === 'camera'} onClick={() => start('camera')}>
=======
          {cameraAvailable && <button className="button button-outline sv-motion-action" type="button" disabled={active?.method === 'camera'} onClick={() => start('camera')}>
>>>>>>> Stashed changes
            <Camera size={18} aria-hidden="true" />{last?.method === 'camera' ? 'Reintentar con cámara' : 'Practicar con cámara'}
          </button>}
          {exercise && <button className="button button-outline sv-motion-action" type="button" disabled={active?.method === 'visual'} onClick={() => start('visual')}>
            {last?.method === 'visual' ? 'Reintentar sin cámara' : 'Hacer ejercicio sin cámara'}
          </button>}
          {active && <button className="button button-outline sv-motion-action" type="button" onClick={() => start(active.method)}>Reiniciar intento</button>}
        </div>
      </>}
    </div>
<<<<<<< Updated upstream
    {active?.method === 'camera' && cameraTarget && <Suspense fallback={<p role="status">Abriendo la práctica con cámara…</p>}>
      <CameraPractice key={active.id} assessment={{ targetId: cameraTarget,
=======
    {active?.method === 'camera' && selected?.recognitionClassId && <div className="situation-camera-entry"><Suspense fallback={<p role="status">Abriendo la práctica con cámara…</p>}>
      <CameraPractice key={active.id} assessment={{ targetId: selected.recognitionClassId,
>>>>>>> Stashed changes
        onObserve: observation => onEvent({ type: 'situation-attempt-result', situationId, sceneId, attemptId: active.id,
          input: { method: 'camera', observation } }) }} />
    </Suspense></div>}
    {active?.method === 'visual' && exercise && <form className="situation-alternative quiz" onSubmit={event => {
      event.preventDefault();
      onEvent({ type: 'situation-attempt-result', situationId, sceneId, attemptId: active.id, input: { method: 'visual', response } });
    }}>
      <LessonAnswerFields activity={exercise} responses={{ choice: response }} onResponse={(_, value) => setResponse(value)} checked={false} />
      <button className="button button-primary sv-motion-action" type="submit" disabled={!response}>Comprobar ejercicio sin cámara</button>
    </form>}
    {last && <AttemptFeedback attempt={last} explanation={scene.explanation} visualExplanation={exercise?.explanation} />}
    {!last && answer?.practice && <p role="status">Interacción completada en tu historial.</p>}
    {(last || answer?.practice) && selected && <Link to={getLibrarySignPath(selected.id)} state={{ situationReturn: { situationId, sceneId, filter } }}>
      Repasar {selected.word} en Biblioteca
    </Link>}
    {answer?.practice && <div className="situation-context-art"><SituationIllustration situation={situation} /></div>}
  </section>;
}
