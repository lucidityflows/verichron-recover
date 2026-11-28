/**
 * @deprecated This hook is deprecated. Use `useThemeStore` from '../store' instead.
 * This wrapper is kept for backward compatibility.
 */

import { useThemeStore, Theme } from '../store/index.js';

export type { Theme };

export function useTheme() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const cycleTheme = useThemeStore((state) => state.cycleTheme);
  const availableThemes = useThemeStore((state) => state.availableThemes);

  return {
    theme,
    cycleTheme,
    setThemeByName: setTheme,
    availableThemes,
  };
}
