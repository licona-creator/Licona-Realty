'use client';

import { createContext, useContext, type ReactNode } from 'react';

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Force dark mode always - device preference is ignored
  return (
    <ThemeContext.Provider value={{ theme: 'dark', setTheme: () => {}, resolvedTheme: 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}
