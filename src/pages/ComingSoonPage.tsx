import { ArrowLeft, Construction, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ComingSoonPage({ title }: { title: string }) {
  return <section className="coming-soon white-card"><span className="coming-icon"><Construction size={35}/></span><span className="section-eyebrow">PRÓXIMAMENTE</span><h1>{title}</h1><p>Este módulo está contemplado en el mapa funcional de SeñaVerse, pero todavía no se ha implementado. Estamos desarrollando las funcionalidades esenciales primero.</p><div className="coming-detail"><Sparkles size={19}/> Ningún dato mostrado aquí representa una funcionalidad ya terminada.</div><Link to="/panel" className="button button-primary"><ArrowLeft size={17}/> Volver a mi panel</Link></section>;
}
