import { ArrowRight, Camera } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { RecognitionPractice } from '../components/RecognitionPractice';
import { Illustration } from '../components/Illustration';
import { headerIllustrations } from '../data/illustrations';

export function CameraPage() {
  const [params] = useSearchParams();
  const sign = params.get('sena') ?? '';
  return <div className="camera-center">
    <header className="camera-center-heading">
      <span className="camera-center-icon" aria-hidden="true"><Camera strokeWidth={1.8} /></span>
      <div className="camera-center-heading-copy">
        <h1>Centro de práctica</h1>
        <p>Practica señas con tu cámara en modo libre o elige una seña como objetivo.</p>
      </div>
      <div className="camera-center-illustration" aria-hidden="true">
        <Illustration asset={headerIllustrations.practice} />
      </div>
    </header>
    <RecognitionPractice key={sign} initialSign={sign} />
    <Link className="button button-outline camera-challenge-link" to="/camara/desafio">
      Explorar el desafío de señas <ArrowRight size={18} aria-hidden="true" />
    </Link>
  </div>;
}
