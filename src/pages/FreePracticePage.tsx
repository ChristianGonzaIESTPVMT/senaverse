import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { RecognitionPractice } from '../components/RecognitionPractice';
import { PracticePageHeading } from '../components/PracticeContent';

export function FreePracticePage() {
  const [params] = useSearchParams();
  const sign = params.get('sena') ?? '';
  return <div className="practice-page">
    <PracticePageHeading title="Práctica libre" description="Realiza una seña o elige un objetivo para practicar con tu cámara." />
    <RecognitionPractice key={sign} initialSign={sign} />
    <div className="practice-navigation">
      <Link to="/camara" className="button button-outline"><ArrowLeft size={18} aria-hidden="true" /> Centro de práctica</Link>
    </div>
  </div>;
}
