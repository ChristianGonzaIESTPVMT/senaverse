import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Clock3, House, Layers3, Play, UsersRound } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { HomeVisual } from '../components/HomeVisual';
import { functionalLessons, getCurriculumProgress, getLessonLocation, getLessonPath, getUnitPath, units, type Unit } from '../data/curriculum';
import { useStudentProgress } from '../hooks/progressContext';
import type { LearningActivity } from '../hooks/useLearningActivity';
import './AcademyPage.css';

type AcademyProps = { completed: string[]; activity: LearningActivity };

function UnitIllustration({ unit }: { unit: Unit }) {
  return (
    <div className={`learning-unit-art learning-unit-art-${unit.illustration}`} aria-hidden="true">
      {unit.illustration === 'greetings' && <HomeVisual name="welcome" />}
      {unit.illustration === 'numbers' && <span className="learning-alphabet"><span>1</span><span>2</span><span>3</span></span>}
      {unit.illustration === 'everyday' && <span className="learning-family"><House className="learning-family-house" strokeWidth={1.8} /><UsersRound className="learning-family-people" strokeWidth={1.8} /></span>}
      {unit.illustration === 'review' && <span className="learning-review"><ClipboardCheck size={72} strokeWidth={1.8} /></span>}
    </div>
  );
}

function UnitLessons({ unit, completed }: AcademyProps & { unit: Unit }) {
  const { progress } = useStudentProgress();
  const unitProgress = getCurriculumProgress(progress).unitProgress.find(item => item.unit.id === unit.id);

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
        <div><h2>Progreso de la unidad</h2><span>{unitProgress?.count ? `${unitProgress.done} de ${unitProgress.count} lecciones funcionales` : 'Material en preparación'}</span></div>
        {!!unitProgress?.count && <progress value={unitProgress.done} max={unitProgress.count} aria-label={`Progreso de la unidad ${unit.id}`} />}
      </section>
      <div className="learning-section-heading"><h2>Lecciones de la unidad</h2></div>
      <ol className="learning-lesson-list">
        {unit.lessons.map((lesson, index) => {
          const isDone = lesson.plan ? !!progress.lessonStudy?.[lesson.id]?.completedAt : completed.includes(lesson.id);
          const isStarted = !!progress.lessonStudy?.[lesson.id];
          const status = lesson.plan ? isDone ? 'Completada' : isStarted ? 'En progreso' : 'Disponible'
            : isDone ? 'Finalización anterior' : 'Material preliminar';
          return (
            <li className={`learning-lesson-row${isDone ? ' is-completed' : ''}`} key={lesson.id}>
              <span className="learning-lesson-number" aria-hidden="true">{isDone ? <Check size={21} /> : index + 1}</span>
              <div className="learning-lesson-copy"><h3>{lesson.title}</h3><p>{lesson.description}</p><span><Clock3 size={14} aria-hidden="true" /> {lesson.duration}</span></div>
              <span className={`learning-lesson-status${isDone ? ' is-completed' : ''}`}>{status}</span>
              <Link className={`button ${lesson.plan && !isDone ? 'button-primary' : 'button-outline'} learning-lesson-open`} to={getLessonPath(unit.id, lesson.id)}>{lesson.plan ? isDone ? 'Repasar' : isStarted ? 'Continuar' : 'Comenzar' : 'Consultar'}<ArrowRight size={17} aria-hidden="true" /></Link>
            </li>
          );
        })}
      </ol>
      <p className="learning-progress-note">El progreso de las lecciones que completes se guarda en este navegador.</p>
      <Link className="button button-outline" to="/academia"><ArrowLeft size={18} aria-hidden="true" /> Volver a las unidades</Link>
    </div>
  );
}

