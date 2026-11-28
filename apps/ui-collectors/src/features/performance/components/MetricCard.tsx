import React from 'react';
import { Phone, DollarSign, FileText, Target, CheckCircle2, Clock, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface MetricCardProps {
  type: 'CALLS' | 'COLLECTED' | 'PTPS' | 'CONTACTS' | 'CUSTOM';
  label: string;
  value: number;
  target?: number;
  unit?: string;
  icon?: LucideIcon;
  variant?: 'indigo' | 'emerald' | 'amber' | 'blue' | 'purple' | 'rose';
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * MetricCard
 * High-quality, gamified card for displaying KPIs and Goals
 *
 * Design Philosophy: "Polished & Gamified"
 * - Rich gradients for visual appeal
 * - Glassmorphism effects
 * - Clear progress tracking
 * - Consistent with CommissionTicker/StreakCounter aesthetics
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  type,
  label,
  value,
  target,
  unit = '',
  icon,
  variant = 'indigo',
  className,
}) => {
  const safeValue = value ?? 0;
  const safeTarget = target ?? 0;
  
  const hasTarget = safeTarget > 0;
  const percentage = hasTarget ? Math.min((safeValue / safeTarget) * 100, 100) : 0;
  const isComplete = hasTarget && percentage >= 100;

  // Default icons by type
  const defaultIcons = {
    CALLS: Phone,
    COLLECTED: DollarSign,
    PTPS: FileText,
    CONTACTS: Target,
    CUSTOM: Clock,
  };

  const Icon = icon || defaultIcons[type];

  // Visual Themes (Gradients)
  const themes = {
    indigo: {
      bg: 'bg-gradient-to-br from-indigo-500 to-violet-600',
      iconBg: 'bg-white/20',
      progressTrack: 'bg-black/20',
      progressFill: 'bg-white',
      text: 'text-white',
      subtext: 'text-indigo-100',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      iconBg: 'bg-white/20',
      progressTrack: 'bg-black/20',
      progressFill: 'bg-white',
      text: 'text-white',
      subtext: 'text-emerald-100',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-400 to-orange-500',
      iconBg: 'bg-white/20',
      progressTrack: 'bg-black/20',
      progressFill: 'bg-white',
      text: 'text-white',
      subtext: 'text-amber-100',
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      iconBg: 'bg-white/20',
      progressTrack: 'bg-black/20',
      progressFill: 'bg-white',
      text: 'text-white',
      subtext: 'text-blue-100',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-500 to-fuchsia-600',
      iconBg: 'bg-white/20',
      progressTrack: 'bg-black/20',
      progressFill: 'bg-white',
      text: 'text-white',
      subtext: 'text-purple-100',
    },
    rose: {
      bg: 'bg-gradient-to-br from-rose-500 to-pink-600',
      iconBg: 'bg-white/20',
      progressTrack: 'bg-black/20',
      progressFill: 'bg-white',
      text: 'text-white',
      subtext: 'text-rose-100',
    },
  }[variant];

  return (
    <div
      className={cn(
        'rounded-xl p-5 shadow-lg relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl',
        themes.bg,
        themes.text,
        className
      )}
    >
      {/* Background Icon (Watermark) */}
      <div className="absolute -right-4 -bottom-4 opacity-10">
        <Icon size={100} />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center backdrop-blur-sm', themes.iconBg)}>
              <Icon size={20} className="text-white" />
            </div>
            <div>
              <div className={cn('text-xs font-bold uppercase tracking-widest opacity-90', themes.subtext)}>
                {label}
              </div>
              <div className={cn('text-[10px] uppercase tracking-wide opacity-75', themes.subtext)}>
                {type.replace('_', ' ')}
              </div>
            </div>
          </div>
          
          {isComplete && (
            <div className="bg-white/20 backdrop-blur-md rounded-full px-2 py-1">
              <CheckCircle2 size={14} className="text-white" />
            </div>
          )}
        </div>

        {/* Value */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold tracking-tight">
              {safeValue.toLocaleString()}
            </span>
            {hasTarget && (
              <span className={cn('text-sm font-medium opacity-75', themes.subtext)}>
                / {safeTarget.toLocaleString()} {unit}
              </span>
            )}
            {!hasTarget && unit && (
              <span className={cn('text-sm font-medium opacity-75', themes.subtext)}>
                {unit}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar (if target exists) */}
        {hasTarget && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium opacity-90">
              <span>Progress</span>
              <span>{percentage.toFixed(0)}%</span>
            </div>
            <div className={cn('h-2 rounded-full overflow-hidden', themes.progressTrack)}>
              <div
                className={cn('h-full rounded-full transition-all duration-1000 ease-out', themes.progressFill)}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
