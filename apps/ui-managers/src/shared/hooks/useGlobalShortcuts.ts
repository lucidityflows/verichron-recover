import { useEffect } from 'react';

export interface ShortcutDefinition {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  category: 'navigation' | 'actions' | 'help';
  handler: () => void;
  enabled?: boolean;
}

export interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutDefinition[];
}

/**
 * Global keyboard shortcuts hook
 * Manages multiple shortcuts with categories and help system
 */
export function useGlobalShortcuts(shortcuts: ShortcutDefinition[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        // Skip if shortcut is disabled
        if (shortcut.enabled === false) continue;

        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.altKey ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          // Allow '?' shortcut even in input fields
          if (shortcut.key === '?' || !isInputField) {
            event.preventDefault();
            shortcut.handler();
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Format shortcut keys for display
 */
export function formatShortcutKeys(shortcut: Omit<ShortcutDefinition, 'handler' | 'description' | 'category' | 'enabled'>): string {
  const keys: string[] = [];

  if (shortcut.ctrlKey) keys.push('Ctrl');
  if (shortcut.shiftKey) keys.push('Shift');
  if (shortcut.altKey) keys.push('Alt');
  keys.push(shortcut.key.toUpperCase());

  return keys.join('+');
}

/**
 * Get platform-specific modifier key name
 */
export function getModifierKeyName(): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  return isMac ? '⌘' : 'Ctrl';
}

/**
 * Group shortcuts by category
 */
export function groupShortcutsByCategory(shortcuts: ShortcutDefinition[]): ShortcutCategory[] {
  const categories: Record<string, ShortcutDefinition[]> = {
    navigation: [],
    actions: [],
    help: [],
  };

  shortcuts.forEach(shortcut => {
    if (categories[shortcut.category]) {
      categories[shortcut.category].push(shortcut);
    }
  });

  return [
    { name: 'Navigation', shortcuts: categories.navigation },
    { name: 'Actions', shortcuts: categories.actions },
    { name: 'Help', shortcuts: categories.help },
  ].filter(cat => cat.shortcuts.length > 0);
}
