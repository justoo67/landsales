'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { ThemeMode, getStoredTheme, applyTheme } from '@/lib/theme';

export default function ThemeSegmentedControl() {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const active = getStoredTheme();
    setCurrentTheme(active);
    applyTheme(active, false);

    // Watch for system preference changes when in 'system' mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (getStoredTheme() === 'system') {
        applyTheme('system', false);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const handleSelect = (mode: ThemeMode) => {
    setCurrentTheme(mode);
    applyTheme(mode, true);
  };

  if (!mounted) {
    return (
      <div className="w-full h-12 bg-slate-100 rounded-2xl animate-pulse" />
    );
  }

  const options: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'system', label: 'System', icon: Laptop },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme appearance"
      className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 border border-slate-200/70"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = currentTheme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => handleSelect(opt.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all touch-manipulation min-h-[38px] active:scale-95 ${
              isSelected
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 ${
                isSelected ? 'text-sky-600' : 'text-slate-400'
              }`}
            />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
