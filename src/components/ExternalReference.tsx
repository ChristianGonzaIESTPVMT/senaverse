import { useSyncExternalStore, type ReactNode } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const readConnection = () => navigator.onLine;
const serverConnection = () => true;

export function ExternalReference({ href, children, className, label }: {
  href: string;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const online = useSyncExternalStore(subscribe, readConnection, serverConnection);
  return <>
    <a className={className} href={href} aria-label={label} target="_blank" rel="noopener noreferrer"
      title="La fuente externa requiere conexión a internet.">{children}</a>
    {!online && <small className="external-reference-status" role="status">Conéctate a internet para abrir la referencia externa.</small>}
  </>;
}
