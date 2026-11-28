import { type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn.js';

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
  // Legacy props for compatibility
  gradient?: string;
}

const gradientToColorMap: Record<string, string> = {
  primary: 'text-[var(--color-primary)]',
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  error: 'text-[var(--color-error)]',
  info: 'text-[var(--color-info)]',
};

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className, 
  iconColorClass,
  gradient 
}: StatsCardProps) {
  const finalIconColorClass = iconColorClass || (gradient ? gradientToColorMap[gradient] : 'text-[var(--color-primary)]');

  return (
    <div
      className={cn(
        'p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:shadow-md transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("p-2 rounded-lg bg-[var(--color-muted)]", finalIconColorClass.replace('text-', 'bg-').replace(')', '/10)'))}>
          <Icon className={cn("w-4 h-4", finalIconColorClass)} />
        </div>
        <p className="text-xs font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider">
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
              'text-xs flex items-center gap-1 font-semibold',
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
    <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--color-muted)]"></div>
        <div className="h-3 w-20 bg-[var(--color-muted)] rounded"></div>
      </div>
      <div className="h-8 w-32 bg-[var(--color-muted)] rounded mt-2"></div>
    </div>
  );
}