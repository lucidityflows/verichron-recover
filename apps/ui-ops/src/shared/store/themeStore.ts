import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'cool' | 'cool-dark' | 'warm' | 'cosmic' | 'prism';

const THEMES: Theme[] = ['light', 'dark', 'cool', 'cool-dark', 'warm', 'cosmic', 'prism'];

interface ThemeState {
  theme: Theme;
  availableThemes: Theme[];
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      availableThemes: THEMES,

      setTheme: (theme: Theme) => {
        if (THEMES.includes(theme)) {
          set({ theme });
          // Update DOM attribute
          document.documentElement.setAttribute('data-theme', theme);
        }
      },

      cycleTheme: () => {
        const { theme } = get();
        const currentIndex = THEMES.indexOf(theme);
        const nextIndex = (currentIndex + 1) % THEMES.length;
        const nextTheme = THEMES[nextIndex];
        get().setTheme(nextTheme);
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme to DOM after rehydration
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);
