/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { Phone, Mail, DollarSign, FileText, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { type DebtorFocusTimelineEventDto, type TimelineEventType } from '@/api/generated/collectors_models';

interface ContextTimelineProps {
  events: DebtorFocusTimelineEventDto[];
  limit?: number;
}

/**
 * ContextTimeline
 * Filtered interaction history showing only meaningful events
 *
 * Design Philosophy: "Anticipatory UI" - Show context, not data dump
 * - Filters OUT system noise (auto-emails, status changes)
 * - Filters IN human interactions (calls, payments, promises)
 * - Reverse chronological (newest first)
 * - Visual icons for quick scanning
 */
export const ContextTimeline: React.FC<ContextTimelineProps> = ({
  events,
  limit = 10,
}) => {
  const [displayLimit, setDisplayLimit] = React.useState(limit);

  const getEventConfig = (type: TimelineEventType) => {
    const configs: Record<string, any> = {
      CALL: {
        icon: Phone,
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/10',
        borderColor: 'border-sky-500/30',
        label: 'Call',
      },
      EMAIL: {
        icon: Mail,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        label: 'Email',
      },
      SMS: {
        icon: MessageSquare,
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/30',
        label: 'SMS',
      },
      LETTER: {
        icon: FileText,
        color: 'text-slate-400',
        bgColor: 'bg-slate-800',
        borderColor: 'border-slate-700',
        label: 'Letter',
      },
      PAYMENT: {
        icon: DollarSign,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        label: 'Payment',
      },
      PROMISE: {
        icon: AlertCircle,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        label: 'Promise to Pay',
      },
      NOTE: {
        icon: FileText,
        color: 'text-slate-400',
        bgColor: 'bg-slate-800',
        borderColor: 'border-slate-700',
        label: 'Note',
      },
    };

    return configs[type] || configs.NOTE;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const limitedEvents = events.slice(0, displayLimit);

  if (events.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-8 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-800 mb-4">
          <Clock size={32} className="text-slate-500" />
        </div>
        <h3 className="text-sm font-bold text-white mb-2">No Previous Interactions</h3>
        <p className="text-xs text-slate-500">This debtor has not been contacted yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-tight text-slate-400">
          Recent Activity
        </h3>
        <span className="text-xs font-medium text-slate-500">
          {events.length} total interactions
        </span>
      </div>

      <div className="space-y-4">
        {limitedEvents.map((event, index) => {
          const config = getEventConfig(event.eventType);
          const Icon = config.icon;

          return (
            <div key={event.id} className="relative">
              {/* Timeline connector line (except for last item) */}
              {index < limitedEvents.length - 1 && (
                <div className="absolute left-5 top-12 bottom-0 w-px bg-slate-700" />
              )}

              {/* Event card */}
              <div className="flex gap-4">
                {/* Icon */}
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 bg-slate-900 z-10',
                  config.borderColor
                )}>
                  <Icon size={18} className={config.color} />
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-sm font-bold', config.color)}>
                          {config.label}
                        </span>
                        {!!event.metadata?.outcome && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-xs font-medium text-slate-400">
                              {event.metadata.outcome as React.ReactNode}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={12} />
                        <span>{formatDate(event.timestamp)}</span>
                        {event.performedByName && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span>by {event.performedByName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount badge (for payments/promises) */}
                    {!!event.metadata?.amount && (
                      <div className={cn(
                        'px-2 py-1 rounded-md font-mono text-xs font-bold',
                        config.bgColor,
                        config.color
                      )}>
                        ${Number(event.metadata.amount).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {event.description && (
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-800 rounded-lg p-3 border border-slate-700">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more indicator */}
      {events.length > displayLimit && (
        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={() => setDisplayLimit(prev => prev + 10)}
            className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
          >
            Show {Math.min(10, events.length - displayLimit)} more interactions →
          </button>
        </div>
      )}
    </div>
  );
};