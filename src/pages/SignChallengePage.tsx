import { ArrowLeft, ArrowRight, Check, Flag, RotateCcw, SkipForward, Trophy } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PracticeCamera } from '../components/PracticeCamera';
import { PracticePageHeading, PracticeSignArt, PracticeSignDemo } from '../components/PracticeContent';
import { practiceSigns } from '../data/practice';

export function SignChallengePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const amount = searchParams.get('cantidad') === '5' ? 5 : 3;
  const stepParam = searchParams.get('paso');
  const step = Number(stepParam);
  const finished = stepParam === 'fin';
  const started = Number.isInteger(step) && step >= 1 && step <= amount;
  const requestedSign = practiceSigns[step - 1];

  function startSequence() {
    setSearchParams({ cantidad: String(amount), paso: '1' });
  }

  function skipSign() {
    setSearchParams({ cantidad: String(amount), paso: step < amount ? String(step + 1) : 'fin' });
  }

  return (
    <div className="practice-page">
      <PracticePageHeading title="Desafío de señas" description="Prepara una secuencia y explora las señas que practicarás con tu cámara." />
      {!started && !finished && (
        <section className="practice-panel challenge-configuration" aria-labelledby="challenge-config-title">
          <div className="challenge-config-art" aria-hidden="true">🏆</div>
          <h2 id="challenge-config-title">Prepara tu desafío</h2>
          <p>Elige cuántas señas quieres recorrer.</p>
          <fieldset className="challenge-amount">
            <legend>Cantidad de señas</legend>
            {[3, 5].map(count => (
              <label className={amount === count ? 'is-selected' : ''} key={count}>
                <input type="radio" name="challenge-amount" value={count} checked={amount === count} onChange={() => setSearchParams({ cantidad: String(count) }, { replace: true })} />
                <strong>{count}</strong><span>señas</span>
                {amount === count && <Check size={18} aria-hidden="true" />}
              </label>
            ))}
          </fieldset>
          <div className="challenge-sequence-preview" aria-label="Señas de la secuencia">
            {practiceSigns.slice(0, amount).map(sign => <span key={sign.id}>{sign.word}</span>)}
          </div>
          <div className="challenge-evaluation-note">
            <span className="practice-demo-label">Secuencia de demostración</span>
            <p>La evaluación, los resultados y el XP estarán disponibles al integrar el reconocimiento.</p>
          </div>
          <button className="button button-primary" type="button" onClick={startSequence}>Iniciar desafío <ArrowRight size={19} aria-hidden="true" /></button>
        </section>
      )}

      {(started || finished) && (
        <section className="practice-panel challenge-progress" aria-label="Recorrido de la secuencia">
          <div>
            <h2>Recorrido de la secuencia</h2>
            <span>{finished ? 'Final del recorrido' : `Seña ${step} de ${amount}`}</span>
          </div>
          <progress value={finished ? amount : step - 1} max={amount} aria-label="Posición en la secuencia" />
          <p>La evaluación de las señas está pendiente de integración.</p>
        </section>
      )}

      {started && (
        <>
          <section className="practice-panel challenge-request" aria-labelledby="challenge-request-title" aria-live="polite">
            <PracticeSignArt sign={requestedSign} />
            <div>
              <span className="practice-demo-label">Seña solicitada · Demostración</span>
              <h2 id="challenge-request-title">{requestedSign.word}</h2>
              <p>{requestedSign.description}</p>
            </div>
          </section>
          <div className="practice-workspace">
            <PracticeSignDemo sign={requestedSign} />
            <PracticeCamera />
          </div>
          <div className="challenge-step-actions">
            <button className="button button-outline" type="button" onClick={startSequence}><RotateCcw size={18} aria-hidden="true" /> Reintentar secuencia</button>
            <button className="button button-outline" type="button" onClick={skipSign}>Omitir seña <SkipForward size={18} aria-hidden="true" /></button>
          </div>
        </>
      )}

      {finished && (
        <section className="practice-panel challenge-finished" aria-labelledby="challenge-finished-title">
          <span className="challenge-finished-icon" aria-hidden="true"><Flag size={35} /></span>
          <h2 id="challenge-finished-title">Fin de la secuencia de demostración</h2>
          <p>Has llegado al final del recorrido. La evaluación y los resultados se habilitarán con el reconocimiento de señas.</p>
          <button className="button button-primary" type="button" onClick={startSequence}><RotateCcw size={18} aria-hidden="true" /> Reintentar</button>
        </section>
      )}

      <div className="practice-navigation">
        <Link to="/camara" className="button button-outline"><ArrowLeft size={18} aria-hidden="true" /> Centro de práctica</Link>
        {(started || finished) && (
          <button className="button button-outline" type="button" onClick={() => setSearchParams({ cantidad: String(amount) })}>
            <Trophy size={18} aria-hidden="true" /> Configurar desafío
          </button>
        )}
      </div>
    </div>
  );
}
