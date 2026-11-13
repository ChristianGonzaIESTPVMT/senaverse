import { useRef } from 'react';
import { ArrowRight, Hand, Info, LayoutGrid, MessageSquareText, UserRound, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { HomeVisual } from '../components/HomeVisual';
import { SituationDifficultyBadge, SituationIllustration } from '../components/SituationContent';
import { getSituationFilter, getSituationScenePath, situations, type SituationFilter } from '../data/situations';
import type { SituationProgress } from '../hooks/useSituationProgress';

const filters: { id: SituationFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'basico', label: 'Básico' },
  { id: 'intermedio', label: 'Intermedio' },
];

export function SituationsPage({ progress }: { progress: SituationProgress }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const helpRef = useRef<HTMLDialogElement>(null);
  const filter = getSituationFilter(searchParams.get('nivel'));
  const visibleSituations = situations.filter(situation => filter === 'todos' || situation.difficulty === filter);

  function selectFilter(next: SituationFilter) {
    setSearchParams(next === 'todos' ? {} : { nivel: next });
  }

  return (
    <div className="situations-page">
      <header className="situations-heading">
        <span className="situations-heading-icon" aria-hidden="true"><MessageSquareText strokeWidth={1.8} /></span>
        <div className="situations-heading-copy">
          <h1>Simulador de situaciones</h1>
          <p>Aplica lo aprendido en conversaciones y contextos de la vida diaria.</p>
        </div>
        <div className="situations-heading-art" aria-hidden="true">
          <UserRound className="situations-hero-person" /><Hand className="situations-hero-hand" />
        </div>
      </header>

      <section className="situations-banner" aria-labelledby="situations-banner-title">
        <HomeVisual name="progress" />
        <div>
          <h2 id="situations-banner-title">¡Comunícate en la vida real!</h2>
          <p>Enfrenta escenarios cotidianos, elige la respuesta adecuada y realiza la seña con tu cámara.</p>
        </div>
      </section>

      <div className="situations-toolbar">
        <div className="situations-filters" role="group" aria-label="Filtrar por dificultad">
          {filters.map(item => (
            <button className={`situations-filter${filter === item.id ? ' is-active' : ''}`} type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => selectFilter(item.id)}>
              {item.id === 'todos' ? <LayoutGrid size={20} aria-hidden="true" /> : <span className="situation-level-bars" aria-hidden="true"><i /><i /><i /></span>}
              {item.label}
            </button>
          ))}
        </div>
        <button className="situations-help-button" type="button" aria-haspopup="dialog" aria-controls="situations-help" onClick={() => helpRef.current?.showModal()}><Info size={21} aria-hidden="true" /> ¿Cómo funciona?</button>
      </div>

      <p className="situations-demo-note"><Info size={16} aria-hidden="true" /> Contenido de demostración. La verificación de señas está en preparación.</p>
      <span className="sr-only" role="status">{visibleSituations.length} situaciones disponibles en este filtro.</span>

      <section className="situations-grid" aria-label="Situaciones cotidianas">
        {visibleSituations.map(situation => {
          const session = progress.sessions[situation.id];
          const sceneId = session?.currentSceneId ?? situation.scenes[0].id;
          return (
            <article className="situation-card" key={situation.id} aria-labelledby={`situation-${situation.id}`}>
              <SituationIllustration situation={situation} />
              <div className="situation-card-copy">
                <h2 id={`situation-${situation.id}`}>{situation.title}</h2>
                <SituationDifficultyBadge difficulty={situation.difficulty} />
                <p>{situation.description}</p>
                <div className="situation-card-progress">
                  <span>Progreso · 0 de {situation.scenes.length} escenas</span>
                  <progress value={0} max={situation.scenes.length} aria-label={`Escenas verificadas de ${situation.title}`} />
                </div>
                <Link className="button button-primary situation-start" to={getSituationScenePath(situation.id, sceneId, filter)}>{session ? 'Continuar' : 'Comenzar'}<ArrowRight size={19} aria-hidden="true" /></Link>
              </div>
            </article>
          );
        })}
      </section>

      <dialog id="situations-help" className="situations-help-dialog" ref={helpRef} aria-labelledby="situations-help-title" onClick={event => { if (event.target === event.currentTarget) helpRef.current?.close(); }}>
        <div className="situations-help-content">
          <button className="situations-dialog-close" type="button" aria-label="Cerrar explicación" autoFocus onClick={() => helpRef.current?.close()}><X size={23} /></button>
          <span className="situations-help-icon" aria-hidden="true"><MessageSquareText size={31} /></span>
          <h2 id="situations-help-title">¿Cómo funciona?</h2>
          <ol>
            <li>Elige una situación y lee lo que sucede.</li>
            <li>Selecciona una alternativa y comprueba tu respuesta.</li>
            <li>Practica la seña con la cámara y consulta su demostración.</li>
            <li>La verificación real habilitará el avance y los resultados de las escenas.</li>
          </ol>
          <p>Las situaciones están en demostración mientras se integra el reconocimiento. Puedes guardar tus respuestas y retomarlas después.</p>
          <button className="button button-primary" type="button" onClick={() => helpRef.current?.close()}>Entendido</button>
        </div>
      </dialog>
    </div>
  );
}
