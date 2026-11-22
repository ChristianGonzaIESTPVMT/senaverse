import { homeVisuals, type HomeVisualName } from '../data/homeVisuals';
import './HomeVisual.css';

function Placeholder({ name }: { name: HomeVisualName }) {
  if (name === 'brand' || name === 'welcome') {
    return <span className="home-visual-emoji">👋</span>;
  }

  return (
    <svg viewBox="0 0 80 80" fill="none" stroke="#211a38" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      {(name === 'lessons' || name === 'hero') && <>
        <path d="M40 23C30 13 16 12 7 17v45c12-5 24-2 33 7 9-9 21-12 33-7V17c-9-5-23-4-33 6Z" fill="#6696ff" />
        <path d="M12 23v33c10-2 17 0 23 5V28c-7-5-15-7-23-5Z" fill="#83b2ff" stroke="none" />
        <path d="M45 28v33c6-5 13-7 23-5V23c-8-2-16 0-23 5Z" fill="#4d7aee" stroke="none" />
        <path d="M7 62c12-5 24-2 33 7 9-9 21-12 33-7M40 23v46" />
      </>}
      {name === 'experience' && <>
        <path d="m40 8 10 21 23 3-17 17 4 24-20-11-20 11 4-24L7 32l23-3Z" fill="#ffda47" />
        <path d="m40 18-7 17-15 2 14 5Z" fill="#fff29e" stroke="none" />
        <path d="m42 54 13 8-3-15 11-11-18 8Z" fill="#f8bc31" stroke="none" />
      </>}
      {name === 'progress' && <>
        <circle cx="36" cy="44" r="29" fill="#ff6c78" />
        <circle cx="36" cy="44" r="21" fill="#fffdf6" strokeWidth="2.5" />
        <circle cx="36" cy="44" r="13" fill="#ff6c78" strokeWidth="2.5" />
        <circle cx="36" cy="44" r="5" fill="#fffdf6" stroke="none" />
        <path d="m37 43 24-25" strokeWidth="4" />
        <path d="m54 13 10-7 1 12 10 2-11 11-11-1Z" fill="#59c7f7" />
        <path d="m54 30 11-12" strokeWidth="2" />
      </>}
      {name === 'learning' && <>
        <path d="m5 28 19-7 31 9 20-8v48l-20 7-31-9-19 7Z" fill="#b7e970" />
        <path d="m5 28 19-7v20L5 56Zm50 2 20-8v29L55 40Z" fill="#92daf0" stroke="none" />
        <path d="m6 58 17-13 17 13 14-15 20 16" stroke="#8bc445" strokeWidth="7" />
        <path d="m24 23 0 45m31-37v44" strokeWidth="2" />
        <path d="M66 19c0 11-15 28-15 28S36 30 36 19a15 15 0 0 1 30 0Z" fill="#b17be9" />
        <circle cx="51" cy="19" r="6" fill="#fff" strokeWidth="2.5" />
      </>}
      {name === 'library' && <>
        <path d="M64 12H22a10 10 0 0 0 0 20h42" fill="#8ca2ff" />
        <path d="M64 16H24a6 6 0 0 0 0 12h40c-3-4-3-8 0-12Z" fill="#fffdf6" stroke="none" />
        <path d="M66 12c-4 6-4 14 0 20M24 22h34" strokeWidth="2" />
        <path d="M67 32H17a10 10 0 0 0 0 20h50" fill="#ffdc4b" />
        <path d="M66 36H20a6 6 0 0 0 0 12h46c-3-4-3-8 0-12Z" fill="#fffdf6" stroke="none" />
        <path d="M67 32c-4 6-4 14 0 20M21 42h38" strokeWidth="2" />
        <path d="M65 52H20a10 10 0 0 0 0 20h45" fill="#ff81ac" />
        <path d="M64 56H23a6 6 0 0 0 0 12h41c-3-4-3-8 0-12Z" fill="#fffdf6" stroke="none" />
        <path d="M65 52c-4 6-4 14 0 20M24 62h33" strokeWidth="2" />
      </>}
      {name === 'games' && <>
        <path d="M25 20c-9-3-15 6-19 20-4 13-6 26 1 29 8 4 15-11 22-12h22c7 1 14 16 22 12 7-3 5-16 1-29-4-14-10-23-19-20-10 3-20 3-30 0Z" fill="#aa79e7" />
        <path d="M12 59c3-17 9-29 17-30h26c6 0 10 6 14 15" stroke="#c4a1f4" strokeWidth="6" />
        <path d="M24 34v18m-9-9h18" stroke="#fff" strokeWidth="6" />
        <circle cx="58" cy="35" r="3.5" fill="#ffdc50" stroke="none" />
        <circle cx="66" cy="43" r="3.5" fill="#ffd04c" stroke="none" />
        <circle cx="50" cy="43" r="3.5" fill="#ffdc50" stroke="none" />
        <circle cx="58" cy="51" r="3.5" fill="#ffc84a" stroke="none" />
      </>}
    </svg>
  );
}

export function HomeVisual({ name, className = '', decorative = true }: {
  name: HomeVisualName;
  className?: string;
  decorative?: boolean;
}) {
  const visual = homeVisuals[name];

  return (
    <span className={`home-visual home-visual-${name} ${className}`} aria-hidden={decorative ? true : undefined}>
      {visual.src ? (
        <img src={visual.src} alt={decorative ? '' : visual.alt} style={{ objectFit: visual.fit ?? 'contain' }} />
      ) : (
        <span className="home-visual-placeholder" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : visual.alt}>
          <Placeholder name={name} />
        </span>
      )}
    </span>
  );
}
