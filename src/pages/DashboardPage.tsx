import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomeVisual } from '../components/HomeVisual';
import { StudentActivityList } from '../components/StudentActivityList';
import { StudentLevel } from '../components/StudentLevel';
import type { HomeVisualName } from '../data/homeVisuals';
import { useStudentOverview } from '../hooks/useStudentOverview';

const exploreItems: { title: string; description: string; action: string; to: string; visual: HomeVisualName }[] = [
  { title: 'Ruta de aprendizaje', description: 'Lecciones organizadas por niveles.', action: 'Explorar', to: '/academia', visual: 'learning' },
  { title: 'Biblioteca', description: 'Encuentra vocabulario de LSP.', action: 'Ver señas', to: '/biblioteca', visual: 'library' },
  { title: 'Situaciones', description: 'Practica en contextos cotidianos.', action: 'Ver situaciones', to: '/simulador', visual: 'learning' },
  { title: 'Cámara', description: 'Práctica local con reconocimiento experimental.', action: 'Abrir Cámara', to: '/camara', visual: 'welcome' },
  { title: 'Minijuegos', description: 'Actividades para reforzar.', action: 'Practicar', to: '/minijuegos', visual: 'games' },
];

export function DashboardPage() {
  const { now, summary } = useStudentOverview();
  const { resumeLesson, initialLesson, resumeSituation } = summary;
  const lesson = resumeLesson ?? initialLesson;
  const recommendation = resumeSituation ? { path: resumeSituation.path, title: 'Continuar situación', detail: `${resumeSituation.title} · ${resumeSituation.detail}` }
    : summary.curriculum.completed.includes('numeros') && !summary.completedSituations ? { path: '/simulador', title: 'Practicar en una situación', detail: 'Aplica los números en una compra o al elegir una cantidad.' }
      : summary.curriculum.completed.includes('numeros') && !summary.completedGames ? { path: '/minijuegos', title: 'Reforzar con minijuegos', detail: 'Relaciona los números con sus posturas en LSP.' }
        : { path: '/biblioteca', title: 'Consultar Biblioteca', detail: 'Revisa los significados y las referencias de las señas.' };
  const badges = summary.latestAchievements.slice(0, 3);

  return (
    <div className="home-dashboard">
      <div className="home-heading">
        <h1>¡Bienvenido a <span className="home-heading-brand">SeñaVerse! <HomeVisual name="welcome" /></span></h1>
        <p>Descubre una forma interactiva de aprender Lengua de Señas Peruana.</p>
      </div>

      <section className="home-banner" aria-labelledby="home-banner-title">
        <div className="home-banner-copy">
          <span className="home-banner-eyebrow">{resumeLesson ? 'Continúa aprendiendo' : 'Tu ruta de aprendizaje'}</span>
          <h2 id="home-banner-title">{lesson?.title ?? 'Explora las lecciones'}</h2>
          <p>{lesson?.detail}</p>
          <Link to={lesson?.path ?? '/academia'} className="home-continue">
            {resumeLesson ? 'Continuar aprendiendo' : initialLesson?.completed ? 'Repasar lección' : 'Empezar a aprender'} <ArrowRight size={23} aria-hidden="true" />
          </Link>
        </div>
        <div className="home-banner-art" aria-hidden="true">
          <span className="home-banner-rays"><i /><i /><i /></span>
          <HomeVisual name="hero" />
          <span className="home-banner-shadow" />
        </div>
        <svg className="home-banner-wave" viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 180C105 105 156 53 270 85S430 46 479 20 561 4 600 0v180Z" fill="currentColor" />
        </svg>
      </section>

      <section className="home-learning" aria-labelledby="home-learning-title">
        <div className="home-section-heading">
          <h2 id="home-learning-title">Mi aprendizaje</h2>
          <Link className="home-overview-link" to="/progreso">Ver mi progreso <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="home-stats">
          <div className="home-stat">
            <HomeVisual name="lessons" />
            <dl className="home-stat-copy"><dt>Lecciones completadas</dt><dd>{summary.curriculum.done}<span>/{summary.curriculum.total}</span></dd></dl>
          </div>
          <div className="home-stat">
            <HomeVisual name="experience" />
            <dl className="home-stat-copy"><dt>XP acumulados</dt><dd>{summary.xp}</dd></dl>
          </div>
          <div className="home-stat">
            <HomeVisual name="progress" />
            <dl className="home-stat-copy"><dt>Racha actual</dt><dd>{summary.calendar.current}<span> {summary.calendar.current === 1 ? 'día' : 'días'}</span></dd></dl>
          </div>
        </div>
        <div className="home-learning-detail">
          <StudentLevel level={summary.level} xp={summary.xp} />
          <div><h3><Link className="home-overview-link" to={recommendation.path}>{recommendation.title} <ArrowRight size={17} aria-hidden="true" /></Link></h3><p>{recommendation.detail}</p></div>
        </div>
      </section>
      <section className="home-learning-detail home-recent" aria-label="Actividad y logros">
        <div><h2>Actividad reciente</h2>{summary.history.length ? <StudentActivityList activities={summary.history.slice(0, 3)} now={now} />
          : <p>Tus actividades aparecerán aquí cuando empieces a practicar.</p>}</div>
        <div><h2>Últimos logros</h2>{badges.length ? <ul>{badges.map(badge => <li key={badge.id}>{badge.name}</li>)}</ul>
          : <p>Tus logros aparecerán después de completar las primeras actividades.</p>}</div>
      </section>

      <section className="home-explore" aria-labelledby="home-explore-title">
        <div className="home-section-heading"><h2 id="home-explore-title">Explora SeñaVerse</h2></div>
        <div className="home-explore-grid">
          {exploreItems.map(item => (
            <article className="home-explore-card" key={item.to}>
              <HomeVisual name={item.visual} />
              <div className="home-explore-copy"><h3>{item.title}</h3><p>{item.description}</p></div>
              <Link className="home-explore-link" to={item.to} aria-label={`${item.action}: ${item.title}`}>{item.action}</Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
