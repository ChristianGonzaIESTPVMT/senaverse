import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Camera, CheckCircle2, Info, MessageSquareText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getEducationalSign, getEducationalSignForClass, getLibrarySignPath } from '../data/library';
import { getSituationVisualExercise, type SceneStudy, type SituationAttempt, type SituationStudyEvent } from '../data/situationStudy';
import type { Situation, SituationFilter, SituationScene } from '../data/situations';
import { LessonAnswerFields } from './LessonActivity';
import { SituationIllustration } from './SituationContent';

const CameraPractice = lazy(async () => ({ default: (await import('./RecognitionPractice')).RecognitionPractice }));

const speakers: Record<string, string> = {
  utiles: 'Persona de la papelería', tienda: 'Persona de la tienda', comida: 'Persona del comedor',
  actividad: 'Compañera de clase', cantidad: 'Responsable del taller',
};

function Result({ title, passed, children }: { title: string; passed: boolean; children: ReactNode }) {
  const Icon = passed ? CheckCircle2 : Info;
  return <div className={`situation-answer-feedback${passed ? ' is-correct' : ''}`}>
    <Icon size={20} aria-hidden="true" />
    <p><strong>{title}</strong><br />{children}</p>
  </div>;
}

function AttemptFeedback({ attempt, explanation, visualExplanation, speaker }: {
  attempt: SituationAttempt; explanation: string; visualExplanation?: string; speaker: string;
}) {
  const observation = attempt.method === 'camera' ? attempt.observation : undefined;
  const recognized = observation?.status === 'recognized' && getEducationalSignForClass(observation.signId);
  return <div className="situation-attempt-feedback" role="status" aria-atomic="true">
    <Result title={attempt.contextCorrect ? 'Contexto correcto' : 'Contexto por revisar'} passed={attempt.contextCorrect}>{explanation}</Result>
    {attempt.method === 'visual' ? <Result title={attempt.matched ? 'Comprensión visual correcta' : 'Comprensión visual por revisar'} passed={attempt.matched}>
      {attempt.matched ? 'Identificaste la demostración elegida.' : 'Compara las demostraciones y fíjate en la posición de la mano y su movimiento.'}
      {visualExplanation && ` ${visualExplanation}`}
    </Result> : <Result title={attempt.matched ? 'Coincidencia gestual' : recognized ? 'Seña diferente' : observation?.status === 'unknown'
      ? 'Gesto desconocido' : 'Seguimiento insuficiente'} passed={attempt.matched}>
      {recognized ? `V1 reconoció «${recognized.word}». ${attempt.matched ? 'Coincide con tu respuesta.' : 'Vuelve a realizar la seña elegida.'}`
        : 'Centra la mano completa, ilumínala de frente y mantenla visible. Puedes reintentar o elegir la práctica sin cámara.'}
    </Result>}
    <div className="situation-dialogue-speaker situation-dialogue-reply">
      <MessageSquareText size={20} aria-hidden="true" />
      <div><strong>{speaker}</strong><p>
        {attempt.passed ? 'De acuerdo, continuemos.' : !attempt.contextCorrect ? 'Revisemos lo que hace falta aquí.' : 'Veamos otra vez cómo expresar tu respuesta.'}
      </p></div>
    </div>
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
  const cameraAvailable = scene.dialogue === 'camera' && !!selected?.recognitionClassId;
  const speaker = speakers[situationId] ?? 'Interlocutor';

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
      <div className="situation-dialogue-speaker">
        <MessageSquareText size={22} aria-hidden="true" />
        <div><strong>{speaker}</strong><p id="situation-question">{scene.question}</p></div>
      </div>
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
        <p className="situation-question-note">{cameraAvailable
          ? `Realiza «${selected.word}» con la cámara o identifica su demostración.`
          : 'Para esta interacción, elige la demostración visual. La fiabilidad gestual todavía está en revisión.'}</p>
        <div className="situation-question-actions" role="group" aria-label="Método de práctica">
          {cameraAvailable && <button className="button button-outline" type="button" disabled={active?.method === 'camera'} onClick={() => start('camera')}>
            <Camera size={18} aria-hidden="true" />{last?.method === 'camera' ? 'Reintentar con cámara' : 'Practicar con cámara'}
          </button>}
          {exercise && <button className="button button-outline" type="button" disabled={active?.method === 'visual'} onClick={() => start('visual')}>
            {last?.method === 'visual' ? 'Reintentar sin cámara' : 'Hacer ejercicio sin cámara'}
          </button>}
          {active && <button className="button button-outline" type="button" onClick={() => start(active.method)}>Reiniciar intento</button>}
        </div>
      </>}
    </div>
    {active?.method === 'camera' && selected?.recognitionClassId && <Suspense fallback={<p role="status">Abriendo la práctica con cámara…</p>}>
      <CameraPractice key={active.id} assessment={{ targetId: selected.recognitionClassId,
        onObserve: observation => onEvent({ type: 'situation-attempt-result', situationId, sceneId, attemptId: active.id,
          input: { method: 'camera', observation } }) }} />
    </Suspense>}
    {active?.method === 'visual' && exercise && <form className="situation-alternative quiz" onSubmit={event => {
      event.preventDefault();
      onEvent({ type: 'situation-attempt-result', situationId, sceneId, attemptId: active.id, input: { method: 'visual', response } });
    }}>
      <LessonAnswerFields activity={exercise} responses={{ choice: response }} onResponse={(_, value) => setResponse(value)} checked={false} />
      <button className="button button-primary" type="submit" disabled={!response}>Comprobar ejercicio sin cámara</button>
    </form>}
    {last && <AttemptFeedback attempt={last} explanation={scene.explanation} visualExplanation={exercise?.explanation} speaker={speaker} />}
    {!last && answer?.practice && <p role="status">Interacción completada en tu historial.</p>}
    {(last || answer?.practice) && selected && <Link to={getLibrarySignPath(selected.id)} state={{ situationReturn: { situationId, sceneId, filter } }}>
      Repasar {selected.word} en Biblioteca
    </Link>}
    {answer?.practice && <div className="situation-context-art"><SituationIllustration situation={situation} /></div>}
  </section>;
}
