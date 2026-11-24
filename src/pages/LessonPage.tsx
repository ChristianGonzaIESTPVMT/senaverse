import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Camera, CheckCircle2, Info, LibraryBig, Sparkles } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { LessonActivity } from '../components/LessonActivity';
import { LessonSequence } from '../components/LessonSequence';
import { MotionProgress } from '../components/MotionProgress';
import { SignMediaViewer } from '../components/SignMediaViewer';
import { functionalLessons, getCurriculumProgress, getLessonLocation, getLessonPath, getUnitPath, units, type Lesson, type Unit } from '../data/curriculum';
import { getEducationalSign, getLibrarySignPath } from '../data/library';
import { useStudentProgress } from '../hooks/progressContext';

type LessonPageProps = { completed: string[]; onVisit: (lessonId: string) => void };

export function LessonPage(props: LessonPageProps) {
  const { unitId, lessonId } = useParams();
  const unit = units.find(item => String(item.id) === unitId);
  if (!unit) return <Navigate to="/academia" replace />;

  const lesson = unit.lessons.find(item => item.id === lessonId);
  if (!lesson) {
    const location = getLessonLocation(lessonId ?? '');
    return <Navigate to={location ? getLessonPath(location.unit.id, location.lesson.id) : getUnitPath(unit.id)} replace />;
  }
  return <LessonContent key={lesson.id} unit={unit} lesson={lesson} {...props} />;
}

function LessonContent({ unit, lesson, completed, onVisit }: LessonPageProps & { unit: Unit; lesson: Lesson }) {
  const { progress } = useStudentProgress();
  const lessonIndex = unit.lessons.findIndex(item => item.id === lesson.id);
  const isDone = lesson.plan ? !!progress.lessonStudy?.[lesson.id]?.completedAt : completed.includes(lesson.id);
  const unitProgress = getCurriculumProgress(progress).unitProgress.find(item => item.unit.id === unit.id);
  const next = functionalLessons[functionalLessons.findIndex(item => item.lesson.id === lesson.id) + 1];
  useEffect(() => { onVisit(lesson.id); }, [lesson.id, onVisit]);

  return (
    <div className="learning-lesson-page sv-motion">
      <nav className="lesson-breadcrumb" aria-label="Ruta de aprendizaje">
        <Link to="/academia">Aprender</Link><span aria-hidden="true">/</span>
        <Link to={getUnitPath(unit.id)}>Unidad {unit.id}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">Lección {lessonIndex + 1}</span>
      </nav>
      <div className="page-heading lesson-heading">
        <div><span className="section-eyebrow">UNIDAD {String(unit.id).padStart(2, '0')} · LECCIÓN {String(lessonIndex + 1).padStart(2, '0')}</span><h1>{lesson.title}</h1><p>{lesson.description}</p></div>
        <span className={`status-chip${isDone ? ' finished' : ''}`}>{lesson.plan ? isDone ? 'Completada' : progress.lessonStudy?.[lesson.id] ? 'En progreso' : 'Disponible'
          : isDone ? 'Finalización anterior' : 'Material preliminar'}</span>
      </div>
      <div className="lesson-layout">
        {lesson.plan ? <LessonSequence lessonId={lesson.id} plan={lesson.plan} unitPath={getUnitPath(unit.id)}
          nextPath={next && getLessonPath(next.unit.id, next.lesson.id)} />
          : <LegacyLesson content={lesson.content} unit={unit} />}

        <aside className="lesson-aside">
          <section className="white-card unit-outline learning-lesson-outline">
            <h3><BookOpen size={19} aria-hidden="true" /> Contenido de la unidad</h3>
            {unitProgress?.count ? <><MotionProgress value={unitProgress.done} max={unitProgress.count} label="Avance de la unidad" />
              <span className="unit-completion">{unitProgress.done} de {unitProgress.count} lecciones funcionales</span></> : <span className="unit-completion">Material preliminar</span>}
            {unit.lessons.map((item, index) => {
                const done = item.plan ? !!progress.lessonStudy?.[item.id]?.completedAt : completed.includes(item.id);
              const current = item.id === lesson.id;
              return (
                <Link className={`outline-row${current ? ' active' : ''}${done ? ' is-completed' : ''}`} key={item.id} to={getLessonPath(unit.id, item.id)} aria-current={current ? 'page' : undefined}>
                  {done ? <CheckCircle2 size={18} aria-hidden="true" /> : <span className="outline-dot" aria-hidden="true">{index + 1}</span>}
                  <div><strong>{index + 1}. {item.title}</strong><span>{current ? 'Estás aquí' : item.plan ? done ? 'Completada' : progress.lessonStudy?.[item.id] ? 'En progreso' : 'Disponible'
                    : done ? 'Finalización anterior' : 'Material preliminar'}</span></div>
                </Link>
              );
            })}
          </section>
          <section className="study-tip"><h3><Sparkles size={18} aria-hidden="true" /> Consejo de estudio</h3><p>Fíjate en la forma de las manos, su movimiento y las expresiones faciales. Las señas deben aprenderse con materiales revisados por personas competentes en LSP.</p></section>
        </aside>
      </div>
    </div>
  );
}

function LegacyLesson({ content, unit }: { content: NonNullable<Lesson['content']>; unit: Unit }) {
  const sign = content.signId ? getEducationalSign(content.signId) : undefined;
  return (
    <div className="lesson-main">
      <section className="white-card lesson-article">
        <h2>Material visual</h2>
        {sign ? <SignMediaViewer sign={sign} /> : <p>Referencia visual pendiente de incorporaci?n.</p>}
      </section>

      <section className="white-card lesson-article">
        <span className="section-eyebrow">02 / APRENDE</span><h2>{content.heading}</h2><p>{content.explanation}</p>
        {content.concepts && <div className="concept-grid">{content.concepts.map((concept, index) => (
          <div key={concept.title}><span className={`concept-symbol${index === 1 ? ' mint' : ''}`}>{index === 0 ? <Sparkles size={22} aria-hidden="true" /> : <ArrowRight size={22} aria-hidden="true" />}</span><h3>{concept.title}</h3><p>{concept.description}</p><strong>{concept.example}</strong></div>
        ))}</div>}
        <p className="lesson-warning"><Info size={16} aria-hidden="true" /> La configuración de las manos, la orientación y el movimiento se detallarán con las demostraciones de LSP validadas.</p>
      </section>

      <LessonActivity activity={content.activity} />
      <div className="learning-resource-links"><Link to="/biblioteca"><LibraryBig size={18} aria-hidden="true" /> Consultar la Biblioteca de señas <ArrowRight size={17} aria-hidden="true" /></Link></div>
      {content.practiceSignId && <aside className="recommendation">
        <div className="recommendation-icon"><Camera size={22} aria-hidden="true" /></div>
          <div><strong>Consulta la ficha de esta seña</strong><p>Revisa el significado y los recursos disponibles en la Biblioteca.</p></div>
          <Link to={getLibrarySignPath(content.practiceSignId)}>Ver ficha <ArrowRight size={16} aria-hidden="true" /></Link>
      </aside>}
      <div className="finish-actions">
        <Link to={getUnitPath(unit.id)} className="button button-outline"><ArrowLeft size={17} aria-hidden="true" /> Volver a las lecciones</Link>
      </div>
      <p className="demo-note">Actividad conceptual de consulta. Las lecciones con un recorrido completo registran el avance en Mi progreso.</p>
    </div>
  );
}
