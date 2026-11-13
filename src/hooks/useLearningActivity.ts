import { useCallback, useEffect, useState } from 'react';
import { getLessonLocation } from '../data/curriculum';

export type LearningActivity = { startedLessonIds: string[]; lastLessonId: string | null };
const STORAGE_KEY = 'senaverse-learning-activity-v1';

function readActivity(): LearningActivity {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (stored && typeof stored === 'object') {
      const { startedLessonIds, lastLessonId } = stored as Record<string, unknown>;
      const started = Array.isArray(startedLessonIds)
        ? startedLessonIds.filter((id): id is string => typeof id === 'string' && !!getLessonLocation(id))
        : [];
      const last = typeof lastLessonId === 'string' && getLessonLocation(lastLessonId) ? lastLessonId : null;
      return { startedLessonIds: [...new Set([...started, ...(last ? [last] : [])])], lastLessonId: last };
    }
  } catch { /* La actividad también funciona en memoria cuando no hay almacenamiento. */ }
  return { startedLessonIds: [], lastLessonId: null };
}

export function useLearningActivity() {
  const [activity, setActivity] = useState(readActivity);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(activity)); } catch { /* Continuar durante esta sesión. */ }
  }, [activity]);

  const visitLesson = useCallback((lessonId: string) => {
    if (!getLessonLocation(lessonId)) return;
    setActivity(previous => {
      if (previous.lastLessonId === lessonId && previous.startedLessonIds.includes(lessonId)) return previous;
      return { lastLessonId: lessonId, startedLessonIds: [...new Set([...previous.startedLessonIds, lessonId])] };
    });
  }, []);

  return { activity, visitLesson };
}
