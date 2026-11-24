import type { CSSProperties } from 'react';

export function MotionProgress({ value, max, label, animateOnMount = true }: { value: number; max: number; label: string; animateOnMount?: boolean }) {
  return <div className="sv-motion-progress">
    <progress value={value} max={max} aria-label={label} />
    <span className={`sv-motion-progress-fill${animateOnMount ? '' : ' sv-motion-progress-settled'}`} aria-hidden="true"
      style={{ '--sv-progress-value': value / max } as CSSProperties} />
  </div>;
}
