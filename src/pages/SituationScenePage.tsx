import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleX, ClipboardList, Info, MessageSquareText } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SituationBreadcrumbs, SituationDifficultyBadge, SituationIllustration } from '../components/SituationContent';
import { SituationPracticeStep } from '../components/SituationPracticeStep';
import { SituationDialogue, SituationLine } from '../components/SituationDialogue';
import { MotionProgress } from '../components/MotionProgress';
import { rememberSituationFinish } from '../components/situationFinishMotion';
import { getEducationalSign } from '../data/library';
import { nextSituationScene, summarizeSituation } from '../data/situationStudy';
import { getSituation, getSituationFilter, getSituationPath, getSituationResultsPath, getSituationScenePath, getSituationsPath,
  type Situation, type SituationFilter, type SituationScene } from '../data/situations';
import { useStudentProgress } from '../hooks/progressContext';

export function SituationScenePage() {
  const { progress } = useStudentProgress();
  const { situationId, sceneId } = useParams();
  const [searchParams] = useSearchParams();
  const filter = getSituationFilter(searchParams.get('nivel'));
  const situation = getSituation(situationId);
  if (!situation) return <Navigate to={getSituationsPath(filter)} replace />;

  const run = progress.situationStudy?.[situation.id];
  const next = nextSituationScene(situation, run);
  if (!sceneId) {
    if (run?.completedAt) return <Navigate to={getSituationResultsPath(situation.id, filter)} replace />;
    const resume = next ?? situation.scenes[situation.scenes.length - 1];
    return <Navigate to={getSituationScenePath(situation.id, resume.id, filter)} replace />;
  }
  const sceneIndex = situation.scenes.findIndex(item => item.id === sceneId);
  if (sceneIndex === -1) return <Navigate to={getSituationPath(situation.id, filter)} replace />;
  if (next && sceneIndex > situation.scenes.indexOf(next)) return <Navigate to={getSituationScenePath(situation.id, next.id, filter)} replace />;

  return <SituationSceneContent key={`${situation.id}/${sceneId}`} situation={situation} scene={situation.scenes[sceneIndex]} sceneIndex={sceneIndex} filter={filter} />;
}

