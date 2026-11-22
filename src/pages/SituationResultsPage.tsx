import { ArrowLeft, ClipboardList, RotateCcw } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SituationBreadcrumbs } from '../components/SituationContent';
import { getEducationalSign } from '../data/library';
import { summarizeSituation } from '../data/situationStudy';
import { getSituation, getSituationFilter, getSituationPath, getSituationScenePath, getSituationsPath } from '../data/situations';
import { useStudentProgress } from '../hooks/progressContext';

export function SituationResultsPage() {
  const { progress, recordActivity } = useStudentProgress();
  const { situationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filter = getSituationFilter(searchParams.get('nivel'));
  const situation = getSituation(situationId);
  if (!situation) return <Navigate to={getSituationsPath(filter)} replace />;

  const run = progress.situationStudy?.[situation.id];
  const summary = summarizeSituation(situation, run);
  const reward = progress.activities.find(activity => activity.id === `situation:${situation.id}`)?.rewardXp;

  function repeatSituation(id: string, firstScene: string) {
    recordActivity({ type: 'situation-repeat', situationId: id });
    navigate(getSituationScenePath(id, firstScene, filter), { replace: true });
  }

  return (
    <div className="situation-results-page">
      <SituationBreadcrumbs situation={situation} current="Resumen" filter={filter} />
      <section className="situation-results-panel" aria-labelledby="situation-results-title">
        <span className="situation-results-icon" aria-hidden="true"><ClipboardList size={36} /></span>
        <span className="situation-sample-label">{run?.completedAt ? 'Situación finalizada' : run ? 'En curso' : 'Por comenzar'}</span>
        <h1 id="situation-results-title">Resumen de la situación</h1>
        <p className="situation-results-name">{situation.title}</p>
        <dl className="situation-results-metrics">
          <div><dt>Interacciones completadas</dt><dd>{summary.completed} de {situation.scenes.length}</dd></div>
          <div><dt>Comprensión del contexto</dt><dd>{summary.correct} {summary.correct === 1 ? 'adecuada' : 'adecuadas'} · {summary.incorrect} por revisar</dd>
            {summary.errors > summary.incorrect && <small>{summary.errors} intentos incorrectos en total</small>}</div>
          <div><dt>Coincidencias experimentales guardadas</dt><dd>{summary.camera}</dd></div>
          <div><dt>Ejercicios sin cámara</dt><dd>{summary.alternative}</dd></div>
        </dl>
        <ol className="situation-result-scenes" aria-label="Resultado por interacción">
          {situation.scenes.map(scene => {
            const answer = run?.scenes[scene.id];
            const selected = answer && getEducationalSign(answer.choiceId);
            return <li key={scene.id}>
              <strong>{scene.title}</strong>
              <span>{selected ? `${selected.word} · ${!answer.checked ? 'Por comprobar' : answer.choiceId === scene.expectedSignId ? 'Adecuada al contexto' : 'Por revisar'}` : 'Respuesta pendiente'}</span>
              {answer?.practice && <span>{answer.practice.method === 'camera' ? 'Cámara experimental' : 'Ejercicio sin cámara'}</span>}
            </li>;
          })}
        </ol>
        {reward && <p className="situation-results-note">{reward} XP otorgados por la primera finalización de esta situación.</p>}
        <div className="situation-navigation">
          {run?.completedAt ? <button className="button button-primary" type="button" onClick={() => repeatSituation(situation.id, situation.scenes[0].id)}>
            <RotateCcw size={18} aria-hidden="true" /> Repetir situación
          </button> : <Link className="button button-primary" to={getSituationPath(situation.id, filter)}>{run ? 'Continuar situación' : 'Comenzar situación'}</Link>}
          <Link className="button button-outline" to={getSituationsPath(filter)}><ArrowLeft size={18} aria-hidden="true" /> Volver a Situaciones</Link>
        </div>
      </section>
    </div>
  );
}
