import { ArrowRight, BookOpen, Check, ChevronRight, Clock3, LockKeyhole, Play, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { units, totalLessons } from '../data/curriculum';

export function AcademyPage({ completed }: { completed: string[] }) {
  const percent = Math.round(completed.length/totalLessons*100);
  return (
    <>
      <div className="page-heading"><div><span className="section-eyebrow">TU RUTA EDUCATIVA</span><h1>Academia de LSP <span>✦</span></h1><p>Avanza paso a paso, aprende y pon en práctica lo que descubres.</p></div><span className="demo-chip">Contenido de muestra</span></div>
      <section className="academy-banner"><div><span className="light-tag"><Sparkles size={15}/> RUTA DE APRENDIZAJE</span><h2>Un pequeño avance cada día hace la diferencia.</h2><p>Completa lecciones para construir tus conocimientos de manera progresiva.</p></div><div className="academy-percent"><strong>{percent}%</strong><span>progreso general</span></div></section>
      <div className="academy-headline"><h2>Unidades de aprendizaje</h2><span>{completed.length} de {totalLessons} lecciones completadas</span></div>
      {units.map((unit,index) => {
        const done = unit.lessons.filter(l=>completed.includes(l.id)).length;
        const locked = index > 0;
        return (
          <section className="unit-card" key={unit.id}>
            <div className="unit-header"><span className={`unit-icon ${locked?'soft':'violet'}`}><BookOpen size={24}/></span><div className="unit-title"><span className="card-overline">UNIDAD {String(unit.id).padStart(2,'0')}</span><h3>{unit.title}</h3><p>{unit.subtitle}</p></div><span className="unit-status">{locked ? <><LockKeyhole size={14}/> Próximamente</> : `${done} de ${unit.lessons.length} lecciones`}</span></div>
            <div className="bar"><div style={{width:`${done / unit.lessons.length*100}%`}}/></div>
            <div className="lesson-list">
              {unit.lessons.map((lesson,lessonIndex)=>{
                const isDone=completed.includes(lesson.id);
                const canOpen = lesson.id==='saludos';
                return (
                  <div className="lesson-row" key={lesson.id}>
                    <span className={`lesson-number ${isDone?'done':canOpen?'current':''}`}>{isDone?<Check size={18}/>:canOpen?<Play size={17}/>:locked?<LockKeyhole size={16}/>:lessonIndex+1}</span>
                    <div><strong>{lesson.title}</strong><span><Clock3 size={13}/>{lesson.duration} {canOpen?'· Ejercicio interactivo':'· Contenido pendiente'}</span></div>
                    {canOpen?<Link className="lesson-open" to="/leccion/saludos">{isDone?'Repasar':'Empezar'} <ChevronRight size={16}/></Link>:<span className="unavailable">{isDone?'Avance de ejemplo':'Próximamente'}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      <div className="recommendation"><div className="recommendation-icon"><ArrowRight size={22}/></div><div><strong>Empieza con una lección interactiva</strong><p>Prueba el ejercicio de «Saludos y despedidas» y comprueba cómo se registra tu progreso.</p></div><Link to="/leccion/saludos">Abrir lección <ArrowRight size={16}/></Link></div>
    </>
  );
}
