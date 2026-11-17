import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { LEGACY_PROGRESS_KEY, PROGRESS_KEY, emptyProgress, recordProgressEvent, recordSignConsultation, restoreProgress, type ProgressEvent } from '../data/progress';
import { ProgressContext } from '../hooks/progressContext';

export function StudentProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(() => {
    try { return restoreProgress(localStorage.getItem(PROGRESS_KEY), localStorage.getItem(LEGACY_PROGRESS_KEY)); }
    catch { return emptyProgress(); }
  });

  useEffect(() => {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }
    catch { /* Keep working in memory when browser storage is unavailable. */ }
  }, [progress]);

  const recordActivity = useCallback((event: ProgressEvent) => {
    const occurredAt = new Date().toISOString();
    setProgress(previous => recordProgressEvent(previous, event, occurredAt));
  }, []);
  const consultSign = useCallback((signId: string) => setProgress(previous => recordSignConsultation(previous, signId)), []);

  return <ProgressContext value={{ progress, recordActivity, consultSign }}>{children}</ProgressContext>;
}
