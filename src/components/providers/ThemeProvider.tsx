'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('licona-theme') as Theme | null;
    if (saved && ['dark', 'light', 'system'].includes(saved)) {
      setThemeState(saved);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme(t: Theme) {
      root.classList.remove('theme-dark', 'theme-light');
      if (t === 'system') {
        const sys = getSystemTheme();
        root.classList.add(`theme-${sys}`);
        setResolvedTheme(sys);
      } else {
        root.classList.add(`theme-${t}`);
        setResolvedTheme(t);
      }
    }

    applyTheme(theme);

    // Listen for system theme changes when 'system' is selected
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem('licona-theme', t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
