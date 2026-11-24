import type { CSSProperties } from 'react';
import type { getStudentLevel } from '../data/studentOverview';
import { MotionValue } from './MotionValue';

export function StudentLevel({ level, xp, motion = false }: { level: ReturnType<typeof getStudentLevel>; xp: number; motion?: boolean }) {
  const formattedXp = xp.toLocaleString('es-PE');
  const progress = <progress max={100} value={level.percent} aria-label="Avance hacia el siguiente nivel" />;

  return <div className="student-level">
    <strong>Nivel {level.number} · {level.name}</strong>
    <span>{motion ? <MotionValue value={xp} formatted={formattedXp} /> : formattedXp} XP acumulados</span>
    {level.next ? <>
      {motion ? <div className="sv-motion-progress">
        {progress}
        <span className="sv-motion-progress-fill" aria-hidden="true" style={{ '--sv-progress-value': level.percent / 100 } as CSSProperties} />
      </div> : progress}
      <small>Faltan {level.remaining} XP para {level.next.name}.</small></> : <small>Nivel máximo disponible.</small>}
  </div>;
}
