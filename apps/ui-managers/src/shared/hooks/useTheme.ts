import { useEffect } from 'react';

export type Theme = 'dark';

export function useTheme() {
  const theme: Theme = 'dark';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  // No-ops for compatibility
  const toggleTheme = () => {};
  const setThemeByName = () => {};

  return { theme, toggleTheme, setThemeByName, availableThemes: ['dark'] };
}