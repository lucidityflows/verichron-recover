import { type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
  iconColorClass?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, className, iconColorClass }: StatsCardProps) {
  return (
    <div
      className={cn(
        'p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-lg transition-all duration-300',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", iconColorClass)} />
        <p className="text-base font-medium text-foreground uppercase tracking-wide">
          {title}
        </p>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-[var(--color-foreground)]">
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              'text-sm flex items-center gap-1',
              trend.positive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
            )}
          >
            <span>{trend.positive ? '↗' : '↘'}</span>
            <span>{trend.value}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function SkeletonStatsCard() {
  return (
    <div className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-24 bg-[var(--color-border)] rounded"></div>
          <div className="h-8 w-32 bg-[var(--color-border)] rounded mt-2"></div>
          <div className="h-4 w-16 bg-[var(--color-border)] rounded mt-2"></div>
        </div>
        <div className="w-12 h-12 rounded-lg bg-[var(--color-border)]"></div>
      </div>
    </div>
  );
}
