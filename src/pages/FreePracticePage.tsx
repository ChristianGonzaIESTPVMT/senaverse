import { useRef } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PracticeCamera } from '../components/PracticeCamera';
import { PracticePageHeading, PracticeSignDemo } from '../components/PracticeContent';
import { practiceSigns } from '../data/practice';

export function FreePracticePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectRef = useRef<HTMLSelectElement>(null);
  const signId = searchParams.get('sena') ?? '';
  const selectedSign = practiceSigns.find(sign => sign.id === signId);

  function selectSign(id: string) {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (id) next.set('sena', id);
      else next.delete('sena');
      return next;
    }, { replace: true });
  }

  return (
    <div className="practice-page">
      <PracticePageHeading title="Práctica libre" description="Elige una seña y prepara tu práctica a tu propio ritmo." />
      <section className="practice-panel practice-selection" aria-label="Seleccionar seña">
        <div className="practice-select-field">
          <label htmlFor="practice-sign">Seña a practicar</label>
          <select id="practice-sign" ref={selectRef} value={selectedSign?.id ?? ''} onChange={event => selectSign(event.target.value)}>
            <option value="">Selecciona una seña</option>
            {practiceSigns.map(sign => <option value={sign.id} key={sign.id}>{sign.word}</option>)}
          </select>
        </div>
        <div className="practice-selection-note">
          <span className="practice-demo-label">Datos de demostración</span>
          <p>El reconocimiento de estas señas se integrará próximamente.</p>
        </div>
      </section>
      {signId && !selectedSign && <p className="practice-feedback" role="status">Esta seña está fuera del catálogo de demostración. Elige otra para continuar.</p>}
      <div className="practice-workspace">
        <PracticeSignDemo sign={selectedSign} />
        <PracticeCamera key={selectedSign?.id ?? 'selection'} disabled={!selectedSign} />
      </div>
      <div className="practice-navigation">
        <Link to="/camara" className="button button-outline"><ArrowLeft size={18} aria-hidden="true" /> Centro de práctica</Link>
        <button className="button button-outline" type="button" disabled={!selectedSign} onClick={() => { selectSign(''); selectRef.current?.focus(); }}>
          <RefreshCw size={18} aria-hidden="true" /> Cambiar de seña
        </button>
      </div>
    </div>
  );
}
