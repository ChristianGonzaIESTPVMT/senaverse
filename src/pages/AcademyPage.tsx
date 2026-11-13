import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, House, Layers3, Play, UsersRound } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { HomeVisual } from '../components/HomeVisual';
import { getLessonLocation, getLessonPath, getNextLesson, getResumeLesson, getUnitPath, totalLessons, units, type Unit } from '../data/curriculum';
import type { LearningActivity } from '../hooks/useLearningActivity';
import './AcademyPage.css';

type AcademyProps = { completed: string[]; activity: LearningActivity };

function UnitIllustration({ unit }: { unit: Unit }) {
  return (
    <div className={`learning-unit-art learning-unit-art-${unit.illustration}`} aria-hidden="true">
      {unit.illustration === 'greetings' && <HomeVisual name="welcome" />}
      {unit.illustration === 'alphabet' && <span className="learning-alphabet"><span>A</span><span>B</span><span>C</span></span>}
      {unit.illustration === 'everyday' && <span className="learning-family"><House className="learning-family-house" strokeWidth={1.8} /><UsersRound className="learning-family-people" strokeWidth={1.8} /></span>}
    </div>
  );
}

function UnitLessons({ unit, completed, activity }: AcademyProps & { unit: Unit }) {
  const done = unit.lessons.filter(lesson => completed.includes(lesson.id)).length;

  return (
    <div className="learning-unit-page">
      <nav className="lesson-breadcrumb learning-breadcrumb" aria-label="Ruta de aprendizaje">
        <Link to="/academia"><ArrowLeft size={16} aria-hidden="true" /> Aprender</Link>
        <span aria-hidden="true">/</span><span aria-current="page">Unidad {unit.id}</span>
      </nav>
      <header className="learning-unit-heading">
        <div><span className="learning-unit-eyebrow">UNIDAD {unit.id}</span><h1>{unit.title}</h1><p>{unit.subtitle}</p></div>
        <UnitIllustration unit={unit} />
      </header>
      <section className="learning-unit-progress" aria-label="Progreso de la unidad">
        <div><h2>Progreso de la unidad</h2><span>{done} de {unit.lessons.length} lecciones completadas</span></div>
        <progress value={done} max={unit.lessons.length} aria-label={`Progreso de la unidad ${unit.id}`} />
      </section>
      <div className="learning-section-heading"><h2>Lecciones de la unidad</h2><span>Contenido de muestra</span></div>
      <ol className="learning-lesson-list">
        {unit.lessons.map((lesson, index) => {
          const isDone = completed.includes(lesson.id);
          const isStarted = activity.startedLessonIds.includes(lesson.id);
          const status = isDone ? 'Completada' : isStarted ? 'En progreso' : 'Disponible';
          return (
            <li className={`learning-lesson-row${isDone ? ' is-completed' : ''}`} key={lesson.id}>
              <span className="learning-lesson-number" aria-hidden="true">{isDone ? <Check size={21} /> : index + 1}</span>
              <div className="learning-lesson-copy"><h3>{lesson.title}</h3><p>{lesson.description}</p><span><Clock3 size={14} aria-hidden="true" /> {lesson.duration}</span></div>
              <span className={`learning-lesson-status${isDone ? ' is-completed' : ''}`}>{status}</span>
              <Link className={`button ${isDone ? 'button-outline' : 'button-primary'} learning-lesson-open`} to={getLessonPath(unit.id, lesson.id)}>{isDone ? 'Repasar' : isStarted ? 'Continuar' : 'Comenzar'}<ArrowRight size={17} aria-hidden="true" /></Link>
            </li>
          );
        })}
      </ol>
      <p className="learning-progress-note">El progreso se guarda en este navegador e incluye las lecciones de ejemplo del prototipo.</p>
      <Link className="button button-outline" to="/academia"><ArrowLeft size={18} aria-hidden="true" /> Volver a las unidades</Link>
    </div>
  );
}

