import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Award, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Gamepad2, GraduationCap, Hand, Hash, History, Layers, LockKeyhole, Star, Target, UsersRound, X, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomeVisual } from '../components/HomeVisual';
import { getUnitPath } from '../data/curriculum';
import { STUDENT_TIME_ZONE } from '../data/learningCalendar';
import { minigames } from '../data/minigames';
import { situations } from '../data/situations';
import { selectStudentOverview, type StudentAchievement } from '../data/studentOverview';
import { StudentActivityList } from '../components/StudentActivityList';
import { StudentLevel } from '../components/StudentLevel';
import { MotionProgress } from '../components/MotionProgress';
import { MotionValue } from '../components/MotionValue';
import { useStudentProgress, type AchievementMotion } from '../hooks/progressContext';
import { useStudentOverview } from '../hooks/useStudentOverview';
import './ProgressPage.css';

const dayLabel = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: STUDENT_TIME_ZONE });
const unitIcons = { greetings: Hand, alphabet: Hash, numbers: Hash, everyday: UsersRound, review: ClipboardCheck };
const achievementIcons: Record<string, typeof Award> = {
  'first-step': GraduationCap,
  explorer: Star,
  consistency: Layers,
  numbers: Hash,
  'first-practice': Hand,
  communicator: UsersRound,
  play: Gamepad2,
  streak: CalendarDays,
  'reference-explorer': BookOpen,
  learner: Zap,
};

function ProgressGlyph() {
  return <span className="progress-glyph" aria-hidden="true"><i /><i /><i /></span>;
}

function AchievementCard({ achievement, detailed = false, motion }: { achievement: StudentAchievement; detailed?: boolean; motion?: AchievementMotion }) {
  const Icon = achievementIcons[achievement.id] ?? Award;
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = card.current;
    const id = achievement.id;
    if (!element || !motion || motion.shown.has(id)) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      if (motion.shown.has(id)) return;
      motion.shown.add(id);
      element.dataset.newAchievement = 'true';
    }, { threshold: .3 });
    observer.observe(element);
    return () => { observer.disconnect(); delete element.dataset.newAchievement; };
  }, [achievement.id, motion]);
  return (
    <article className={`progress-achievement sv-motion-lift progress-achievement-${achievement.id}${achievement.obtained ? ' is-obtained' : ' is-locked'}`} title={achievement.description} ref={card} tabIndex={0}>
      <div className="progress-badge-art" aria-hidden="true"><Award className="progress-badge-rays" /><span><Icon strokeWidth={1.8} /></span>
        {motion && <svg className="lesson-completion-burst progress-achievement-burst" width="76" height="76" viewBox="0 0 76 76" fill="none" focusable="false">
          <path d="M38 3v6m25 4-5 5m15 20h-6m-4 25-5-5M38 73v-6M13 63l5-5M3 38h6m4-25 5 5" />
        </svg>}
      </div>
      <h3>{achievement.name}</h3>
      {detailed && <p>{achievement.description}</p>}
      <span className="progress-achievement-status">{achievement.obtained ? <Check size={16} aria-hidden="true" /> : <LockKeyhole size={14} aria-hidden="true" />}{achievement.obtained ? 'Obtenido' : 'Bloqueado'}</span>
      {motion && <small className="progress-achievement-new" role="status">Nuevo logro</small>}
      {detailed && (achievement.obtained ? achievement.obtainedAt
        ? <time dateTime={achievement.obtainedAt}>{dayLabel.format(new Date(achievement.obtainedAt))}</time>
        : <small>Fecha no disponible</small> : <small>{achievement.value} de {achievement.goal}</small>)}
    </article>
  );
}

function EmptyActivity() {
  return <div className="progress-empty">
    <span><BookOpen size={26} aria-hidden="true" /></span>
    <div><h3>Tu próxima lección es el primer paso</h3><p>Aquí verás tus consultas y actividades registradas.</p><Link to="/academia/unidad/2/leccion/numeros">Empezar a aprender <ArrowRight size={15} aria-hidden="true" /></Link></div>
  </div>;
}

