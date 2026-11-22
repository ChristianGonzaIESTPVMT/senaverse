import { useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, ClipboardList, Info, MessageSquareText } from 'lucide-react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { SituationBreadcrumbs, SituationDifficultyBadge, SituationIllustration } from '../components/SituationContent';
import { SituationPracticeStep } from '../components/SituationPracticeStep';
import { getEducationalSign } from '../data/library';
import { getSituationFilter, getSituationPath, getSituationResultsPath, getSituationScenePath, getSituationsPath, situations, type Situation, type SituationFilter, type SituationScene } from '../data/situations';
import type { SituationProgress } from '../hooks/useSituationProgress';

export function SituationScenePage({ progress }: { progress: SituationProgress }) {
  const { situationId, sceneId } = useParams();
  const [searchParams] = useSearchParams();
  const filter = getSituationFilter(searchParams.get('nivel'));
  const situation = situations.find(item => item.id === situationId);
  if (!situation) return <Navigate to={getSituationsPath(filter)} replace />;

  const scene = situation.scenes.find(item => item.id === sceneId);
  if (!sceneId) {
    const resumeId = progress.sessions[situation.id]?.currentSceneId ?? situation.scenes[0].id;
    return <Navigate to={getSituationScenePath(situation.id, resumeId, filter)} replace />;
  }
  if (!scene) return <Navigate to={getSituationPath(situation.id, filter)} replace />;

  return <SituationSceneContent key={`${situation.id}/${scene.id}`} situation={situation} scene={scene} filter={filter} progress={progress} />;
}

function SituationSceneContent({ situation, scene, filter, progress }: { situation: Situation; scene: SituationScene; filter: SituationFilter; progress: SituationProgress }) {
  const [practiceVisible, setPracticeVisible] = useState(false);
  const sceneIndex = situation.scenes.findIndex(item => item.id === scene.id);
  const answer = progress.sessions[situation.id]?.answers[scene.id];
  const isCorrect = answer?.checked && answer.choiceId === scene.expectedSignId;
  const expectedSign = scene.expectedSignId ? getEducationalSign(scene.expectedSignId) : undefined;

  return (
    <div className="situation-scene-page">
      <SituationBreadcrumbs situation={situation} current={`Escena ${sceneIndex + 1}`} filter={filter} />
      <header className="situation-scene-heading">
        <div>
          <SituationDifficultyBadge difficulty={situation.difficulty} />
          <h1>{situation.title}</h1>
        </div>
        <Link className="situation-results-link" to={getSituationResultsPath(situation.id, filter)}><ClipboardList size={19} aria-hidden="true" /> Ver resumen</Link>
      </header>
      <div className="situation-scene-progress">
        <span>Escena {sceneIndex + 1} de {situation.scenes.length}</span><span>0 escenas verificadas</span>
        <progress value={0} max={situation.scenes.length} aria-label="Escenas verificadas de la situación" />
      </div>

      {practiceVisible && isCorrect && expectedSign ? (
        <SituationPracticeStep sign={expectedSign} onReturn={() => setPracticeVisible(false)} isLastScene={sceneIndex === situation.scenes.length - 1} />
      ) : (
        <section className="situation-scenario" aria-labelledby="situation-scene-title">
          <div className="situation-story">
            <SituationIllustration situation={situation} />
            <div className="situation-story-copy">
              <span className="situation-sample-label">Escenario de demostración</span>
              <h2 id="situation-scene-title">{scene.title}</h2>
              <p><MessageSquareText size={22} aria-hidden="true" /><span>{scene.context}</span></p>
            </div>
          </div>
          <div className="situation-question">
            <h2>{scene.question}</h2>
            <fieldset className="situation-options">
              <legend className="sr-only">Elige una alternativa</legend>
              {scene.optionIds.map((id, index) => {
                const option = getEducationalSign(id);
                const selected = answer?.choiceId === id;
                const feedbackClass = selected && answer?.checked ? isCorrect ? ' is-correct' : ' is-incorrect' : '';
                return (
                  <label className={`situation-option${selected ? ' is-selected' : ''}${feedbackClass}`} key={id}>
                    <input type="radio" name="situation-answer" value={id} checked={selected} onChange={() => progress.saveAnswer(situation.id, scene.id, id, false)} />
                    <span className="situation-option-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                    <strong>{option?.word ?? id}</strong>
                    {selected && isCorrect && <CheckCircle2 size={21} aria-hidden="true" />}
                  </label>
                );
              })}
            </fieldset>
            {answer?.checked && (
              <div className={`situation-answer-feedback${isCorrect ? ' is-correct' : ''}`} role="status">
                {isCorrect ? <CheckCircle2 size={21} aria-hidden="true" /> : <Info size={21} aria-hidden="true" />}
                <p>{isCorrect ? `¡Respuesta adecuada! Ahora practica la seña «${expectedSign?.word ?? 'seleccionada'}» con tu cámara.` : `Prueba otra alternativa. ${scene.explanation}`}</p>
              </div>
            )}
            <div className="situation-question-actions">
              <button className="button button-primary" type="button" disabled={!answer} onClick={() => { if (answer) progress.saveAnswer(situation.id, scene.id, answer.choiceId, true); }}>Comprobar alternativa <ArrowRight size={18} aria-hidden="true" /></button>
              {isCorrect && expectedSign && <button className="button button-outline" type="button" onClick={() => setPracticeVisible(true)}><Camera size={18} aria-hidden="true" /> Practicar con cámara</button>}
            </div>
            <p className="situation-question-note">La verificación de señas está en preparación. El avance de escena quedará disponible con el reconocimiento real.</p>
          </div>
        </section>
      )}
      <div className="situation-navigation">
        <Link className="button button-outline" to={getSituationsPath(filter)}><ArrowLeft size={18} aria-hidden="true" /> Volver a Situaciones</Link>
      </div>
    </div>
  );
}
