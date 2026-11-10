import { type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { BookOpen, Camera, ChartNoAxesColumn, CircleHelp, Gamepad2, House, Library, Search, UserRound } from 'lucide-react';
import { Brand } from './Brand';

const items = [
  { to: '/panel', label: 'Mi panel', icon: House },
  { to: '/academia', label: 'Academia', icon: BookOpen },
  { to: '/biblioteca', label: 'Biblioteca de señas', icon: Library },
  { to: '/minijuegos', label: 'Minijuegos', icon: Gamepad2 },
  { to: '/simulador', label: 'Simulador', icon: Camera },
  { to: '/progreso', label: 'Mi progreso', icon: ChartNoAxesColumn },
];

export function StudentLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div className="student-shell">
      <aside className="sidebar" aria-label="Menú del estudiante">
        <Brand />
        <div className="sidebar-section-label">APRENDIZAJE</div>
        <nav className="sidebar-links" aria-label="Secciones de aprendizaje">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive || (to === '/academia' && location.pathname.startsWith('/leccion/')) ? 'active' : ''}`}>
              <Icon size={19} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <CircleHelp size={22} />
          <strong>¿Qué es SeñaVerse?</strong>
          <p>Explora la plataforma educativa que estamos construyendo.</p>
          <Link to="/">Ver presentación</Link>
        </div>
      </aside>
      <div className="student-main">
        <header className="student-header">
          <div className="mobile-brand"><Brand /></div>
          <div className="search-placeholder"><Search size={18} /><span>SeñaVerse · Versión de desarrollo</span></div>
          <div className="profile-short"><span className="profile-status">Cuenta de demostración</span><span className="avatar" aria-hidden="true">SV</span></div>
        </header>
        <main className="student-content">{children}</main>
      </div>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        <NavLink to="/panel"><House size={19} /><span>Panel</span></NavLink>
        <NavLink to="/academia" className={location.pathname.startsWith('/leccion/') ? 'active' : ''}><BookOpen size={19} /><span>Academia</span></NavLink>
        <NavLink to="/biblioteca"><Library size={19} /><span>Biblioteca</span></NavLink>
        <NavLink to="/simulador"><Camera size={19} /><span>Simulador</span></NavLink>
        <NavLink to="/perfil"><UserRound size={19} /><span>Perfil</span></NavLink>
      </nav>
    </div>
  );
}
