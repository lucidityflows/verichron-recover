import React, { createContext, useContext, useEffect, useCallback } from 'react';

interface HotkeysContextValue {
  registerHotkey: (key: string, callback: () => void) => void;
  unregisterHotkey: (key: string) => void;
}

const HotkeysContext = createContext<HotkeysContextValue | undefined>(undefined);

export const HotkeysProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hotkeyMapRef = React.useRef<Map<string, () => void>>(new Map());

  const registerHotkey = useCallback((key: string, callback: () => void) => {
    hotkeyMapRef.current.set(key, callback);
  }, []);

  const unregisterHotkey = useCallback((key: string) => {
    hotkeyMapRef.current.delete(key);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const key = `${e.altKey ? 'Alt+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key.toUpperCase()}`;
      const callback = hotkeyMapRef.current.get(key);

      if (callback) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <HotkeysContext.Provider value={{ registerHotkey, unregisterHotkey }}>
      {children}
    </HotkeysContext.Provider>
  );
};

export const useHotkeys = () => {
  const context = useContext(HotkeysContext);
  if (!context) throw new Error('useHotkeys must be used within HotkeysProvider');
  return context;
};

/**
 * Hook for registering a single hotkey
 *
 * @example
 * useHotkey('Alt+C', () => console.log('Call action'));
 * useHotkey('Ctrl+Shift+N', () => console.log('New note'));
 */
export const useHotkey = (key: string, callback: () => void) => {
  const { registerHotkey, unregisterHotkey } = useHotkeys();

  useEffect(() => {
    registerHotkey(key, callback);
    return () => unregisterHotkey(key);
  }, [key, callback, registerHotkey, unregisterHotkey]);
};
