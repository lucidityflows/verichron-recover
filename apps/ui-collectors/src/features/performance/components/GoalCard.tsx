import React from 'react';
import { Phone, DollarSign, FileText, Target, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface GoalCardProps {
  goalType: 'CALLS' | 'COLLECTED' | 'PTPS' | 'CONTACTS' | 'CUSTOM';
  label: string;
  current: number;
  target: number;
  unit?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  color?: 'indigo' | 'emerald' | 'amber' | 'blue' | 'purple';
  showPercentage?: boolean;
}

/**
 * GoalCard
 * Individual goal progress card with visual progress bar
 *
 * Design Philosophy: "The Scoreboard" - Make progress visible
 * - Horizontal progress bar with percentage
 * - Color-coded by goal type
 * - Icon representing metric type
 * - Shows current/target with units
 * - Green checkmark when complete
 */
export const GoalCard: React.FC<GoalCardProps> = ({
  goalType,
  label,
  current = 0,
  target = 0,
  unit = '',
  icon,
  color = 'indigo',
  showPercentage = true,
}) => {
  const safeCurrent = current ?? 0;
  const safeTarget = target ?? 0;
  
  const percentage = safeTarget > 0 ? Math.min((safeCurrent / safeTarget) * 100, 100) : 0;
  const isComplete = percentage >= 100;
  const isOnTrack = percentage >= 75;

  // Default icons by type
  const defaultIcons = {
    CALLS: Phone,
    COLLECTED: DollarSign,
    PTPS: FileText,
    CONTACTS: Target,
    CUSTOM: Clock,
  };

  const Icon = icon || defaultIcons[goalType];

  // Color configurations
  const colorConfig = {
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      icon: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      progress: 'bg-indigo-500',
      text: 'text-indigo-600',
    },
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      progress: 'bg-emerald-500',
      text: 'text-emerald-600',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      iconBg: 'bg-amber-100',
      progress: 'bg-amber-500',
      text: 'text-amber-600',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100',
      progress: 'bg-blue-500',
      text: 'text-blue-600',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
      iconBg: 'bg-purple-100',
      progress: 'bg-purple-500',
      text: 'text-purple-600',
    },
  }[color];

  return (
    <div
      className={cn(
        'bg-white rounded-xl border-2 p-6 transition-all hover:shadow-md',
        isComplete ? 'border-emerald-500' : colorConfig.border
      )}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', colorConfig.iconBg)}>
              <Icon size={20} className={colorConfig.icon} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">{label}</div>
              <div className="text-xs text-slate-500">{goalType.toLowerCase().replace('_', ' ')}</div>
            </div>
          </div>

          {/* Completion Badge */}
          {isComplete && (
            <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">
              <CheckCircle2 size={12} />
              Complete
            </div>
          )}
        </div>

        {/* Current / Target */}
        <div className="flex items-baseline gap-2">
          <span className={cn('text-3xl font-mono font-bold', isComplete ? 'text-emerald-600' : 'text-slate-900')}>
            {safeCurrent.toLocaleString()}
          </span>
          <span className="text-sm text-slate-500">
            / {safeTarget.toLocaleString()} {unit}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                isComplete ? 'bg-emerald-500' : colorConfig.progress
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Percentage & Status */}
          {showPercentage && (
            <div className="flex items-center justify-between text-xs">
              <span
                className={cn('font-bold', isComplete ? 'text-emerald-600' : isOnTrack ? colorConfig.text : 'text-slate-500')}
              >
                {percentage.toFixed(0)}% complete
              </span>
              <span className="text-slate-500">
                {safeTarget - safeCurrent > 0 ? `${(safeTarget - safeCurrent).toLocaleString()} to go` : 'Goal met!'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
