import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, CirclePlay, Clock3, Info, LockKeyhole, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LessonPage({ completed, onComplete }: { completed: string[]; onComplete: (lessonId: string) => void }) {
  const [answer, setAnswer] = useState<'hola'|'adios'|''>('');
  const [checked, setChecked] = useState(false);
  const correct = checked && answer === 'hola';
  const isDone = completed.includes('saludos');
  const unitDone = completed.filter(id => ['introduccion','abecedario','saludos'].includes(id)).length;
  return (
    <>
      <div className="lesson-breadcrumb"><Link to="/academia"><ArrowLeft size={15}/> Volver a Academia</Link><span>/</span><span>Unidad 01</span><span>/</span><span>Lección 03</span></div>
      <div className="page-heading lesson-heading"><div><span className="section-eyebrow">UNIDAD 01 · LECCIÓN 03</span><h1>Saludos y despedidas</h1><p>Identifica expresiones habituales para comenzar y terminar un encuentro.</p></div><span className={`status-chip ${isDone?'finished':''}`}>{isDone?'Completada':'En progreso'}</span></div>
      <div className="lesson-layout"><div className="lesson-main">
        <section className="white-card lesson-media"><div className="lesson-section-top"><span>01 / OBSERVA</span><span><Clock3 size={14}/> Recurso audiovisual</span></div><div className="video-placeholder"><div className="play-circle"><CirclePlay size={31}/></div><strong>Demostración de LSP</strong><p>El video real de esta seña se incorporará después de su validación lingüística.</p></div><div className="media-foot"><Info size={15}/> Material audiovisual pendiente de incorporación y revisión.</div></section>
        <section className="white-card lesson-article"><span className="section-eyebrow">02 / APRENDE</span><h2>¿Cuándo usamos estas expresiones?</h2><p>Al encontrarnos con alguien, generalmente saludamos; cuando termina el encuentro, nos despedimos. Aprender LSP exige observar la forma, el movimiento y el contexto de cada seña.</p><div className="concept-grid"><div><span className="concept-symbol"><Sparkles size={22}/></span><h3>Saludar</h3><p>Al comenzar una interacción.</p><strong>«Hola»</strong></div><div><span className="concept-symbol mint"><ArrowRight size={22}/></span><h3>Despedirse</h3><p>Al terminar una interacción.</p><strong>«Adiós»</strong></div></div><p className="lesson-warning"><Info size={16}/> Las palabras son ejemplos de significado. Esta demostración no enseña cómo ejecutar una seña sin un video validado.</p></section>
        <section className="white-card lesson-article quiz"><span className="section-eyebrow">03 / PONTE A PRUEBA</span><h2>Comprueba lo aprendido</h2><p>Acabas de llegar al instituto y encuentras a un compañero. ¿Qué expresión corresponde utilizar?</p>
          <fieldset><legend className="sr-only">Elige una respuesta</legend>
            <label className={`answer ${answer==='hola'?'selected':''} ${checked&&answer==='hola'?'right':''}`}><input type="radio" name="greeting" checked={answer==='hola'} onChange={()=>{setAnswer('hola');setChecked(false)}}/><span>A</span>Hola</label>
            <label className={`answer ${answer==='adios'?'selected':''} ${checked&&answer==='adios'?'wrong':''}`}><input type="radio" name="greeting" checked={answer==='adios'} onChange={()=>{setAnswer('adios');setChecked(false)}}/><span>B</span>Adiós</label>
          </fieldset>
          <div className="quiz-actions"><button className="button button-primary" disabled={!answer} onClick={()=>setChecked(true)}>Comprobar respuesta <ArrowRight size={17}/></button>{checked&&<p role="status" className={correct?'success-message':'error-message'}>{correct?'✓ ¡Correcto! Para iniciar el encuentro corresponde saludar.':'Inténtalo de nuevo: piensa en lo que harías al llegar.'}</p>}</div>
        </section>
        <div className="finish-actions"><Link to="/academia" className="button button-outline"><ArrowLeft size={17}/> Volver a academia</Link><button className="button button-primary" disabled={!correct||isDone} onClick={()=>onComplete('saludos')}>{isDone?<><Check size={17}/> Lección completada</>:<>Marcar como completada <Check size={17}/></>}</button></div>
        <p className="demo-note">La interacción de esta lección es conceptual y no evalúa todavía la ejecución real de la seña. El resultado se guarda solo en este navegador.</p>
      </div><aside className="lesson-aside"><section className="white-card unit-outline"><h3><BookOpen size={19}/> Contenido de la unidad</h3><div className="bar"><div style={{width:`${unitDone/3*100}%`}}/></div><span className="unit-completion">{unitDone} de 3 lecciones</span><div className="outline-row"><CheckCircle2 size={18}/><div><strong>1. Introducción a la LSP</strong><span>Completada (demo)</span></div></div><div className="outline-row"><CheckCircle2 size={18}/><div><strong>2. Abecedario manual</strong><span>Completada (demo)</span></div></div><div className="outline-row active"><span className="outline-dot">3</span><div><strong>3. Saludos y despedidas</strong><span>{isDone?'Completada':'Estás aquí'}</span></div></div><p className="outline-lock"><LockKeyhole size={15}/> Evaluación de unidad (próximamente)</p></section><section className="study-tip"><h3><Sparkles size={18}/> Consejo de estudio</h3><p>Fíjate en la forma de las manos, su movimiento y las expresiones faciales. Las señas deben aprenderse con materiales revisados por personas competentes en LSP.</p></section></aside></div>
    </>
  );
}
