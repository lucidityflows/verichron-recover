/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import React from 'react';
import { Phone, DollarSign, CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface FeedEvent {
  id: string;
  type: 'CALL' | 'PAYMENT' | 'PTP' | 'SETTLEMENT_APPROVED' | 'SETTLEMENT_REJECTED' | 'GOAL_HIT';
  collectorName: string;
  debtorName?: string;
  amount?: number;
  timestamp: string;
  metadata?: any;
}

interface LiveFeedProps {
  events: FeedEvent[];
  limit?: number;
}

/**
 * LiveFeed
 * Real-time activity stream for team lead monitoring
 *
 * Design Philosophy: "The Pulse" - See what's happening now
 * - Shows last 20 team events
 * - Auto-scrolls on new events
 * - Color-coded by event type
 * - Compact design for quick scanning
 */
export const LiveFeed: React.FC<LiveFeedProps> = ({ events, limit = 20 }) => {
  const getEventConfig = (type: FeedEvent['type']) => {
    const configs = {
      CALL: {
        icon: Phone,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        label: 'Call Made',
      },
      PAYMENT: {
        icon: DollarSign,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        label: 'Payment Received',
      },
      PTP: {
        icon: FileText,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        label: 'Promise to Pay',
      },
      SETTLEMENT_APPROVED: {
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        label: 'Settlement Approved',
      },
      SETTLEMENT_REJECTED: {
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        label: 'Settlement Rejected',
      },
      GOAL_HIT: {
        icon: CheckCircle2,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        label: 'Goal Achieved',
      },
    }[type];

    return configs;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const limitedEvents = events.slice(0, limit);

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
          <Clock size={32} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-2">No Activity Yet</h3>
        <p className="text-xs text-slate-500">Team activity will appear here in real-time.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-tight text-slate-700">Live Activity Feed</h3>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500">{events.length} events</span>
          </div>
        </div>
      </div>

      {/* Feed Items */}
      <div className="max-h-96 overflow-y-auto">
        {limitedEvents.map((event, index) => {
          const config = getEventConfig(event.type);
          const Icon = config.icon;

          return (
            <div
              key={event.id}
              className={cn(
                'px-4 py-3 border-b border-slate-100 transition-colors hover:bg-slate-50',
                index === 0 && 'bg-indigo-50/30'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn('h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0', config.bgColor)}>
                  <Icon size={14} className={config.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{event.collectorName}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">{formatTimestamp(event.timestamp)}</span>
                  </div>

                  {/* Details */}
                  <div className="text-sm text-slate-600">
                    {event.debtorName && (
                      <span className="font-medium">
                        {event.debtorName}
                        {event.amount && (
                          <span className={cn('ml-2 font-mono font-bold', config.color)}>
                            ${event.amount.toLocaleString()}
                          </span>
                        )}
                      </span>
                    )}
                    {!event.debtorName && event.amount && (
                      <span className={cn('font-mono font-bold', config.color)}>
                        ${event.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {events.length > limit && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-center">
          <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
            Show {events.length - limit} more events →
          </button>
        </div>
      )}
    </div>
  );
};
