import { RecognitionPractice } from './RecognitionPractice';
import { recognitionSignsById } from '../features/sign-recognition/recognitionCatalog';

export default function DirectedLessonPractice({ targetId, instruction, onContinue, continueLabel }: {
  targetId: string; instruction: string; onContinue: (signId: string) => void; continueLabel?: string;
}) {
  const sign = recognitionSignsById.get(targetId);
  if (!sign) return <p role="status">Esta seña está disponible como contenido de estudio. Puedes hacer el ejercicio sin cámara.</p>;
  const guidance = sign.type === 'static' ? 'Mantén la postura estable hasta ver el resultado del modelo.' : 'Realiza el movimiento completo con las manos visibles.';
  return <RecognitionPractice key={targetId} guided={{
    targetId, instruction: `${instruction} ${guidance}`,
    onAccept: onContinue, acceptLabel: continueLabel,
  }} />;
}