export function AcademyPage({ completed, activity }: AcademyProps) {
  const { progress } = useStudentProgress();
  const { unitId } = useParams();
  const selectedUnit = units.find(unit => String(unit.id) === unitId);
  if (unitId && !selectedUnit) return <Navigate to="/academia" replace />;
  if (selectedUnit) return <UnitLessons unit={selectedUnit} completed={completed} activity={activity} />;

  const { done: finishedCount, percent, unitProgress, completed: functionalCompletions } = getCurriculumProgress(progress);
  const current = functionalLessons.find(location => !!progress.lessonStudy?.[location.lesson.id] && !functionalCompletions.includes(location.lesson.id))
    ?? functionalLessons.find(location => !functionalCompletions.includes(location.lesson.id));
  const last = activity.lastLessonId ? getLessonLocation(activity.lastLessonId) : undefined;

  return (
    <div className="learning-page">
      <header className="learning-heading"><h1>Mi ruta de aprendizaje</h1><p>Aprende Lengua de Señas Peruana paso a paso.</p></header>
      <section className="learning-banner" aria-labelledby="learning-banner-title">
        <div className="learning-banner-copy">
          <div><h2 id="learning-banner-title">{current ? '¡Continúa aprendiendo!' : 'Nivel básico completado'}</h2>
            <p>{current ? 'Completa las lecciones a tu ritmo y practica con las referencias de LSP.'
              : 'Puedes repasar cualquier lección o repetir las evaluaciones.'}</p></div>
          <HomeVisual name="hero" />
        </div>
        <div className="learning-banner-stats">
          <div className="learning-banner-stat"><HomeVisual name="progress" /><dl><dt>Progreso general</dt><dd>{percent}%</dd></dl></div>
          <div className="learning-banner-stat"><Check size={32} aria-hidden="true" /><dl><dt>Lecciones completadas</dt><dd>{finishedCount}</dd></dl></div>
          <div className="learning-banner-stat"><Layers3 size={31} aria-hidden="true" /><dl>
            <dt>{current ? 'Unidad de práctica' : 'Unidades completadas'}</dt><dd>{current ? `Unidad ${current.unit.id}` : unitProgress.length}</dd>
          </dl></div>
        </div>
      </section>
      <div className="learning-banner-foot"><span>Progreso local · lecciones completadas</span>{last && <Link to={getLessonPath(last.unit.id, last.lesson.id)}>Última lección visitada · {last.lesson.title}<ArrowRight size={16} aria-hidden="true" /></Link>}</div>

      <div className="learning-section-heading"><h2>Nivel básico</h2></div>
      <p>{unitProgress.length} unidades · {functionalLessons.length} lecciones disponibles</p>
      <section className="learning-units-grid" aria-label="Unidades de aprendizaje">
        {unitProgress.map(({ unit, count, done }) => {
          const next = unit.lessons.find(lesson => lesson.plan && !functionalCompletions.includes(lesson.id));
          const started = done > 0 || unit.lessons.some(lesson => !!progress.lessonStudy?.[lesson.id]);
          const isComplete = !!count && done === count;
          const canContinue = started && !!next;
          const status = isComplete ? 'Completada' : started ? 'En progreso' : count ? 'Disponible' : 'Material preliminar';
          const actionPath = canContinue ? getLessonPath(unit.id, next.id) : getUnitPath(unit.id);

          return (
            <article className="learning-unit-card" key={unit.id} aria-labelledby={`learning-unit-${unit.id}`}>
              <Link className="learning-unit-picture" to={getUnitPath(unit.id)} aria-label={`Ver unidad ${unit.id}, ${unit.title}`}><UnitIllustration unit={unit} /></Link>
              <h3 id={`learning-unit-${unit.id}`}><Link to={getUnitPath(unit.id)}>Unidad {unit.id} · {unit.title}</Link></h3>
              <p>{unit.subtitle}</p>
              <span className={`learning-unit-status${isComplete ? ' is-completed' : ''}`}>{isComplete && <CheckCircle2 size={15} aria-hidden="true" />}{status}</span>
              {!!count && <div className="learning-card-progress"><span>{done} de {count} lecciones funcionales</span><progress value={done} max={count} aria-label={`Progreso de ${unit.title}`} /></div>}
              <Link className={`button ${canContinue ? 'button-primary' : 'button-outline'} learning-unit-action`} to={actionPath}>{canContinue ? 'Continuar unidad' : 'Ver unidad'}{canContinue && <ArrowRight size={20} aria-hidden="true" />}{isComplete && <Check size={19} aria-hidden="true" />}{!started && <Play size={17} aria-hidden="true" />}</Link>
            </article>
          );
        })}
      </section>
      <p className="learning-progress-note">Completar la ruta registra tu avance en el nivel básico de SeñaVerse.</p>
    </div>
  );
}
