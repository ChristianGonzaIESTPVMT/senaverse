import { useEffect, useMemo, useState } from 'react';
import { selectStudentOverview } from '../data/studentOverview';
import { useStudentProgress } from './progressContext';

export function useStudentOverview() {
  const { progress } = useStudentProgress();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    return () => window.cancelAnimationFrame(frame);
  }, [progress]);
  return { now, summary: useMemo(() => selectStudentOverview(progress, now), [progress, now]) };
}
