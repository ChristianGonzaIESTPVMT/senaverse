import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomeVisual } from '../components/HomeVisual';
import { getLessonPath, getResumeLesson, totalLessons, units } from '../data/curriculum';
import type { HomeVisualName } from '../data/homeVisuals';
import { summarizeProgress } from '../data/progress';
import { useStudentProgress } from '../hooks/progressContext';

const exploreItems: { title: string; description: string; action: string; to: string; visual: HomeVisualName }[] = [
  { title: 'Ruta de aprendizaje', description: 'Lecciones organizadas por niveles.', action: 'Explorar', to: '/academia', visual: 'learning' },
  { title: 'Biblioteca', description: 'Encuentra vocabulario de LSP.', action: 'Ver señas', to: '/biblioteca', visual: 'library' },
  { title: 'Minijuegos', description: 'Actividades para reforzar.', action: 'Practicar', to: '/minijuegos', visual: 'games' },
];

export function DashboardPage({ completed, lastLessonId = null }: { completed: string[]; lastLessonId?: string | null }) {
  const { progress } = useStudentProgress();
  const finishedCount = units.flatMap(unit => unit.lessons).filter(lesson => completed.includes(lesson.id)).length;
  const percent = Math.round(finishedCount / totalLessons * 100);
  const experience = summarizeProgress(progress).xp;
  const resume = getResumeLesson(completed, lastLessonId);
  const lessonCompleted = completed.includes(resume.lesson.id);

  return (
    <div className="home-dashboard">
      <div className="home-heading">
        <h1>¡Bienvenido a <span className="home-heading-brand">SeñaVerse! <HomeVisual name="welcome" /></span></h1>
        <p>Descubre una forma interactiva de aprender Lengua de Señas Peruana.</p>
      </div>

      <section className="home-banner" aria-labelledby="home-banner-title">
        <div className="home-banner-copy">
          <span className="home-banner-eyebrow">Continúa aprendiendo</span>
          <h2 id="home-banner-title">Cada seña nos acerca un poco más.</h2>
          <p>Explora las lecciones, practica lo aprendido y avanza a tu propio ritmo.</p>
          <Link to={getLessonPath(resume.unit.id, resume.lesson.id)} className="home-continue">
            {lessonCompleted ? 'Repasar lección' : 'Continuar lección'} <ArrowRight size={23} aria-hidden="true" />
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
          <span className="home-demo-label">Tu progreso local</span>
        </div>
        <div className="home-stats">
          <div className="home-stat">
            <HomeVisual name="lessons" />
            <dl className="home-stat-copy"><dt>Lecciones completadas</dt><dd>{finishedCount}<span>/{totalLessons}</span></dd></dl>
          </div>
          <div className="home-stat">
            <HomeVisual name="experience" />
            <dl className="home-stat-copy"><dt>Puntos de experiencia</dt><dd>{experience}</dd></dl>
          </div>
          <div className="home-stat">
            <HomeVisual name="progress" />
            <dl className="home-stat-copy"><dt>Progreso del recorrido</dt><dd>{percent}%</dd></dl>
          </div>
        </div>
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
