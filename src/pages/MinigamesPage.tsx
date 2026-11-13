import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomeVisual } from '../components/HomeVisual';
import './MinigamesPage.css';

const minigames = [
  {
    id: 'memoria',
    title: 'Memoria visual',
    description: 'Encuentra las parejas y relaciona el vocabulario con sus demostraciones visuales.',
    illustration: '🧠',
    tone: 'lavender',
  },
  {
    id: 'desafio',
    title: 'Desafío rápido',
    description: 'Responde preguntas breves sobre lo aprendido antes de que termine el tiempo.',
    illustration: '⏱️',
    tone: 'mint',
  },
  {
    id: 'relaciona',
    title: 'Relaciona y aprende',
    description: 'Asocia expresiones con su significado y refuerza lo que ya conoces.',
    illustration: '🧩',
    tone: 'peach',
  },
];

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
