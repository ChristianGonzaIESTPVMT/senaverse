import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { LEGACY_PROGRESS_KEY, PROGRESS_KEY, canWriteProgress, emptyProgress, recordProgressEvent, recordSignConsultation, restoreProgress, type ProgressEvent, type StudentProgress } from '../data/progress';
import { ProgressContext, type AchievementMotion } from '../hooks/progressContext';
import { LEGACY_SITUATION_KEY } from '../data/situationStudy';

type SavedProgress = { progress: StudentProgress; raw: string | null; storageAvailable: boolean; achievementMotion?: AchievementMotion };

function restore(raw: string | null) {
  return restoreProgress(raw, localStorage.getItem(LEGACY_PROGRESS_KEY), localStorage.getItem(LEGACY_SITUATION_KEY));
}

function readProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return { raw, progress: restore(raw), storageAvailable: canWriteProgress(raw) };
  } catch { return { raw: null, progress: emptyProgress(), storageAvailable: false }; }
}

export function StudentProgressProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState(readProgress);
  const current = useRef(saved);
  const publish = useCallback((next: SavedProgress) => {
    const previous = current.current;
    if (next.progress === previous.progress && next.raw === previous.raw && next.storageAvailable === previous.storageAvailable) return;
    current.current = next;
    setSaved(next);
  }, []);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== PROGRESS_KEY && event.key !== null) return;
      try { if (event.storageArea !== localStorage) return; }
      catch { return; }
      const latest = readProgress();
      if (latest.raw === current.current.raw) return;
      publish(latest.storageAvailable ? latest : { ...current.current, raw: latest.raw, storageAvailable: false });
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [publish]);

  const update = useCallback((change: (state: StudentProgress) => StudentProgress) => {
    const previous = current.current;
    let { raw, progress } = previous;
    let storageAvailable: boolean;
    try {
      raw = localStorage.getItem(PROGRESS_KEY);
      storageAvailable = canWriteProgress(raw);
      if (storageAvailable && raw !== previous.raw) progress = restore(raw);
    } catch { storageAvailable = false; }
    const updated = change(progress);
    const pending = progress === previous.progress ? previous.achievementMotion : undefined;
    const achievementMotion = pending ?? (updated !== progress ? { previous: progress, shown: new Set<string>() } : undefined);
    if (storageAvailable && updated !== progress) {
      try {
        const encoded = JSON.stringify(updated);
        localStorage.setItem(PROGRESS_KEY, encoded);
        raw = encoded;
      } catch { storageAvailable = false; }
    }
    publish({ raw, progress: updated, storageAvailable, achievementMotion });
  }, [publish]);

  const recordActivity = useCallback((event: ProgressEvent) => {
    const occurredAt = new Date().toISOString();
    update(previous => recordProgressEvent(previous, event, occurredAt));
  }, [update]);
  const consultSign = useCallback((signId: string) => {
    const at = new Date().toISOString();
    update(previous => recordSignConsultation(previous, signId, at));
  }, [update]);

  return <ProgressContext value={{ progress: saved.progress, storageAvailable: saved.storageAvailable, achievementMotion: saved.achievementMotion, recordActivity, consultSign }}>{children}</ProgressContext>;
}
