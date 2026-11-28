import { Palette } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useThemeStore, Theme } from '../store/index.js';

const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  cool: 'Cool',
  'cool-dark': 'Cool Dark',
  warm: 'Warm',
  cosmic: 'Cosmic',
  prism: 'Prism',
};

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const availableThemes = useThemeStore((state) => state.availableThemes);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-accent/10 transition-colors group flex items-center gap-2"
        title="Change theme"
      >
        <Palette className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
        <span className="hidden sm:block text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {THEME_LABELS[theme]}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {availableThemes.map((themeName) => (
            <button
              key={themeName}
              onClick={() => {
                setTheme(themeName);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                theme === themeName
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {THEME_LABELS[themeName]}
              {theme === themeName && (
                <span className="ml-2">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
