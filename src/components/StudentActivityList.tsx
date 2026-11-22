import { BookOpen, Camera, Gamepad2, LibraryBig, MessageSquare } from 'lucide-react';
import { STUDENT_TIME_ZONE } from '../data/learningCalendar';
import type { StudentHistoryEntry } from '../data/studentOverview';

const icons = { lesson: BookOpen, camera: Camera, situation: MessageSquare, minigame: Gamepad2, library: LibraryBig };
const calendarDate = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: STUDENT_TIME_ZONE });
const preciseDate = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeStyle: 'short', timeZone: STUDENT_TIME_ZONE });
const relative = new Intl.RelativeTimeFormat('es-PE', { numeric: 'auto' });

function relativeTime(value: string, now: number) {
  const instant = Date.parse(value);
  if (instant > now) return calendarDate.format(instant);
  const minutes = Math.floor((now - instant) / 60000);
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return relative.format(-minutes, 'minute');
  if (minutes < 1440) return relative.format(-Math.floor(minutes / 60), 'hour');
  return calendarDate.format(instant);
}

export function StudentActivityList({ activities, now }: { activities: StudentHistoryEntry[]; now: number }) {
  return <ol className="progress-activity-list">{activities.map(activity => {
    const Icon = icons[activity.module];
    return <li key={activity.id}>
      <span className="progress-activity-icon"><Icon size={24} aria-hidden="true" /></span>
      <div><p>{activity.label}</p>{activity.detail && <small>{activity.detail}</small>}
        {activity.at ? <time dateTime={activity.at} title={preciseDate.format(new Date(activity.at))}>{relativeTime(activity.at, now)}</time>
          : <small>Fecha no disponible</small>}
      </div>
    </li>;
  })}</ol>;
}
