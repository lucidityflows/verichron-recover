import React from 'react';
import { Phone, Mail, Clock, TrendingUp, AlertCircle, CreditCard, MessageSquare } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useHotkey } from '@/shared/contexts/HotkeysContext';
import { type WorkQueueItemDto } from '@/api/generated/collectors_models';

interface SmartPlaylistProps {
  items: WorkQueueItemDto[];
  onSelectItem: (debtorId: string) => void;
  activeItemId?: string;
}

/**
 * SmartPlaylist
 * Spotify-style work queue with keyboard navigation
 *
 * Design Philosophy: "The Playlist" - Next 10 accounts, auto-prioritized
 * Keyboard: j/k to navigate, Enter to select
 */
export const SmartPlaylist: React.FC<SmartPlaylistProps> = ({
  items,
  onSelectItem,
  activeItemId,
}) => {
  // Enter to select ONLY if top item
  useHotkey('ENTER', () => {
    if (items.length > 0) {
      onSelectItem(items[0].debtorId);
    }
  });

  const priorityColors = {
    URGENT: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-l-red-500' },
    HIGH: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-l-amber-500' },
    MEDIUM: { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-l-indigo-500' },
    LOW: { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-l-slate-400' },
  };

  const getActionIcon = (type: string | null | undefined) => {
    switch (type) {
      case 'CALL': return Phone;
      case 'EMAIL': return Mail;
      case 'LETTER': return Clock;
      case 'PAYMENT': return CreditCard;
      case 'SMS': return MessageSquare;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 rounded-lg border border-slate-200">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
          Next Up
        </span>
        <span className="text-xs font-mono font-bold text-slate-900">
          {items.length} items remaining
        </span>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12 px-4">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
            <TrendingUp size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-sm text-slate-600">
            Great job! Your queue is empty.
          </p>
        </div>
      )}

      {/* Playlist Items */}
      <div className="space-y-1">
        {items.slice(0, 10).map((item, index) => {
          const isTop = index === 0;
          const isActive = item.debtorId === activeItemId;
          const priority = priorityColors[item.priorityLabel] || priorityColors.LOW;
          const ActionIcon = getActionIcon(item.nextActionType);

          return (
            <button
              key={item.itemId}
              disabled={!isTop}
              onClick={() => {
                if (isTop) onSelectItem(item.debtorId);
              }}
              className={cn(
                'w-full text-left p-4 rounded-lg border-l-4 transition-all relative',
                isTop ? 'hover:shadow-md hover:scale-[1.01] bg-white border-slate-200 cursor-pointer ring-1 ring-indigo-500/20' : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed grayscale-[0.5]',
                isActive && 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-500',
                priority.border,
              )}
            >
              {/* Top Row: Name + Priority */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isTop && (
                    <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center animate-pulse">
                      <Play size={10} className="text-white fill-current ml-0.5" />
                    </div>
                  )}
                  <span className={cn(
                    'text-sm font-bold',
                    isTop ? 'text-slate-900' : 'text-slate-500'
                  )}>
                    {item.debtorName}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                    isTop ? (priority.bg + ' ' + priority.text) : 'bg-slate-200 text-slate-400'
                  )}
                >
                  {item.priorityLabel}
                </span>
              </div>

              {/* Middle Row: Balance + Days Overdue */}
              <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                <span className={cn(
                  'font-mono font-bold',
                  isTop ? 'text-slate-900' : 'text-slate-400'
                )}>
                  ${item.totalBalance.toLocaleString()}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <AlertCircle size={12} className={isTop ? "text-red-500" : "text-slate-300"} />
                  {item.daysOverdue}d overdue
                </span>
              </div>

              {/* Bottom Row: Next Action + Last Contact */}
              <div className="flex items-center gap-3 text-xs">
                <div className={cn(
                  "flex items-center gap-1 font-medium",
                  isTop ? "text-indigo-600" : "text-slate-400"
                )}>
                  <ActionIcon size={12} />
                  {item.nextActionType || 'Review'} Due
                </div>
                {item.lastContactDate && (
                  <>
                    <span className="text-slate-400">•</span>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock size={12} />
                      Last: {new Date(item.lastContactDate).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>

              {/* Selection Indicator */}
              {isTop && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <kbd className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold shadow-sm">
                    ↵ START
                  </kbd>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="pt-4 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Alghorithmically Optimized Priority
          </p>
        </div>
      )}
    </div>
  );
};

const Play: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);