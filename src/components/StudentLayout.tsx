import { useEffect, useRef, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Camera, ChartPie, House, LayoutGrid, LibraryBig, List, Menu, Play, Sparkles, Star, X } from 'lucide-react';
import { Brand } from './Brand';

const items = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/academia', label: 'Aprender', icon: LayoutGrid },
  { to: '/leccion/saludos', label: 'Lección', icon: Play },
  { to: '/biblioteca', label: 'Biblioteca', icon: LibraryBig },
  { to: '/camara', label: 'Cámara', icon: Camera },
  { to: '/simulador', label: 'Situaciones', icon: List },
  { to: '/minijuegos', label: 'Minijuegos', icon: Sparkles },
  { to: '/progreso', label: 'Mi progreso', icon: ChartPie },
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
      <p>Las lecciones, videos y actividades estarán adaptados al recorrido del estudiante.</p>
    </div>
  );
}

export function StudentLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const menuRef = useRef<HTMLDialogElement>(null);
  const pageName = items.find(item => item.to === location.pathname)?.label ?? 'Mi perfil';
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
            <Link to="/">SeñaVerse</Link><span aria-hidden="true">/</span><span aria-current="page">{pageName}</span>
          </nav>
          <div className="app-profile">
            <span className="app-example-xp"><Star size={23} aria-hidden="true" /> <span>XP de ejemplo</span></span>
            <Link className="app-avatar" to="/perfil" aria-label="Ver mi perfil">SV</Link>
          </div>
        </header>
        <main id="contenido" className="app-content" tabIndex={-1}>{children}</main>
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
