import { createContext, useContext } from 'react';
import type { ProgressEvent, StudentProgress } from '../data/progress';

export const ProgressContext = createContext<{
  progress: StudentProgress;
  recordActivity: (event: ProgressEvent) => void;
  consultSign: (signId: string) => void;
} | null>(null);

export function useStudentProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useStudentProgress requiere StudentProgressProvider.');
  return context;
}
