import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardList, RotateCcw } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SituationBreadcrumbs } from '../components/SituationContent';
import { forgetSituationFinish, getSituationFinish } from '../components/situationFinishMotion';
import { getEducationalSign } from '../data/library';
import { getSituationVisualExercise, summarizeSituation } from '../data/situationStudy';
import { getSituation, getSituationFilter, getSituationPath, getSituationScenePath, getSituationsPath } from '../data/situations';
import { useStudentProgress } from '../hooks/progressContext';

export function SituationResultsPage() {
  const location = useLocation();
  return <SituationResultsContent key={location.key} token={location.state?.finishMotionToken} />;
}

function SituationResultsContent({ token }: { token: unknown }) {
  const { progress, recordActivity } = useStudentProgress();
  const { situationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [finishTicket] = useState(() => getSituationFinish(situationId ?? '', token));

  useEffect(() => {
    if (finishTicket) forgetSituationFinish(finishTicket);
  }, [finishTicket]);

  const filter = getSituationFilter(searchParams.get('nivel'));
  const situation = getSituation(situationId);
  if (!situation) return <Navigate to={getSituationsPath(filter)} replace />;

  const run = progress.situationStudy?.[situation.id];
  const summary = summarizeSituation(situation, run);
  const award = progress.activities.find(activity => activity.id === `situation:${situation.id}`);
  const reward = award?.rewardXp;
  const completedTime = run?.completedAt ? Date.parse(run.completedAt) : NaN;
  const newReward = !!reward && !!finishTicket && finishTicket.token === token && award?.occurredAt === run?.completedAt
    && completedTime >= finishTicket.from && completedTime <= finishTicket.to;

  function repeatSituation(id: string, firstScene: string) {
    recordActivity({ type: 'situation-repeat', situationId: id });
    navigate(getSituationScenePath(id, firstScene, filter), { replace: true });
  }

  return (
    <div className="situation-results-page sv-motion">
      <SituationBreadcrumbs situation={situation} current="Resumen" filter={filter} />
      <section className="situation-results-panel" aria-labelledby="situation-results-title">
        <span className={`situation-results-icon${newReward ? ' situation-reward-icon' : ''}`} aria-hidden="true">
          {newReward ? <><CheckCircle2 size={36} />
            <svg className="situation-reward-burst" width="90" height="90" viewBox="0 0 90 90" fill="none" focusable="false">
              <path d="M45 3v7m30 5-5 5m17 25h-7m-5 30-5-5M45 87v-7M15 75l5-5M3 45h7m5-30 5 5" />
            </svg></> : <ClipboardList size={36} />}
        </span>
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
            const latest = answer?.checked ? answer.evaluations?.at(-1) : undefined;
            const visual = selected && answer?.practice?.method === 'alternative'
              && answer.practice.response === getSituationVisualExercise(scene, selected)?.correctId;
            return <li key={scene.id}>
              <strong>{scene.title}</strong>
              <span>{selected ? `${selected.word} · ${!answer.checked ? 'Por comprobar' : answer.choiceId === scene.expectedSignId ? 'Adecuada al contexto' : 'Por revisar'}` : 'Respuesta pendiente'}</span>
              {answer?.practice && <span>{answer.practice.method === 'camera' ? 'Coincidencia gestual experimental'
                : visual ? 'Comprensión visual · sin cámara' : 'Repaso sin cámara'}</span>}
              {answer?.evaluations?.length ? <small>{answer.evaluations.length} {answer.evaluations.length === 1 ? 'intento' : 'intentos'}
                {latest && !latest.passed ? ` · Último intento ${latest.method === 'camera' ? 'con cámara' : 'visual'} por revisar` : ''}</small> : null}
            </li>;
          })}
        </ol>
        {reward && <p className={`situation-results-note${newReward ? ' situation-new-reward' : ''}`}><span><strong>{reward} XP</strong> otorgados por la primera finalización de esta situación.</span></p>}
        <div className="situation-navigation">
          {run?.completedAt ? <button className="button button-primary sv-motion-action" type="button" onClick={() => repeatSituation(situation.id, situation.scenes[0].id)}>
            <RotateCcw size={18} aria-hidden="true" /> Repetir situación
          </button> : <Link className="button button-primary sv-motion-action" to={getSituationPath(situation.id, filter)}>{run ? 'Continuar situación' : 'Comenzar situación'}</Link>}
          <Link className="button button-outline sv-motion-action" to={getSituationsPath(filter)}><ArrowLeft size={18} aria-hidden="true" /> Volver a Situaciones</Link>
        </div>
      </section>
    </div>
  );
}
