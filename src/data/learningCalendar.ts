export const STUDENT_TIME_ZONE = 'America/Lima';
const DAY_MS = 24 * 60 * 60 * 1000;
const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: STUDENT_TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric' });
const weeklyLabel = new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });

function dayNumber(at: number) {
  const parts = localDate.formatToParts(at);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  return Date.UTC(value('year'), value('month') - 1, value('day')) / DAY_MS;
}

export function summarizeLearningDays(dates: readonly (string | null)[], now: number) {
  const today = dayNumber(now);
  const days = new Map<number, { count: number; earliest: string }>();
  for (const value of dates) {
    if (!value) continue;
    const instant = Date.parse(value);
    if (!Number.isFinite(instant) || instant > now) continue;
    const key = dayNumber(instant);
    const previous = days.get(key);
    days.set(key, { count: (previous?.count ?? 0) + 1, earliest: previous && Date.parse(previous.earliest) <= instant ? previous.earliest : value });
  }
  let best = 0, length = 0, last = -Infinity;
  let streakAwardAt: string | undefined;
  for (const day of [...days.keys()].sort((a, b) => a - b)) {
    length = day === last + 1 ? length + 1 : 1;
    if (length === 3 && !streakAwardAt) streakAwardAt = days.get(day)?.earliest;
    best = Math.max(best, length);
    last = day;
  }
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = today - 6 + index;
    return { id: day, label: weeklyLabel.format(day * DAY_MS), count: days.get(day)?.count ?? 0 };
  });
  return { current: last >= today - 1 ? length : 0, best, streakAwardAt, week };
}
