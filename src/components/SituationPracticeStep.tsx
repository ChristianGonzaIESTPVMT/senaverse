import { ArrowLeft, ArrowRight, Hand } from 'lucide-react';
import type { LibraryEntry } from '../data/library';
import { PracticeCamera } from './PracticeCamera';
import { PracticeSignDemo } from './PracticeContent';

export function SituationPracticeStep({ sign, onReturn, isLastScene }: { sign: LibraryEntry; onReturn: () => void; isLastScene: boolean }) {
  return (
    <section className="situation-practice-step" aria-labelledby="situation-practice-title">
      <div className="situation-practice-heading">
        <h2 id="situation-practice-title"><Hand size={24} aria-hidden="true" /> Practica la seña «{sign.word}»</h2>
        <p id="situation-verification-pending">La verificación por cámara está pendiente de implementación. El avance se habilitará al integrar el reconocimiento de esta seña.</p>
      </div>
      <div className="practice-workspace">
        <PracticeSignDemo sign={sign} />
        <PracticeCamera />
      </div>
      <div className="situation-navigation">
        <button className="button button-outline" type="button" onClick={onReturn}><ArrowLeft size={18} aria-hidden="true" /> Volver al escenario</button>
        <button className="button button-primary" type="button" disabled aria-describedby="situation-verification-pending">{isLastScene ? 'Finalizar situación' : 'Continuar escena'}<ArrowRight size={18} aria-hidden="true" /></button>
      </div>
    </section>
  );
}
