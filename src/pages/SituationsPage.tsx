import { useRef } from 'react';
import { ArrowRight, Info, LayoutGrid, MessageSquareText, UserRound, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { HomeVisual } from '../components/HomeVisual';
import { SituationDifficultyBadge, SituationIllustration } from '../components/SituationContent';
import { getSituationFilter, getSituationPath, situations, type SituationFilter } from '../data/situations';
import { summarizeSituation } from '../data/situationStudy';
import { useStudentProgress } from '../hooks/progressContext';

const filters: { id: SituationFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'basico', label: 'Básico' },
  { id: 'intermedio', label: 'Intermedio' },
];

export function SituationsPage() {
  const { progress } = useStudentProgress();
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
          <p>Elige una respuesta en un contexto cotidiano y practica una seña a la vez.</p>
        </div>
        <div className="situations-heading-art" aria-hidden="true">
          <UserRound className="situations-hero-person" />
        </div>
      </header>

      <section className="situations-banner" aria-labelledby="situations-banner-title">
        <HomeVisual name="progress" />
        <div>
          <h2 id="situations-banner-title">¡Comunícate en la vida real!</h2>
          <p>Consulta la ficha de la seña y elige entre cámara y un ejercicio sin cámara cuando ambos estén disponibles.</p>
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

      <p className="situations-demo-note"><Info size={16} aria-hidden="true" /> El reconocimiento es experimental. Todas las situaciones se pueden completar sin cámara.</p>
      <span className="sr-only" role="status">{visibleSituations.length} situaciones disponibles en este filtro.</span>

      <section className="situations-grid" aria-label="Situaciones cotidianas">
        {visibleSituations.map(situation => {
          const run = progress.situationStudy?.[situation.id];
          const { completed } = summarizeSituation(situation, run);
          return (
            <article className="situation-card" key={situation.id} aria-labelledby={`situation-${situation.id}`}>
              <SituationIllustration situation={situation} />
              <div className="situation-card-copy">
                <h2 id={`situation-${situation.id}`}>{situation.title}</h2>
                <SituationDifficultyBadge difficulty={situation.difficulty} />
                <p>{situation.description}</p>
                <p className="situation-card-context">{situation.context}</p>
                <div className="situation-card-progress">
                  <span>{completed} de {situation.scenes.length} interacciones{run?.completedAt && ' · Finalizada'}</span>
                  <progress value={completed} max={situation.scenes.length} aria-label={`Interacciones completadas de ${situation.title}`} />
                </div>
                <Link className="button button-primary situation-start" to={getSituationPath(situation.id, filter)}>{run?.completedAt ? 'Ver resumen' : run ? 'Continuar' : 'Comenzar'}<ArrowRight size={19} aria-hidden="true" /></Link>
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
            <li>Consulta la ficha de la seña elegida y practica con cámara o con un ejercicio alternativo.</li>
            <li>Avanza por las interacciones y revisa por separado tus respuestas y métodos de práctica.</li>
          </ol>
          <p>Tu progreso se guarda en este navegador. Obtienes XP la primera vez que finalizas cada situación del catálogo.</p>
          <button className="button button-primary" type="button" onClick={() => helpRef.current?.close()}>Entendido</button>
        </div>
      </dialog>
    </div>
  );
}
