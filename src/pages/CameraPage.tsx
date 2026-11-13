import { ArrowRight, Camera, Check, Clock3, Hand, LayoutGrid, Sparkles, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PracticeSignArt } from '../components/PracticeContent';
import { getFreePracticePath, practiceSigns } from '../data/practice';

const practiceModes = [
  {
    title: 'Práctica libre',
    description: 'Elige una seña y practícala sin límite de intentos.',
    illustration: '👋',
    features: ['Intentos ilimitados', 'Demostración visual de la seña', 'Aprende a tu propio ritmo'],
    to: '/camara/libre',
    action: 'Comenzar',
    primary: true,
  },
  {
    title: 'Desafío de señas',
    description: 'Realiza una secuencia de señas y pon a prueba tu avance.',
    illustration: '🏆',
    features: ['Secuencias de varias señas', 'Resultados con evaluación real', 'XP al integrar la evaluación'],
    to: '/camara/desafio',
    action: 'Iniciar desafío',
    primary: false,
  },
];

export function CameraPage() {
  return (
    <div className="camera-center">
      <header className="camera-center-heading">
        <span className="camera-center-icon" aria-hidden="true"><Camera strokeWidth={1.8} /></span>
        <div className="camera-center-heading-copy">
          <h1>Centro de práctica</h1>
          <p>Refuerza lo aprendido practicando las señas con tu cámara.</p>
        </div>
        <div className="camera-center-illustration" aria-hidden="true">
          <div className="camera-illustration-screen">
            <UserRound className="camera-illustration-person" /><Hand className="camera-illustration-hand" />
          </div>
          <span className="camera-illustration-base" />
        </div>
      </header>

      <div className="camera-center-banner">
        <span aria-hidden="true"><Sparkles size={26} /></span>
        <p>Practica a tu ritmo y mejora tu precisión.</p>
      </div>

      <div className="camera-center-grid">
        <section className="camera-modes" aria-label="Modalidades de práctica">
          {practiceModes.map(mode => (
            <article className="camera-mode-card" key={mode.to}>
              <div className="camera-mode-art" aria-hidden="true"><span>{mode.illustration}</span></div>
              <h2>{mode.title}</h2>
              <p>{mode.description}</p>
              <ul>
                {mode.features.map(feature => <li key={feature}><Check size={18} aria-hidden="true" /><span>{feature}</span></li>)}
              </ul>
              <Link className={`button ${mode.primary ? 'button-primary' : 'button-outline'} camera-mode-action`} to={mode.to}>{mode.action}<ArrowRight size={21} aria-hidden="true" /></Link>
            </article>
          ))}
        </section>

        <aside className="camera-center-aside" aria-label="Tu espacio de práctica">
          <section className="practice-panel camera-recent" aria-labelledby="camera-recent-title">
            <h2 id="camera-recent-title"><Clock3 size={25} aria-hidden="true" /> Actividad reciente</h2>
            <div className="camera-recent-empty">
              <span aria-hidden="true"><Clock3 size={31} strokeWidth={1.5} /></span>
              <p>Aún no has realizado prácticas. ¡Comienza tu primera actividad!</p>
            </div>
          </section>
          <section className="practice-panel camera-available-signs" aria-labelledby="camera-signs-title">
            <h2 id="camera-signs-title"><LayoutGrid size={25} aria-hidden="true" /> Señas disponibles para practicar</h2>
            <span className="practice-demo-label">Datos de demostración</span>
            <div className="camera-sign-grid">
              {practiceSigns.slice(0, 3).map(sign => (
                <Link className="camera-sign-link" to={getFreePracticePath(sign.id)} key={sign.id} aria-label={`Seleccionar ${sign.word} en Práctica libre`}>
                  <PracticeSignArt sign={sign} /><strong>{sign.word}</strong>
                </Link>
              ))}
            </div>
            <p className="camera-signs-note">Reconocimiento pendiente de integración.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
