import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutOptions {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  key: string;
  onTrigger: () => void;
  enabled?: boolean;
}

/**
 * Hook to register keyboard shortcuts
 *
 * @example
 * useKeyboardShortcut({
 *   key: 'Enter',
 *   ctrlKey: true,
 *   onTrigger: handleSubmit,
 * });
 */
export function useKeyboardShortcut({
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
  key,
  onTrigger,
  enabled = true,
}: KeyboardShortcutOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const keyMatches = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatches = ctrlKey ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftMatches = shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatches = altKey ? event.altKey : !event.altKey;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        event.preventDefault();
        onTrigger();
      }
    },
    [key, ctrlKey, shiftKey, altKey, onTrigger, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}
