import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Award, Blocks, BookOpen, Camera, Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, Gamepad2, GraduationCap, Hand, History, Layers, LockKeyhole, MessageSquare, Star, Target, UsersRound, X, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomeVisual } from '../components/HomeVisual';
import { getUnitPath } from '../data/curriculum';
import { describeActivity, summarizeProgress, type ProgressActivity } from '../data/progress';
import { useStudentProgress } from '../hooks/progressContext';
import './ProgressPage.css';

type Achievement = ReturnType<typeof summarizeProgress>['achievements'][number];

function ProgressGlyph() {
  return <span className="progress-glyph" aria-hidden="true"><i /><i /><i /></span>;
}

function AchievementCard({ achievement, detailed = false }: { achievement: Achievement; detailed?: boolean }) {
  const Icon = achievement.id === 'first-step' ? GraduationCap : achievement.id === 'explorer' ? Star : achievement.obtained ? Award : LockKeyhole;
  return (
    <article className={`progress-achievement progress-achievement-${achievement.id}${achievement.obtained ? ' is-obtained' : ' is-locked'}`} title={achievement.description}>
      <div className="progress-badge-art" aria-hidden="true"><Award className="progress-badge-rays" /><span><Icon strokeWidth={1.8} /></span></div>
      <h3>{achievement.name}</h3>
      {detailed && <p>{achievement.description}</p>}
      <span className="progress-achievement-status">{achievement.obtained ? <Check size={16} aria-hidden="true" /> : <LockKeyhole size={14} aria-hidden="true" />}{achievement.obtained ? 'Obtenido' : 'Bloqueado'}</span>
    </article>
  );
}

function relativeTime(value: string | null, now: number) {
  if (!value) return 'Registro anterior · fecha no disponible';
  const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60000));
  if (minutes < 1) return 'Hace un momento';
  const formatter = new Intl.RelativeTimeFormat('es-PE', { numeric: 'auto' });
  if (minutes < 60) return formatter.format(-minutes, 'minute');
  if (minutes < 1440) return formatter.format(-Math.floor(minutes / 60), 'hour');
  if (minutes < 10080) return formatter.format(-Math.floor(minutes / 1440), 'day');
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' }).format(new Date(value));
}

function ActivityList({ activities, now }: { activities: ProgressActivity[]; now: number }) {
  const icons = { lesson: BookOpen, camera: Camera, situation: MessageSquare, 'situation-scene': MessageSquare, minigame: Gamepad2 };
  return <ol className="progress-activity-list">{activities.map(activity => {
    const Icon = icons[activity.type];
    return <li key={activity.id}>
      <span className="progress-activity-icon"><Icon size={27} aria-hidden="true" /></span>
      <div><p>{describeActivity(activity)}</p><time dateTime={activity.occurredAt ?? undefined} title={activity.occurredAt ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(activity.occurredAt)) : undefined}>{relativeTime(activity.occurredAt, now)}</time></div>
      <CircleCheck className="progress-activity-check" size={22} aria-label="Completada" />
    </li>;
  })}</ol>;
}

function EmptyActivity() {
  return <div className="progress-empty">
    <span><BookOpen size={26} aria-hidden="true" /></span>
    <div><h3>Tu próxima lección es el primer paso</h3><p>Aquí verás las actividades que completes.</p><Link to="/academia">Empezar a aprender <ArrowRight size={15} aria-hidden="true" /></Link></div>
  </div>;
}

