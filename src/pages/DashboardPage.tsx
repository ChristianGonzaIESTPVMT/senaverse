import { ArrowRight, BookOpen, Camera, ChartNoAxesColumn, CheckCircle2, Gamepad2, Library, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { initialCompletedLessonIds, totalLessons } from '../data/curriculum';

export function DashboardPage({ completed }: { completed: string[] }) {
  const finishedCount = completed.length;
  const percent = Math.round(finishedCount / totalLessons * 100);
  const unitCount = completed.filter(id => ['introduccion','abecedario','saludos'].includes(id)).length;
  return (
    <>
      <div className="page-heading"><div><span className="section-eyebrow">TU ESPACIO DE APRENDIZAJE</span><h1>¡Bienvenido a SeñaVerse! <span>👋</span></h1><p>Hoy es una buena oportunidad para seguir aprendiendo.</p></div><span className="demo-chip">Datos de demostración</span></div>
      <section className="welcome-banner"><div><span><Sparkles size={16}/> SIGUE APRENDIENDO</span><h2>¡Cada seña que aprendes abre una nueva conexión!</h2><p>Continúa a tu ritmo y descubre nuevas formas de comunicarte.</p></div><BookOpen size={105} strokeWidth={1.1} className="banner-icon" aria-hidden="true" /></section>
      <div className="stat-grid">
        <div className="stat-card"><span className="stat-icon violet"><BookOpen size={20}/></span><span>Lecciones completadas</span><strong>{finishedCount} / {totalLessons}</strong></div>
        <div className="stat-card"><span className="stat-icon mint"><ChartNoAxesColumn size={20}/></span><span>Progreso general</span><strong>{percent}%</strong></div>
        <div className="stat-card"><span className="stat-icon peach"><Trophy size={20}/></span><span>Unidades completas</span><strong>{unitCount === 3 ? '1 / 2' : '0 / 2'}</strong></div>
      </div>
      <div className="dashboard-grid">
        <section className="white-card continue-card"><div className="card-overline">RETOMA TU APRENDIZAJE</div><h2>{completed.includes('saludos') ? '¡Unidad 1 completada!' : 'Saludos y despedidas'}</h2><p>{completed.includes('saludos') ? 'Puedes revisar la lección de ejemplo o explorar la academia.' : 'Aprende a reconocer expresiones habituales para saludar y despedirte.'}</p><div className="between"><span>Unidad 1 · {unitCount} de 3 lecciones</span><b>{Math.round(unitCount/3*100)}%</b></div><div className="bar"><div style={{width:`${unitCount/3*100}%`}}/></div><Link to="/leccion/saludos" className="button button-primary">{completed.includes('saludos') ? 'Revisar lección' : 'Continuar lección'} <ArrowRight size={17}/></Link></section>
        <section className="white-card quick-card"><div className="card-overline">ACCESOS RÁPIDOS</div><h2>¿Qué te gustaría hacer?</h2><div className="quick-grid"><Link to="/academia"><span className="quick-icon violet"><BookOpen size={22}/></span><strong>Academia</strong></Link><Link to="/biblioteca"><span className="quick-icon mint"><Library size={22}/></span><strong>Biblioteca</strong></Link><Link to="/minijuegos"><span className="quick-icon peach"><Gamepad2 size={22}/></span><strong>Minijuegos</strong></Link><Link to="/simulador"><span className="quick-icon violet"><Camera size={22}/></span><strong>Simulador</strong></Link></div></section>
      </div>
      <section className="recommendation"><div className="recommendation-icon"><CheckCircle2 size={25}/></div><div><strong>Recomendación de aprendizaje</strong><p>{completed.includes('saludos') ? '¡Bien! Ya terminaste la lección de muestra. Revisa la academia para continuar.' : 'Refuerza los conceptos de saludo y despedida antes de realizar tu evaluación.'}</p></div><Link to="/academia">Ir a academia <ArrowRight size={16}/></Link></section>
      <p className="demo-note">Esta versión utiliza {initialCompletedLessonIds.length} lecciones completadas de ejemplo. El progreso de la lección interactiva se guarda únicamente en este navegador, sin cuenta ni base de datos.</p>
    </>
  );
}
