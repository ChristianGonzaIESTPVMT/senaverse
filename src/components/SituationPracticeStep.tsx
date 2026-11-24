import type { LibraryEntry } from '../data/library';
import { getSituationExercise, type SituationPractice } from '../data/situationStudy';
import type { SituationFilter, SituationScene } from '../data/situations';
import { GuidedSignPractice } from './GuidedSignPractice';

export function SituationPracticeStep({ sign, scene, situationId, filter, practice, onComplete }: {
  sign: LibraryEntry; scene: SituationScene; situationId: string; filter: SituationFilter;
  practice?: SituationPractice; onComplete: (input: SituationPractice) => void;
}) {
  return <GuidedSignPractice key={sign.id} sign={sign} exercise={getSituationExercise(scene, sign)} titleId="situation-practice-title"
    returnState={{ situationReturn: { situationId, sceneId: scene.id, filter } }} practice={practice} onComplete={onComplete} cameraDisabled />;
}
