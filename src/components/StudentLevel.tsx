import type { getStudentLevel } from '../data/studentOverview';

export function StudentLevel({ level, xp }: { level: ReturnType<typeof getStudentLevel>; xp: number }) {
  return <div className="student-level">
    <strong>Nivel {level.number} · {level.name}</strong>
    <span>{xp.toLocaleString('es-PE')} XP acumulados</span>
    {level.next ? <><progress max={100} value={level.percent} aria-label="Avance hacia el siguiente nivel" />
      <small>Faltan {level.remaining} XP para {level.next.name}.</small></> : <small>Nivel máximo disponible.</small>}
  </div>;
}
