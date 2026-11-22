import { ArrowRight, BookOpen, Camera, CheckCircle2, GraduationCap, HeartHandshake, Play, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';

export function HomePage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <nav className="landing-nav" aria-label="Navegación principal">
          <a href="#caracteristicas">Características</a>
          <a href="#como-funciona">Cómo funciona</a>
          <Link to="/academia">Academia</Link>
        </nav>
        <div className="header-controls"><ThemeToggle /><Link className="button button-primary header-action" to="/panel">Explorar demo <ArrowRight size={17} /></Link></div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={16} /> Una nueva forma de acercarte a la LSP</div>
            <h1>Aprende a comunicarte <em>con las manos y el corazón.</em></h1>
            <p className="hero-description">Descubre la Lengua de Señas Peruana paso a paso, con lecciones visuales, retos interactivos y seguimiento de tu aprendizaje.</p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/panel">Comenzar a explorar <ArrowRight size={18} /></Link>
              <Link className="button button-outline" to="/academia">Ver academia</Link>
            </div>
            <p className="hero-caption"><CheckCircle2 size={16} /> Prototipo académico de SeñaVerse · Material LSP pendiente de validación</p>
          </div>
          <div className="hero-visual" aria-label="Vista ilustrativa de una lección de SeñaVerse">
            <div className="hero-spark spark-a"/><div className="hero-spark spark-b"/>
            <div className="lesson-teaser">
              <div className="teaser-top"><span className="teaser-dots"><i/><i/><i/></span><span className="teaser-label">ACADEMIA SEÑAVERSE</span></div>
              <div className="teaser-video"><div className="play-circle"><Play size={28} fill="currentColor" /></div><strong>Observa, aprende y practica</strong><span>Espacio para video validado de LSP</span></div>
              <div className="teaser-bottom"><strong>Números básicos</strong><Link to="/academia/unidad/2/leccion/numeros">Ver lección</Link></div>
            </div>
            <div className="float-pill float-one"><span className="float-symbol"><GraduationCap size={19}/></span> Aprende a tu ritmo</div>
            <div className="float-pill float-two"><span className="float-symbol mint"><Target size={18}/></span> Practica lo aprendido</div>
          </div>
        </section>
        <section className="landing-section" id="caracteristicas">
          <span className="section-eyebrow">TU ESPACIO DE APRENDIZAJE</span>
          <h2>Aprender LSP puede ser una experiencia cercana y dinámica.</h2>
          <div className="feature-grid">
            <article className="feature-card"><span className="feature-symbol"><BookOpen size={25}/></span><h3>Lecciones paso a paso</h3><p>Unidades organizadas para avanzar desde los conceptos básicos.</p></article>
            <article className="feature-card"><span className="feature-symbol mint"><Camera size={25}/></span><h3>Práctica interactiva</h3><p>Ejercicios y un simulador experimental de señas seleccionadas.</p></article>
            <article className="feature-card"><span className="feature-symbol peach"><Target size={25}/></span><h3>Tu progreso importa</h3><p>Identifica tus logros y los temas que necesitas reforzar.</p></article>
          </div>
        </section>
        <section className="landing-section how-section" id="como-funciona">
          <span className="section-eyebrow">SENCILLO Y PROGRESIVO</span>
          <h2>¿Cómo funciona SeñaVerse?</h2>
          <div className="steps-grid">
            <div><b>01</b><h3>Explora</h3><p>Selecciona una unidad y descubre sus lecciones.</p></div>
            <div><b>02</b><h3>Practica</h3><p>Refuerza conceptos con actividades interactivas.</p></div>
            <div><b>03</b><h3>Avanza</h3><p>Recibe retroalimentación y continúa aprendiendo.</p></div>
          </div>
        </section>
        <section className="landing-cta"><div><HeartHandshake size={26}/><h2>Tu camino para aprender LSP empieza aquí.</h2><p>Conoce el prototipo y ayúdanos a construir una experiencia educativa inclusiva.</p></div><Link className="button button-white" to="/panel">Entrar al prototipo <ArrowRight size={18}/></Link></section>
      </main>
      <footer className="landing-footer"><Brand /><span>Proyecto académico · IESTP Villa María · 2026</span></footer>
    </div>
  );
}
