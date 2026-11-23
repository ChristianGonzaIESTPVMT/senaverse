import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { NavLink, Link, useLocation, useParams } from 'react-router-dom';
import { Camera, ChartNoAxesColumnIncreasing, House, LayoutGrid, LibraryBig, List, Menu, Sparkles, Star, X } from 'lucide-react';
import { getProgressTotals } from '../data/progress';
import { useStudentProgress } from '../hooks/progressContext';
import { useStudentProfile } from '../hooks/profileContext';
import { getUnitPath, units } from '../data/curriculum';
import { getSituation, getSituationFilter, getSituationPath, getSituationsPath } from '../data/situations';
import { Brand } from './Brand';
import { StudentAvatar } from './StudentAvatar';
import { ThemeToggle } from './ThemeToggle';

const items = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/academia', label: 'Aprender', icon: LayoutGrid },
  { to: '/biblioteca', label: 'Biblioteca', icon: LibraryBig },
  { to: '/camara', label: 'Cámara', icon: Camera },
  { to: '/simulador', label: 'Situaciones', icon: List },
  { to: '/minijuegos', label: 'Minijuegos', icon: Sparkles },
  { to: '/progreso', label: 'Mi progreso', icon: ChartNoAxesColumnIncreasing },
];

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return items.map(({ to, label, icon: Icon }) => (
    <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}>
      <Icon size={25} strokeWidth={1.9} aria-hidden="true" /><span>{label}</span>
    </NavLink>
  ));
}

function LearningTip() {
  return (
    <div className="app-learning-tip">
      <strong><Star size={23} aria-hidden="true" /> Aprende a tu ritmo.</strong>
      <p>Practica con las lecciones, los diagramas y los ejercicios guiados.</p>
    </div>
  );
}

export function StudentLayout({ children }: { children: ReactNode }) {
  const { progress, storageAvailable } = useStudentProgress();
  const { profile, photoUrl } = useStudentProfile();
  const { xp } = getProgressTotals(progress);
  const location = useLocation();
  const { unitId, lessonId, situationId, sceneId } = useParams();
  const menuRef = useRef<HTMLDialogElement>(null);
  const currentItem = items.find(item => item.to === location.pathname || (item.to !== '/' && location.pathname.startsWith(`${item.to}/`)));
  const unit = units.find(item => String(item.id) === unitId);
  const lessonIndex = unit?.lessons.findIndex(lesson => lesson.id === lessonId) ?? -1;
  const situationFilter = getSituationFilter(new URLSearchParams(location.search).get('nivel'));
  const breadcrumbs = [
    { label: 'SeñaVerse', to: '/' },
    { label: currentItem?.label ?? 'Mi perfil', to: currentItem?.to === '/simulador' ? getSituationsPath(situationFilter) : currentItem?.to ?? '/perfil' },
  ];
  if (unit) breadcrumbs.push({ label: `Unidad ${unit.id}`, to: getUnitPath(unit.id) });
  if (lessonIndex >= 0) breadcrumbs.push({ label: `Lección ${lessonIndex + 1}`, to: location.pathname });
  const practicePage = [
    { label: 'Práctica libre', to: '/camara/libre' },
    { label: 'Desafío de señas', to: '/camara/desafio' },
  ].find(page => page.to === location.pathname);
  if (practicePage) breadcrumbs.push(practicePage);
  const situation = getSituation(situationId);
  if (situation) {
    breadcrumbs.push({ label: situation.title, to: getSituationPath(situation.id, situationFilter) });
    const sceneIndex = situation.scenes.findIndex(scene => scene.id === sceneId);
    if (sceneIndex >= 0) breadcrumbs.push({ label: `Escena ${sceneIndex + 1}`, to: location.pathname });
    if (location.pathname.endsWith('/resultados')) breadcrumbs.push({ label: 'Resumen', to: location.pathname });
  }
  const closeMenu = () => menuRef.current?.close();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <a className="app-skip-link" href="#contenido">Saltar al contenido</a>
      <aside className="app-sidebar" aria-label="Menú del estudiante">
        <Brand />
        <nav className="app-navigation" aria-label="Secciones de aprendizaje"><NavigationLinks /></nav>
        <LearningTip />
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-mobile-brand"><Brand /></div>
          <nav className="app-breadcrumb" aria-label="Ubicación actual">
            {breadcrumbs.map((breadcrumb, index) => (
              <Fragment key={breadcrumb.label}>
                {index > 0 && <span aria-hidden="true">/</span>}
                {index === breadcrumbs.length - 1
                  ? <span aria-current="page">{breadcrumb.label}</span>
                  : <Link to={breadcrumb.to}>{breadcrumb.label}</Link>}
              </Fragment>
            ))}
          </nav>
          <div className="app-profile">
            <span className="app-example-xp"><Star size={23} aria-hidden="true" /> <span>{xp.toLocaleString('es-PE')} XP</span></span>
            <ThemeToggle />
            <Link className="app-avatar" to="/perfil" aria-label={`Ver mi perfil: ${profile.displayName}`} aria-current={location.pathname === '/perfil' ? 'page' : undefined} title={`Mi perfil · ${profile.displayName}`}><StudentAvatar avatarId={profile.avatarId} photoUrl={photoUrl} /></Link>
          </div>
        </header>
        <main id="contenido" className="app-content" tabIndex={-1}>
          {storageAvailable === false && <p className="lesson-warning" role="status">El progreso de esta sesión no se puede guardar en el navegador.</p>}
          {children}
        </main>
      </div>

      <nav className="app-bottom-nav" aria-label="Navegación móvil">
        {items.filter(item => ['/', '/academia', '/biblioteca', '/minijuegos'].includes(item.to)).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}><Icon size={22} aria-hidden="true" /><span>{label}</span></NavLink>
        ))}
        <button type="button" onClick={() => menuRef.current?.showModal()} aria-haspopup="dialog" aria-controls="mobile-menu"><Menu size={22} aria-hidden="true" /><span>Más</span></button>
      </nav>

      <dialog id="mobile-menu" className="app-menu-dialog" ref={menuRef} aria-labelledby="mobile-menu-title" onClick={event => { if (event.target === event.currentTarget) closeMenu(); }}>
        <div className="app-menu-content">
          <div className="app-menu-heading"><h2 id="mobile-menu-title">Explora SeñaVerse</h2><button type="button" onClick={closeMenu} aria-label="Cerrar menú" autoFocus><X size={24} /></button></div>
          <nav className="app-navigation" aria-label="Todas las secciones"><NavigationLinks onNavigate={closeMenu} /></nav>
          <LearningTip />
        </div>
      </dialog>
    </div>
  );
}
