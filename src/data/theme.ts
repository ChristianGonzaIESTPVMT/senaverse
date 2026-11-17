export const THEME_KEY = 'senaverse-theme-v1';
export const THEME_EVENT = 'senaverse-theme-change';
export type Theme = 'light' | 'dark';

export function restoreTheme(value: string | null): Theme {
  return value === 'dark' ? 'dark' : 'light';
}

export function getThemeSnapshot(): Theme {
  return typeof document === 'undefined' ? 'light' : restoreTheme(document.documentElement.dataset.theme ?? null);
}

export function getServerTheme(): Theme {
  return 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171326' : '#6330da');
}

export function selectTheme(theme: Theme) {
  applyTheme(theme);
  try { localStorage.setItem(THEME_KEY, theme); }
  catch { /* Theme changes still work for this session when storage is blocked. */ }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeTheme(onChange: () => void) {
  const syncStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    try { if (event.storageArea !== localStorage) return; }
    catch { return; }
    applyTheme(restoreTheme(event.newValue));
    onChange();
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener('storage', syncStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener('storage', syncStorage);
  };
}
