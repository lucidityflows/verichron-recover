/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React from 'react';
import { 
  User, 
  Clock, 
  Phone, 
  Coffee 
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface Collector {
  id: string;
  name: string;
  status: 'ACTIVE' | 'IDLE' | 'BREAK' | 'OFFLINE';
  currentDebtorName?: string;
  todayCollected: number;
  todayGoal: number;
  callsToday: number;
  lastActivity?: string;
}

interface FloorMapProps {
  collectors: Collector[];
  onSelectCollector?: (collectorId: string) => void;
}

/**
 * FloorMap
 * "The Maitre D's View" - Real-time floor status of all collectors
 *
 * Design Philosophy: "At a Glance" - See who's working, who needs help
 * - Grid of collector cards with status indicators
 * - Green = Active on call, Amber = Idle, Blue = Break, Gray = Offline
 * - Click card to see detailed stats or intervene
 * - Pulsing animation for active status
 */
export const FloorMap: React.FC<FloorMapProps> = ({ collectors, onSelectCollector }) => {
  const getStatusConfig = (status: Collector['status']) => {
    const configs = {
      ACTIVE: {
        color: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-500',
        icon: Phone,
        label: 'On Call',
        pulse: true,
      },
      IDLE: {
        color: 'bg-amber-500',
        textColor: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-500',
        icon: Clock,
        label: 'Idle',
        pulse: false,
      },
      BREAK: {
        color: 'bg-blue-500',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-500',
        icon: Coffee,
        label: 'On Break',
        pulse: false,
      },
      OFFLINE: {
        color: 'bg-slate-400',
        textColor: 'text-slate-600',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-300',
        icon: User,
        label: 'Offline',
        pulse: false,
      },
    }[status];

    return configs;
  };

  const formatLastActivity = (lastActivity?: string) => {
    if (!lastActivity) return 'No activity';

    const date = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  if (collectors.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
          <User size={32} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-2">No Collectors Found</h3>
        <p className="text-xs text-slate-500">Collectors will appear here when they come online.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {collectors.map((collector) => {
        const config = getStatusConfig(collector.status);
        const Icon = config.icon;
        const goalProgress = (collector.todayCollected / collector.todayGoal) * 100;
        const isOnTrack = goalProgress >= 75;

        return (
          <button
            key={collector.id}
            onClick={() => onSelectCollector?.(collector.id)}
            className={cn(
              'bg-white rounded-xl border-2 p-4 text-left transition-all hover:shadow-lg',
              config.borderColor,
              'hover:scale-105'
            )}
          >
            {/* Header with Status */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center relative',
                    config.color
                  )}
                >
                  <Icon size={18} className="text-white" />
                  {config.pulse && (
                    <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{collector.name}</div>
                  <div className={cn('text-xs font-medium', config.textColor)}>{config.label}</div>
                </div>
              </div>
            </div>

            {/* Current Activity */}
            {collector.currentDebtorName && collector.status === 'ACTIVE' && (
              <div className={cn('mb-3 px-3 py-2 rounded-lg text-xs', config.bgColor)}>
                <div className="font-medium text-slate-700">Working on:</div>
                <div className="font-bold text-slate-900 truncate">{collector.currentDebtorName}</div>
              </div>
            )}

            {/* Stats */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Collected Today</span>
                <span
                  className={cn(
                    'font-mono font-bold',
                    isOnTrack ? 'text-emerald-600' : 'text-slate-900'
                  )}
                >
                  ${collector.todayCollected.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Calls Made</span>
                <span className="font-mono font-bold text-slate-900">{collector.callsToday}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'
                  )}
                  style={{ width: `${Math.min(goalProgress, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{goalProgress.toFixed(0)}% of goal</span>
                <span>{formatLastActivity(collector.lastActivity)}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
