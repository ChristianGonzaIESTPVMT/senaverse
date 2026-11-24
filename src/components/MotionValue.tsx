import { useLayoutEffect, useRef } from 'react';

export function MotionValue({ value, formatted = String(value) }: { value: number; formatted?: string }) {
  const element = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useLayoutEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    const node = element.current;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!node || motionPreference.matches) return;

    const style = getComputedStyle(node);
    const animation = node.animate(
      [{ transform: 'translateY(3px)', opacity: .85 }, { transform: 'none', opacity: 1 }],
      { duration: Number.parseFloat(style.getPropertyValue('--sv-motion-transition')), easing: style.getPropertyValue('--sv-motion-ease').trim() },
    );
    const cancel = () => animation.cancel();
    motionPreference.addEventListener('change', cancel);
    return () => {
      cancel();
      motionPreference.removeEventListener('change', cancel);
    };
  }, [value]);

  return <span className="sv-motion-value" ref={element}>{formatted}</span>;
}
