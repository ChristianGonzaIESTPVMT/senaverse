import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getServerTheme, getThemeSnapshot, selectTheme, subscribeTheme } from '../data/theme';
import './ThemeToggle.css';

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerTheme);
  const dark = theme === 'dark';
  const label = `Cambiar al tema ${dark ? 'claro' : 'oscuro'}`;
  const Icon = dark ? Moon : Sun;

  return <button type="button" className="theme-toggle" aria-label={label} aria-pressed={dark} title={label} onClick={() => selectTheme(dark ? 'light' : 'dark')}>
    <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
  </button>;
}
