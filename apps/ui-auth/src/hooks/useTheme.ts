import { useEffect, useState } from 'react';

export type Theme = 'dark';

const THEMES: Theme[] = ['dark'];

export function useTheme() {
  const [theme] = useState<Theme>('dark');

  useEffect(() => {
    const root = document.documentElement;

    // Set data-theme attribute to dark
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');

    // Save to localStorage
    localStorage.setItem('theme', 'dark');
  }, []);

  const cycleTheme = () => {
    // No-op for MVP
  };

  const setThemeByName = (_themeName: Theme) => {
    // No-op for MVP
  };

  return { theme, cycleTheme, setThemeByName, availableThemes: THEMES };
}