function SituationSceneContent({ situation, scene, sceneIndex, filter }: { situation: Situation; scene: SituationScene; sceneIndex: number; filter: SituationFilter }) {
  const { progress, recordActivity } = useStudentProgress();
  const navigate = useNavigate();
  const situationId = situation.id, sceneId = scene.id;
  const run = progress.situationStudy?.[situationId];
  const answer = run?.scenes[sceneId];
  const illustrationAfterAnswer = situation.illustrationAfterAnswer || scene.illustrationAfterAnswer;
  const sign = answer?.checked ? getEducationalSign(answer.choiceId) : undefined;
  const isCorrect = answer?.choiceId === scene.expectedSignId;
  const { completed } = summarizeSituation(situation, run);
  const followingScene = situation.scenes[sceneIndex + 1];
  const results = getSituationResultsPath(situationId, filter);

  useEffect(() => { recordActivity({ type: 'situation-start', situationId }); }, [recordActivity, situationId]);

  function finish() {
    const from = Date.now();
    const alreadyRewarded = progress.activities.some(activity => activity.id === `situation:${situationId}` && activity.rewardXp);
    recordActivity({ type: 'situation-finish', situationId });
    navigate(results, alreadyRewarded ? undefined : { state: { finishMotionToken: rememberSituationFinish(situationId, from) } });
  }

  return (
    <div className="situation-scene-page sv-motion">
      <SituationBreadcrumbs situation={situation} current={`Interacción ${sceneIndex + 1}`} filter={filter} />
      <header className="situation-scene-heading">
        <div>
          <SituationDifficultyBadge difficulty={situation.difficulty} />
          <h1>{situation.title}</h1>
          <p>{situation.context}</p>
        </div>
        <Link className="situation-results-link sv-motion-action" to={results}><ClipboardList size={19} aria-hidden="true" /> Ver resumen</Link>
      </header>
      <div className="situation-scene-progress">
        <span>Interacción {sceneIndex + 1} de {situation.scenes.length}</span><span>{completed} {completed === 1 ? 'completada' : 'completadas'}</span>
        <MotionProgress value={completed} max={situation.scenes.length} label="Interacciones completadas de la situación" animateOnMount={false} />
      </div>

      {scene.dialogue ? <SituationDialogue situation={situation} scene={scene} answer={answer} filter={filter} onEvent={recordActivity} /> : <>
      <section className="situation-scenario" aria-labelledby="situation-scene-title">
        <div className="situation-story">
          {!illustrationAfterAnswer && <SituationIllustration situation={situation} />}
          <div className="situation-story-copy">
            <h2 id="situation-scene-title">{scene.title}</h2>
            <p><MessageSquareText size={22} aria-hidden="true" /><span>{scene.context}</span></p>
            {sceneIndex === 0 && <div className="situation-objectives">
              <h3>Objetivos</h3><ul>{situation.objectives.map(objective => <li key={objective}>{objective}</li>)}</ul>
            </div>}
          </div>
        </div>
        <form className="situation-question" onSubmit={event => { event.preventDefault(); recordActivity({ type: 'situation-check', situationId, sceneId }); }}>
          {situation.speaker ? <SituationLine speaker={situation.speaker} id="situation-question">{scene.question}</SituationLine>
            : <h2 id="situation-question">{scene.question}</h2>}
          <fieldset className="situation-options" aria-labelledby="situation-question" disabled={!!answer?.practice}>
            {scene.optionIds.map((id, index) => {
              const selected = answer?.choiceId === id;
              const feedbackClass = selected && answer?.checked ? isCorrect ? ' is-correct' : ' is-incorrect' : '';
              return (
                <label className={`situation-option${selected ? ' is-selected' : ''}${feedbackClass}`} key={id}>
                  <input type="radio" name="situation-answer" value={id} checked={selected}
                    onChange={() => recordActivity({ type: 'situation-select', situationId, sceneId, choiceId: id })} />
                  <span className="situation-option-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                  <strong>{getEducationalSign(id)?.word ?? id}</strong>
                  {selected && answer.checked && (isCorrect ? <CheckCircle2 size={21} aria-hidden="true" /> : <CircleX size={21} aria-hidden="true" />)}
                </label>
              );
            })}
          </fieldset>
          {answer?.checked && <div className={`situation-answer-feedback${isCorrect ? ' is-correct' : ''}`} role="status">
            {isCorrect ? <CheckCircle2 size={21} aria-hidden="true" /> : <Info size={21} aria-hidden="true" />}
            <p><strong>{isCorrect ? 'Respuesta adecuada.' : 'Esta opción no corresponde a la pregunta.'}</strong> {scene.explanation}
              {!isCorrect && !answer.practice && ' Elige otra respuesta para continuar.'}</p>
          </div>}
          {!answer?.practice && <div className="situation-question-actions">
            <button className="button button-primary sv-motion-action" type="submit" disabled={!answer || answer.checked}>Comprobar alternativa <ArrowRight size={18} aria-hidden="true" /></button>
          </div>}
        </form>
      </section>
      {illustrationAfterAnswer && answer?.checked && <div className="situation-context-art">
        <SituationIllustration situation={situation} />
      </div>}

      {sign && (isCorrect || answer?.practice) && <SituationPracticeStep key={sign.id} sign={sign} scene={scene} situationId={situationId} filter={filter}
        practice={answer?.practice} onComplete={input => recordActivity({ type: 'situation-practice', situationId, sceneId, input })} />}
      </>}

      {answer?.practice && scene.reply && situation.speaker && <div role="status" className="situation-scene-reply">
        <SituationLine speaker={situation.speaker}>{scene.reply}</SituationLine>
      </div>}
      <div className="situation-navigation">
        <Link className="button button-outline sv-motion-action" to={getSituationsPath(filter)}><ArrowLeft size={18} aria-hidden="true" /> Volver a Situaciones</Link>
        {answer?.practice && (followingScene ? <Link className="button button-primary sv-motion-action" to={getSituationScenePath(situationId, followingScene.id, filter)}>
          Continuar a la siguiente interacción <ArrowRight size={18} aria-hidden="true" />
        </Link> : run?.completedAt ? <Link className="button button-primary sv-motion-action" to={results}>Ver resumen final</Link> : <button className="button button-primary sv-motion-action"
          type="button" onClick={finish}>Finalizar situación <ArrowRight size={18} aria-hidden="true" /></button>)}
      </div>
    </div>
  );
}
