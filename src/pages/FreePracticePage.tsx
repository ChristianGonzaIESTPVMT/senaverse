import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { RecognitionPractice } from '../components/RecognitionPractice';
import { PracticePageHeading } from '../components/PracticeContent';
import { SignMediaViewer } from '../components/SignMediaViewer';
import { getEducationalSign, getLibrarySignPath } from '../data/library';
import { useStudentProgress } from '../hooks/progressContext';

export function FreePracticePage() {
  const { recordActivity } = useStudentProgress();
  const [params] = useSearchParams();
  const sign = params.get('sena') ?? '';
  const entry = getEducationalSign(sign);
  const visualOnly = entry && !entry.recognitionClassId;
  return <div className="practice-page">
    <PracticePageHeading title={visualOnly ? `Práctica visual · ${entry.word}` : 'Práctica libre'}
      description={visualOnly ? 'El reconocimiento por cámara aún no está disponible para esta seña.'
        : 'Realiza una seña o elige un objetivo para practicar con tu cámara.'} />
    {visualOnly ? <section className="white-card lesson-article">
      <SignMediaViewer key={entry.id} sign={entry} />
      <Link to={getLibrarySignPath(entry.id)}>Ver ficha en Biblioteca</Link>
    </section> : <RecognitionPractice key={sign} initialSign={sign} onSave={signId => recordActivity({ type: 'camera-saved', sessionId: crypto.randomUUID(), signId })} />}
    <div className="practice-navigation">
      <Link to="/camara" className="button button-outline"><ArrowLeft size={18} aria-hidden="true" /> Centro de práctica</Link>
    </div>
  </div>;
}
