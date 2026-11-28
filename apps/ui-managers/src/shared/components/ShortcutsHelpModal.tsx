import { Keyboard, X } from 'lucide-react';
import { Modal } from './Modal.js';
import type { ShortcutDefinition } from '@/shared/hooks/useGlobalShortcuts';
import { formatShortcutKeys, groupShortcutsByCategory, getModifierKeyName } from '@/shared/hooks/useGlobalShortcuts';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutDefinition[];
}

export function ShortcutsHelpModal({ isOpen, onClose, shortcuts }: ShortcutsHelpModalProps) {
  const categorizedShortcuts = groupShortcutsByCategory(shortcuts);
  const modifierKey = getModifierKeyName();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="lg"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-muted-foreground">
            Press <kbd className="px-2 py-1 bg-gray-100 text-gray-800 rounded border border-gray-300">?</kbd> anytime to view this help
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <Keyboard className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-foreground">Speed up your workflow</h3>
            <p className="text-sm text-muted-foreground">
              Use these keyboard shortcuts to navigate and perform actions quickly
            </p>
          </div>
        </div>

        {/* Shortcuts by Category */}
        {categorizedShortcuts.map((category) => (
          <div key={category.name}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
              {category.name}
            </h3>
            <div className="space-y-2">
              {category.shortcuts.map((shortcut, idx) => {
                const keys = formatShortcutKeys({
                  key: shortcut.key,
                  ctrlKey: shortcut.ctrlKey,
                  shiftKey: shortcut.shiftKey,
                  altKey: shortcut.altKey,
                });

                // Replace "Ctrl" with platform-specific modifier
                const displayKeys = keys.replace('Ctrl', modifierKey);

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {displayKeys.split('+').map((key, keyIdx) => (
                        <span key={keyIdx} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300 rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIdx < displayKeys.split('+').length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Tips Section */}
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">💡 Tips</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Keyboard shortcuts work from anywhere on this page</li>
            <li>• Some shortcuts are disabled when typing in text fields</li>
            <li>• Use <kbd className="px-1.5 py-0.5 bg-yellow-100 text-yellow-900 rounded border border-yellow-300">Tab</kbd> to navigate between form fields</li>
            <li>• Press <kbd className="px-1.5 py-0.5 bg-yellow-100 text-yellow-900 rounded border border-yellow-300">Esc</kbd> to close modals</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
