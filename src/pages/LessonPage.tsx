import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Camera, Check, CheckCircle2, CirclePlay, Clock3, Info, LibraryBig, RotateCcw, Sparkles } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { LessonActivity } from '../components/LessonActivity';
import { getLessonLocation, getLessonPath, getResumeLesson, getUnitPath, units, type Lesson, type Unit } from '../data/curriculum';
import { libraryEntries } from '../data/library';
import { getFreePracticePath } from '../data/practice';
import type { LearningActivity } from '../hooks/useLearningActivity';

type LessonPageProps = { completed: string[]; activity: LearningActivity; onComplete: (lessonId: string) => void; onVisit: (lessonId: string) => void };

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

function LessonContent({ unit, lesson, completed, activity, onComplete, onVisit }: LessonPageProps & { unit: Unit; lesson: Lesson }) {
  const [passed, setPassed] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const lessonIndex = unit.lessons.findIndex(item => item.id === lesson.id);
  const isDone = completed.includes(lesson.id);
  const unitDone = unit.lessons.filter(item => completed.includes(item.id)).length;
  const sign = libraryEntries.find(item => item.id === lesson.content.signId);
  const videoSrc = lesson.content.videoSrc ?? sign?.videoSrc;
  const captionsSrc = lesson.content.captionsSrc ?? sign?.captionsSrc;
  const next = getResumeLesson(completed);
  const hasPending = units.some(item => item.lessons.some(entry => !completed.includes(entry.id)));

  useEffect(() => { onVisit(lesson.id); }, [lesson.id, onVisit]);

  useEffect(() => {
    const video = videoRef.current;
    return () => video?.pause();
  }, [videoSrc]);

  function repeatVideo() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => setMediaError('No se pudo reproducir el video. Puedes volver a intentarlo desde sus controles.'));
  }

  return (
    <div className="learning-lesson-page">
      <nav className="lesson-breadcrumb" aria-label="Ruta de aprendizaje">
        <Link to="/academia">Aprender</Link><span aria-hidden="true">/</span>
        <Link to={getUnitPath(unit.id)}>Unidad {unit.id}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">Lección {lessonIndex + 1}</span>
      </nav>
      <div className="page-heading lesson-heading">
        <div><span className="section-eyebrow">UNIDAD {String(unit.id).padStart(2, '0')} · LECCIÓN {String(lessonIndex + 1).padStart(2, '0')}</span><h1>{lesson.title}</h1><p>{lesson.description}</p></div>
        <span className={`status-chip${isDone ? ' finished' : ''}`}>{isDone ? 'Completada' : 'En progreso'}</span>
      </div>
      <div className="lesson-layout">
        <div className="lesson-main">
          <section className="white-card lesson-media">
            <div className="lesson-section-top"><span>01 / OBSERVA</span><span><Clock3 size={14} aria-hidden="true" /> Recurso audiovisual</span></div>
            {videoSrc ? <>
              <video className="learning-lesson-video" key={videoSrc} ref={videoRef} controls playsInline preload="metadata" poster={lesson.content.thumbnailSrc ?? sign?.thumbnailSrc} aria-label={`Demostración de ${lesson.title}`} onLoadedData={() => setMediaError('')} onError={() => setMediaError('El video no se pudo cargar. Revisa el recurso e inténtalo nuevamente.')}>
                <source src={videoSrc} />
                {captionsSrc && <track kind="captions" src={captionsSrc} srcLang="es" label="Español" default />}
                Tu navegador no admite la reproducción de este video.
              </video>
              <button className="button button-outline learning-video-repeat" type="button" onClick={repeatVideo}><RotateCcw size={17} aria-hidden="true" /> Repetir video</button>
            </> : <div className="video-placeholder"><div className="play-circle"><CirclePlay size={31} aria-hidden="true" /></div><strong>Demostración de LSP</strong><p>El video de esta lección se incorporará después de su validación lingüística.</p></div>}
            {mediaError && <p className="error-message" role="alert">{mediaError}</p>}
            {!videoSrc && <div className="media-foot"><Info size={15} aria-hidden="true" /> Material audiovisual pendiente de incorporación y revisión.</div>}
          </section>

          <section className="white-card lesson-article">
            <span className="section-eyebrow">02 / APRENDE</span><h2>{lesson.content.heading}</h2><p>{lesson.content.explanation}</p>
            {lesson.content.concepts && <div className="concept-grid">{lesson.content.concepts.map((concept, index) => (
              <div key={concept.title}><span className={`concept-symbol${index === 1 ? ' mint' : ''}`}>{index === 0 ? <Sparkles size={22} aria-hidden="true" /> : <ArrowRight size={22} aria-hidden="true" />}</span><h3>{concept.title}</h3><p>{concept.description}</p><strong>{concept.example}</strong></div>
            ))}</div>}
            <p className="lesson-warning"><Info size={16} aria-hidden="true" /> La configuración de las manos, la orientación y el movimiento se detallarán con las demostraciones de LSP validadas.</p>
          </section>

          <LessonActivity activity={lesson.content.activity} onResult={setPassed} />
          <div className="learning-resource-links"><Link to="/biblioteca"><LibraryBig size={18} aria-hidden="true" /> Consultar la Biblioteca de señas <ArrowRight size={17} aria-hidden="true" /></Link></div>
          {lesson.content.practiceSignId && <aside className="recommendation">
            <div className="recommendation-icon"><Camera size={22} aria-hidden="true" /></div>
            <div><strong>Prepara tu práctica de este saludo</strong><p>Abre «Hola» en el Centro de práctica. El reconocimiento está pendiente de integración.</p></div>
            <Link to={getFreePracticePath(lesson.content.practiceSignId)}>Practicar con cámara <ArrowRight size={16} aria-hidden="true" /></Link>
          </aside>}
          <div className="finish-actions">
            <Link to={getUnitPath(unit.id)} className="button button-outline"><ArrowLeft size={17} aria-hidden="true" /> Volver a las lecciones</Link>
            <button className="button button-primary" type="button" disabled={!passed || isDone} onClick={() => onComplete(lesson.id)}>{isDone ? <><Check size={17} aria-hidden="true" /> Lección completada</> : <>Marcar como completada <Check size={17} aria-hidden="true" /></>}</button>
          </div>
          {isDone && hasPending && <div className="learning-next-step"><Link to={getLessonPath(next.unit.id, next.lesson.id)} className="button button-outline">Continuar aprendizaje <ArrowRight size={18} aria-hidden="true" /></Link></div>}
          <p className="demo-note">La evaluación de esta lección es conceptual. La ejecución de las señas se evaluará con los recursos y el reconocimiento correspondientes. El progreso se guarda en este navegador e incluye datos de muestra.</p>
        </div>

        <aside className="lesson-aside">
          <section className="white-card unit-outline learning-lesson-outline">
            <h3><BookOpen size={19} aria-hidden="true" /> Contenido de la unidad</h3>
            <div className="bar"><div style={{ width: `${unitDone / unit.lessons.length * 100}%` }} /></div>
            <span className="unit-completion">{unitDone} de {unit.lessons.length} lecciones</span>
            {unit.lessons.map((item, index) => {
              const done = completed.includes(item.id);
              const current = item.id === lesson.id;
              return (
                <Link className={`outline-row${current ? ' active' : ''}${done ? ' is-completed' : ''}`} key={item.id} to={getLessonPath(unit.id, item.id)} aria-current={current ? 'page' : undefined}>
                  {done ? <CheckCircle2 size={18} aria-hidden="true" /> : <span className="outline-dot" aria-hidden="true">{index + 1}</span>}
                  <div><strong>{index + 1}. {item.title}</strong><span>{current ? 'Estás aquí' : done ? 'Completada' : activity.startedLessonIds.includes(item.id) ? 'En progreso' : 'Disponible'}</span></div>
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