export function ProgressPage() {
  const { now, summary } = useStudentOverview();
  const { achievementMotion } = useStudentProgress();
  const previousProgress = achievementMotion?.previous;
  const previousAchievements = useMemo(() => previousProgress
    ? new Set(selectStudentOverview(previousProgress, now).latestAchievements.map(badge => badge.id))
    : undefined, [previousProgress, now]);
  const motionFor = (achievement: StudentAchievement) => achievement.obtained && !previousAchievements?.has(achievement.id) ? achievementMotion : undefined;
  const achievementsRef = useRef<HTMLDialogElement>(null);
  const historyRef = useRef<HTMLDialogElement>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(summary.history.length / pageSize));
  const page = Math.min(historyPage, pageCount);

  const statistics = [
    { label: 'Lecciones completadas', value: summary.curriculum.done, icon: BookOpen },
    { label: 'Prácticas registradas', value: summary.practices, icon: Target },
    { label: 'XP acumulados', value: summary.xp, icon: Zap },
  ];
  const featured = (summary.latestAchievements.length ? summary.latestAchievements : summary.achievements).slice(0, 3);
  const weekMaximum = Math.max(...summary.calendar.week.map(day => day.count));

  return (
    <div className="progress-page sv-motion">
      <nav className="progress-mobile-breadcrumb" aria-label="Ruta de progreso"><Link to="/">SeñaVerse</Link><span aria-hidden="true">/</span><span aria-current="page">Mi progreso</span></nav>
      <header className="progress-heading">
        <div className="progress-heading-icon"><ProgressGlyph /></div>
        <div><h1>Mi progreso</h1><p>Observa tus avances y celebra cada logro.</p></div>
        <div className="progress-heading-art" aria-hidden="true"><HomeVisual name="hero" /><i /><i /><i /></div>
      </header>

      <div className="progress-overview">
        <section className="progress-overall sv-motion-enter" aria-labelledby="progress-overall-title">
          <div className="progress-overall-icon"><ProgressGlyph /></div>
          <div className="progress-overall-copy">
            <h2 id="progress-overall-title">Progreso general</h2>
            <strong>{summary.curriculum.percent}%</strong>
            {!!summary.curriculum.total && <MotionProgress value={summary.curriculum.done} max={summary.curriculum.total}
              label={`Progreso general: ${summary.curriculum.done} lecciones de ${summary.curriculum.total} funcionales`} />}
            <p>{summary.curriculum.done} de {summary.curriculum.total} lecciones funcionales.</p>
            {!!summary.historicalLessons && <p>{summary.historicalLessons} {summary.historicalLessons === 1 ? 'finalización anterior' : 'finalizaciones anteriores'} en el historial.</p>}
          </div>
        </section>
        <dl className="progress-statistics">{statistics.map(({ label, value, icon: Icon }, index) => <div className="progress-statistic sv-motion-enter" key={label}
          style={{ '--sv-entry-step': index + 1 } as CSSProperties}>
          <Icon size={35} strokeWidth={1.9} aria-hidden="true" /><dt>{label}</dt>
          <dd><MotionValue value={value} formatted={value.toLocaleString('es-PE')} />
            {label === 'Prácticas registradas' && <small>{summary.matches} coincidencias experimentales · {summary.alternatives} ejercicios sin cámara</small>}
          </dd>
        </div>)}</dl>
      </div>

      <section className="progress-panel progress-motivation" aria-label="Nivel y racha">
        <StudentLevel level={summary.level} xp={summary.xp} motion />
        <dl><div><dt>Racha actual</dt><dd><MotionValue value={summary.calendar.current} /> {summary.calendar.current === 1 ? 'día' : 'días'}</dd></div>
          <div><dt>Mejor racha</dt><dd><MotionValue value={summary.calendar.best} /> {summary.calendar.best === 1 ? 'día' : 'días'}</dd></div></dl>
        <small>El nivel refleja tu participación y avance en SeñaVerse.</small>
      </section>

      <div className="progress-details">
        <section className="progress-panel progress-units" aria-labelledby="progress-units-title">
          <div className="progress-section-heading"><h2 id="progress-units-title"><Layers aria-hidden="true" /> Avance de mis unidades</h2></div>
          <ul className="progress-unit-list">{summary.curriculum.unitProgress.map(({ unit, count, done, percent }) => {
            const Icon = unitIcons[unit.illustration];
            return <li key={unit.id}><Link to={getUnitPath(unit.id)} className={`progress-unit${percent === 100 ? ' is-complete' : ''}`}>
              <span className="progress-unit-icon"><Icon size={35} strokeWidth={1.8} aria-hidden="true" /></span>
              <div className="progress-unit-copy"><div><h3>Unidad {unit.id}: {unit.title}</h3>{percent !== null && <span className={`progress-percent${percent === 0 ? ' is-zero' : ''}`}>{percent}%</span>}</div>
                <p>{count ? `${done} de ${count} lecciones funcionales` : 'Material en preparación'}</p>
                {!!count && <MotionProgress value={done} max={count} label={`Avance en ${unit.title}`} />}</div>
            </Link></li>;
          })}</ul>
          <dl className="progress-module-stats">
            <div><dt>Aprender</dt><dd>{summary.lessonStarts} lecciones iniciadas · <MotionValue value={summary.lessonSteps} /> actividades completadas</dd></div>
            <div><dt>Biblioteca y estudio</dt><dd>{summary.consulted} fichas consultadas · {summary.studied} señas estudiadas</dd></div>
            <div><dt>Situaciones</dt><dd>{summary.completedSituations} de {situations.length} finalizadas · {summary.situationStarts} iniciadas · {summary.situationInteractions} interacciones</dd>
              <dd>{summary.situationCorrect} respuestas correctas · {summary.situationErrors} incorrectas</dd></div>
            <div><dt>Minijuegos</dt><dd>{summary.completedGames} de {minigames.length} completados · {summary.gameRuns} partidas</dd>
              <dd>{summary.gameCorrect} aciertos · {summary.gameErrors} errores registrados</dd></div>
          </dl>
          {summary.evaluations.length > 0 && <div className="progress-evaluations"><h3>Evaluaciones</h3><ul>{summary.evaluations.map(evaluation => <li key={evaluation.id}>{evaluation.title} · {evaluation.score} de {evaluation.total}{evaluation.attempts > 1 && ` · ${evaluation.attempts} intentos`}</li>)}</ul></div>}
        </section>

        <div className="progress-right-column">
          <section className="progress-panel progress-achievements" aria-labelledby="progress-achievements-title">
            <div className="progress-section-heading"><h2 id="progress-achievements-title"><Award aria-hidden="true" /> Mis logros</h2><button type="button" className="progress-secondary sv-motion-action" onClick={() => achievementsRef.current?.showModal()} aria-haspopup="dialog">Ver todos <ArrowRight size={17} aria-hidden="true" /></button></div>
            <div className="progress-achievement-grid">{featured.map(achievement => <AchievementCard key={achievement.id} achievement={achievement} motion={motionFor(achievement)} />)}</div>
          </section>

          <section className="progress-panel progress-recent" aria-labelledby="progress-recent-title">
            <div className="progress-section-heading"><h2 id="progress-recent-title"><Clock3 aria-hidden="true" /> Actividad reciente</h2></div>
            {summary.history.length ? <StudentActivityList activities={summary.history.slice(0, 4)} now={now} /> : <EmptyActivity />}
            <button type="button" className="progress-history-link sv-motion-action" aria-haspopup="dialog" onClick={() => { setHistoryPage(1); historyRef.current?.showModal(); }}>Ver historial <ArrowRight size={15} aria-hidden="true" /></button>
          </section>
        </div>
      </div>

      <div className="progress-details progress-extra">
        <section className="progress-panel" aria-labelledby="progress-week-title">
          <div className="progress-section-heading"><h2 id="progress-week-title"><CalendarDays aria-hidden="true" /> Actividad de los últimos siete días</h2></div>
          {weekMaximum ? <ul className="progress-week">{summary.calendar.week.map(day => <li key={day.id}>
            <span>{day.label}</span><span className="progress-week-meter sv-motion-progress">
              <meter min={0} max={weekMaximum} value={day.count} aria-label={`Actividades del ${day.label}`} />
              <span className="sv-motion-progress-fill" aria-hidden="true" style={{ '--sv-progress-value': day.count / weekMaximum } as CSSProperties} />
            </span><strong>{day.count}</strong>
          </li>)}</ul> : <p>Aún no hay actividades educativas fechadas en estos siete días.</p>}
        </section>
        <section className="progress-panel" aria-labelledby="progress-records-title">
          <div className="progress-section-heading"><h2 id="progress-records-title"><Gamepad2 aria-hidden="true" /> Récords personales</h2></div>
          {summary.records.some(record => record.best || record.legacyBest !== undefined) ? <ul className="progress-record-list">
            {summary.records.filter(record => record.best || record.legacyBest !== undefined).map(record => <li key={record.game.id}>
            <Link to={record.path}>{record.game.title}</Link>
            {record.best && <strong>{record.best.score} puntos de partida</strong>}
            {record.legacyBest !== undefined && <small>Récord anterior · {record.legacyBest} puntos</small>}
          </li>)}</ul> : <p>Al completar una partida verás tu mejor puntuación aquí.</p>}
        </section>
      </div>

      <dialog className="progress-dialog sv-motion-dialog" ref={achievementsRef} aria-labelledby="progress-all-achievements-title" onClick={event => { if (event.target === event.currentTarget) achievementsRef.current?.close(); }}>
        <div className="progress-dialog-heading"><h2 id="progress-all-achievements-title"><Award aria-hidden="true" /> Todos mis logros</h2><button type="button" autoFocus aria-label="Cerrar logros" onClick={() => achievementsRef.current?.close()}><X size={22} /></button></div>
        <p className="progress-dialog-intro">Cada pequeño avance merece celebrarse. Descubre cómo conseguir tus insignias.</p>
        <div className="progress-achievement-grid">{summary.achievements.map(achievement => <AchievementCard key={achievement.id} achievement={achievement} detailed motion={motionFor(achievement)} />)}</div>
      </dialog>

      <dialog className="progress-dialog sv-motion-dialog" ref={historyRef} aria-labelledby="progress-history-title" onClick={event => { if (event.target === event.currentTarget) historyRef.current?.close(); }}>
        <div className="progress-dialog-heading"><h2 id="progress-history-title"><History aria-hidden="true" /> Mi historial</h2><button type="button" autoFocus aria-label="Cerrar historial" onClick={() => historyRef.current?.close()}><X size={22} /></button></div>
        <p className="progress-dialog-intro">Tus registros más recientes aparecen primero. Los registros sin fecha aparecen al final.</p>
        {summary.history.length ? <div className="progress-history-page" key={page}><StudentActivityList activities={summary.history.slice((page - 1) * pageSize, page * pageSize)} now={now} /></div> : <EmptyActivity />}
        {pageCount > 1 && <nav className="progress-history-pagination" aria-label="Páginas del historial"><button type="button" disabled={page === 1} onClick={() => setHistoryPage(page - 1)} aria-label="Página anterior"><ChevronLeft size={20} /></button><span aria-live="polite">{page} de {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setHistoryPage(page + 1)} aria-label="Página siguiente"><ChevronRight size={20} /></button></nav>}
      </dialog>
    </div>
  );
}