export function AcademyPage({ completed, activity }: AcademyProps) {
  const { unitId } = useParams();
  const selectedUnit = units.find(unit => String(unit.id) === unitId);
  if (unitId && !selectedUnit) return <Navigate to="/academia" replace />;
  if (selectedUnit) return <UnitLessons unit={selectedUnit} completed={completed} activity={activity} />;

  const finishedCount = units.flatMap(unit => unit.lessons).filter(lesson => completed.includes(lesson.id)).length;
  const percent = Math.round(finishedCount / totalLessons * 100);
  const current = getResumeLesson(completed, activity.lastLessonId);
  const last = activity.lastLessonId ? getLessonLocation(activity.lastLessonId) : undefined;

  return (
    <div className="learning-page">
      <header className="learning-heading"><h1>Mi ruta de aprendizaje</h1><p>Aprende Lengua de Señas Peruana paso a paso.</p></header>
      <section className="learning-banner" aria-labelledby="learning-banner-title">
        <div className="learning-banner-copy">
          <div><h2 id="learning-banner-title">¡Continúa aprendiendo!</h2><p>Vas por buen camino. Sigue completando lecciones y fortalece tus habilidades en LSP.</p></div>
          <HomeVisual name="hero" />
        </div>
        <div className="learning-banner-stats">
          <div className="learning-banner-stat"><HomeVisual name="progress" /><dl><dt>Progreso general</dt><dd>{percent}%</dd></dl></div>
          <div className="learning-banner-stat"><Check size={32} aria-hidden="true" /><dl><dt>Lecciones completadas</dt><dd>{finishedCount}</dd></dl></div>
          <div className="learning-banner-stat"><Layers3 size={31} aria-hidden="true" /><dl><dt>Unidad actual</dt><dd>Unidad {current.unit.id}</dd></dl></div>
        </div>
      </section>
      <div className="learning-banner-foot"><span>Progreso local · incluye datos de muestra</span>{last && <Link to={getLessonPath(last.unit.id, last.lesson.id)}>Última lección visitada · {last.lesson.title}<ArrowRight size={16} aria-hidden="true" /></Link>}</div>

      <div className="learning-section-heading"><h2>Unidades de aprendizaje</h2></div>
      <section className="learning-units-grid" aria-label="Unidades de aprendizaje">
        {units.map(unit => {
          const done = unit.lessons.filter(lesson => completed.includes(lesson.id)).length;
          const next = getNextLesson(unit, completed);
          const started = done > 0 || unit.lessons.some(lesson => activity.startedLessonIds.includes(lesson.id));
          const isComplete = done === unit.lessons.length;
          const canContinue = started && !!next;
          const status = isComplete ? 'Completada' : started ? 'En progreso' : 'Disponible';
          const actionPath = canContinue ? getLessonPath(unit.id, next.id) : getUnitPath(unit.id);

          return (
            <article className="learning-unit-card" key={unit.id} aria-labelledby={`learning-unit-${unit.id}`}>
              <Link className="learning-unit-picture" to={getUnitPath(unit.id)} aria-label={`Ver unidad ${unit.id}, ${unit.title}`}><UnitIllustration unit={unit} /></Link>
              <h3 id={`learning-unit-${unit.id}`}><Link to={getUnitPath(unit.id)}>Unidad {unit.id} · {unit.title}</Link></h3>
              <p>{unit.subtitle}</p>
              <span className={`learning-unit-status${isComplete ? ' is-completed' : ''}`}>{isComplete && <CheckCircle2 size={15} aria-hidden="true" />}{status}</span>
              <div className="learning-card-progress"><span>{done} de {unit.lessons.length} lecciones completadas</span><progress value={done} max={unit.lessons.length} aria-label={`Progreso de ${unit.title}`} /></div>
              <Link className={`button ${canContinue ? 'button-primary' : 'button-outline'} learning-unit-action`} to={actionPath}>{canContinue ? 'Continuar unidad' : 'Ver unidad'}{canContinue && <ArrowRight size={20} aria-hidden="true" />}{isComplete && <Check size={19} aria-hidden="true" />}{!started && <Play size={17} aria-hidden="true" />}</Link>
            </article>
          );
        })}
      </section>
    </div>
  );
}
