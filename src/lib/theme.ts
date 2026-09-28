import { triggerHaptic } from './haptics';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_KEY = 'plotpilot-theme';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return 'system';
}

export function applyTheme(mode: ThemeMode, withHaptic = false) {
  if (typeof window === 'undefined') return;

  if (withHaptic) {
    triggerHaptic('light');
  }

  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // Ignore storage errors
  }

  const root = document.documentElement;

  if (mode === 'dark') {
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
  } else if (mode === 'light') {
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
  } else {
    // System: remove manual override and match system preferences
    root.removeAttribute('data-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}
