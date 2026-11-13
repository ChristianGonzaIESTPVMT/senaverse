import { ArrowLeft, ClipboardList, Info, RotateCcw } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SituationBreadcrumbs } from '../components/SituationContent';
import { getSituationFilter, getSituationScenePath, getSituationsPath, situations } from '../data/situations';
import type { SituationProgress } from '../hooks/useSituationProgress';

export function SituationResultsPage({ progress }: { progress: SituationProgress }) {
  const { situationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filter = getSituationFilter(searchParams.get('nivel'));
  const situation = situations.find(item => item.id === situationId);
  if (!situation) return <Navigate to={getSituationsPath(filter)} replace />;

  const answers = progress.sessions[situation.id]?.answers;
  const correctCount = situation.scenes.filter(scene => {
    const answer = answers?.[scene.id];
    return answer?.checked && answer.choiceId === scene.expectedSignId;
  }).length;

  function repeatSituation() {
    if (!situation) return;
    progress.resetSituation(situation.id);
    navigate(getSituationScenePath(situation.id, situation.scenes[0].id, filter), { replace: true });
  }

  return (
    <div className="situation-results-page">
      <SituationBreadcrumbs situation={situation} current="Resumen" filter={filter} />
      <section className="situation-results-panel" aria-labelledby="situation-results-title">
        <span className="situation-results-icon" aria-hidden="true"><ClipboardList size={36} /></span>
        <span className="situation-sample-label">Situación en preparación</span>
        <h1 id="situation-results-title">Resumen de la situación</h1>
        <p className="situation-results-name">{situation.title}</p>
        <dl className="situation-results-metrics">
          <div><dt>Estado de la situación</dt><dd>En preparación</dd></div>
          <div><dt>Escenas superadas</dt><dd>Pendientes de verificación</dd></div>
          <div><dt>Respuestas correctas</dt><dd>{correctCount} de {situation.scenes.length}</dd></div>
          <div><dt>Señas verificadas</dt><dd>Reconocimiento pendiente</dd></div>
        </dl>
        <p className="situation-results-note"><Info size={20} aria-hidden="true" /><span>Las respuestas reflejan las alternativas que has comprobado. Los resultados completos se habilitarán al integrar la verificación de señas.</span></p>
        <div className="situation-navigation">
          <button className="button button-primary" type="button" onClick={repeatSituation}><RotateCcw size={18} aria-hidden="true" /> Repetir situación</button>
          <Link className="button button-outline" to={getSituationsPath(filter)}><ArrowLeft size={18} aria-hidden="true" /> Volver a Situaciones</Link>
        </div>
      </section>
    </div>
  );
}
