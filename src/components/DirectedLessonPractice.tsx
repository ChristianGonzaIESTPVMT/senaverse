import { RecognitionPractice } from './RecognitionPractice';
import { recognitionSignsById } from '../features/sign-recognition/recognitionCatalog';
import type { LessonReference } from '../data/lessonPlan';

export default function DirectedLessonPractice({ targetId, instruction, reference, onContinue }: {
  targetId: string; instruction: string; reference: LessonReference; onContinue: (signId: string) => void;
}) {
  if (!recognitionSignsById.has(targetId)) return <p role="status">Esta seña está disponible como contenido de estudio. Puedes hacer el ejercicio sin cámara.</p>;
  return <RecognitionPractice key={targetId} guided={{
    targetId, instruction: `${instruction} Mantén la postura estable hasta ver el resultado del modelo.`,
    reference, onAccept: onContinue,
  }} />;
}