export function ProgressPage() {
  const { progress } = useStudentProgress();
  const summary = summarizeProgress(progress);
  const achievementsRef = useRef<HTMLDialogElement>(null);
  const historyRef = useRef<HTMLDialogElement>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [now, setNow] = useState(Date.now);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(summary.recent.length / pageSize));
  const page = Math.min(historyPage, pageCount);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const statistics = [
    { label: 'Lecciones completadas', value: summary.completed.length, icon: BookOpen },
    { label: 'Prácticas realizadas', value: summary.practices, icon: Target },
    { label: 'XP acumulados', value: summary.xp, icon: Zap },
  ];

  return (
    <div className="progress-page">
      <nav className="progress-mobile-breadcrumb" aria-label="Ruta de progreso"><Link to="/">SeñaVerse</Link><span aria-hidden="true">/</span><span aria-current="page">Mi progreso</span></nav>
      <header className="progress-heading">
        <div className="progress-heading-icon"><ProgressGlyph /></div>
        <div><h1>Mi progreso</h1><p>Observa tus avances y celebra cada logro.</p></div>
        <div className="progress-heading-art" aria-hidden="true"><HomeVisual name="hero" /><i /><i /><i /></div>
      </header>

      <div className="progress-overview">
        <section className="progress-overall" aria-labelledby="progress-overall-title">
          <div className="progress-overall-icon"><ProgressGlyph /></div>
          <div className="progress-overall-copy">
            <h2 id="progress-overall-title">Progreso general</h2>
            <strong>{summary.percent}%</strong>
            <progress value={summary.percent} max={100} aria-label={`Progreso general: ${summary.completed.length} lecciones de ${summary.unitProgress.reduce((total, item) => total + item.unit.lessons.length, 0)}`} />
            <p>¡Sigue avanzando! Cada lección cuenta.</p>
          </div>
        </section>
        <dl className="progress-statistics">{statistics.map(({ label, value, icon: Icon }) => <div className="progress-statistic" key={label}>
          <Icon size={35} strokeWidth={1.9} aria-hidden="true" /><dt>{label}</dt><dd>{value.toLocaleString('es-PE')}</dd>
        </div>)}</dl>
      </div>

      <div className="progress-details">
        <section className="progress-panel progress-units" aria-labelledby="progress-units-title">
          <div className="progress-section-heading"><h2 id="progress-units-title"><Layers aria-hidden="true" /> Avance de mis unidades</h2></div>
          <ul className="progress-unit-list">{summary.unitProgress.map(({ unit, done, percent }) => {
            const Icon = unit.illustration === 'greetings' ? Hand : unit.illustration === 'alphabet' ? Blocks : UsersRound;
            return <li key={unit.id}><Link to={getUnitPath(unit.id)} className={`progress-unit${percent === 100 ? ' is-complete' : ''}`} aria-label={`Unidad ${unit.id}: ${unit.title}, ${percent}%, ${done} de ${unit.lessons.length} lecciones completadas`}>
              <span className="progress-unit-icon"><Icon size={35} strokeWidth={1.8} aria-hidden="true" /></span>
              <div className="progress-unit-copy"><div><h3>Unidad {unit.id}: {unit.title}</h3><span className={`progress-percent${percent === 0 ? ' is-zero' : ''}`}>{percent}%</span></div><p>{unit.subtitle}</p><progress value={done} max={unit.lessons.length} aria-label={`Avance en ${unit.title}`} /></div>
            </Link></li>;
          })}</ul>
        </section>

        <div className="progress-right-column">
          <section className="progress-panel progress-achievements" aria-labelledby="progress-achievements-title">
            <div className="progress-section-heading"><h2 id="progress-achievements-title"><Award aria-hidden="true" /> Mis logros</h2><button type="button" className="progress-secondary" onClick={() => achievementsRef.current?.showModal()} aria-haspopup="dialog">Ver todos <ArrowRight size={17} aria-hidden="true" /></button></div>
            <div className="progress-achievement-grid">{summary.achievements.map(achievement => <AchievementCard key={achievement.id} achievement={achievement} />)}</div>
          </section>

          <section className="progress-panel progress-recent" aria-labelledby="progress-recent-title">
            <div className="progress-section-heading"><h2 id="progress-recent-title"><Clock3 aria-hidden="true" /> Actividad reciente</h2></div>
            {summary.recent.length ? <ActivityList activities={summary.recent.slice(0, 4)} now={now} /> : <EmptyActivity />}
            <button type="button" className="progress-history-link" aria-haspopup="dialog" onClick={() => { setHistoryPage(1); historyRef.current?.showModal(); }}>Ver historial <ArrowRight size={15} aria-hidden="true" /></button>
          </section>
        </div>
      </div>

      <dialog className="progress-dialog" ref={achievementsRef} aria-labelledby="progress-all-achievements-title" onClick={event => { if (event.target === event.currentTarget) achievementsRef.current?.close(); }}>
        <div className="progress-dialog-heading"><h2 id="progress-all-achievements-title"><Award aria-hidden="true" /> Todos mis logros</h2><button type="button" autoFocus aria-label="Cerrar logros" onClick={() => achievementsRef.current?.close()}><X size={22} /></button></div>
        <p className="progress-dialog-intro">Cada pequeño avance merece celebrarse. Descubre cómo conseguir tus insignias.</p>
        <div className="progress-achievement-grid">{summary.achievements.map(achievement => <AchievementCard key={achievement.id} achievement={achievement} detailed />)}</div>
      </dialog>

      <dialog className="progress-dialog" ref={historyRef} aria-labelledby="progress-history-title" onClick={event => { if (event.target === event.currentTarget) historyRef.current?.close(); }}>
        <div className="progress-dialog-heading"><h2 id="progress-history-title"><History aria-hidden="true" /> Mi historial</h2><button type="button" autoFocus aria-label="Cerrar historial" onClick={() => historyRef.current?.close()}><X size={22} /></button></div>
        <p className="progress-dialog-intro">Tus actividades completadas, de la más reciente a la más antigua.</p>
        {summary.recent.length ? <ActivityList activities={summary.recent.slice((page - 1) * pageSize, page * pageSize)} now={now} /> : <EmptyActivity />}
        {pageCount > 1 && <nav className="progress-history-pagination" aria-label="Páginas del historial"><button type="button" disabled={page === 1} onClick={() => setHistoryPage(page - 1)} aria-label="Página anterior"><ChevronLeft size={20} /></button><span aria-live="polite">{page} de {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setHistoryPage(page + 1)} aria-label="Página siguiente"><ChevronRight size={20} /></button></nav>}
      </dialog>
    </div>
  );
}
