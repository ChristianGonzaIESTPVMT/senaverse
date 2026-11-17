import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomeVisual } from '../components/HomeVisual';
import { minigames } from '../data/minigames';
import './MinigamesPage.css';

export function MinigamesPage() {
  return (
    <div className="minigames-page">
      <header className="minigames-heading">
        <h1>Zona de <span className="minigames-title-end">minijuegos <HomeVisual name="games" /></span></h1>
        <p>Actividades breves para repasar, divertirte y seguir aprendiendo a tu ritmo.</p>
      </header>

      <section className="minigames-grid" aria-label="Minijuegos en preparación">
        {minigames.map(game => (
          <article className="minigame-card" key={game.id} aria-labelledby={`minigame-${game.id}`}>
            <div className="minigame-art" data-tone={game.tone} aria-hidden="true">
              <span className="minigame-illustration">{game.illustration}</span>
            </div>
            <div className="minigame-copy">
              <h2 id={`minigame-${game.id}`}>{game.title}</h2>
              <p>{game.description}</p>
            </div>
            <span className="minigame-status">Próximamente</span>
          </article>
        ))}
      </section>

      <aside className="minigames-learning-note" aria-label="Continúa tu aprendizaje">
        <span className="minigames-note-icon" aria-hidden="true"><BookOpen size={25} /></span>
        <p>Los minijuegos complementan las lecciones y la práctica guiada de Lengua de Señas Peruana.</p>
        <Link to="/academia">Seguir aprendiendo <ArrowRight size={18} aria-hidden="true" /></Link>
      </aside>
    </div>
  );
}
