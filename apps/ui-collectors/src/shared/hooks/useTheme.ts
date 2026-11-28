import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const THEMES: Theme[] = ['light', 'dark'];

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');

    if (stored && (THEMES as string[]).includes(stored)) {
      return stored as Theme;
    }

    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setThemeByName = (themeName: Theme) => {
    if (THEMES.includes(themeName)) {
      setTheme(themeName);
    }
  };

  return { theme, toggleTheme, setThemeByName, availableThemes: THEMES };
}
