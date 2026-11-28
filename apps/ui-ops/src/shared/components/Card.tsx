import { ReactNode } from 'react';
import { cn } from '../utils/cn.js';

export type CardVariant = 'default' | 'ghost' | 'glass';

interface CardProps {
  title?: string;
  subtitle?: string;
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
  headerAction?: ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-[var(--color-card)] border-[var(--color-border)] shadow-sm',
  ghost: 'bg-transparent border-transparent shadow-none',
  glass: 'bg-[var(--color-card)]/70 backdrop-blur-md border-[var(--color-border)] shadow-sm',
};

export function Card({
  title,
  subtitle,
  variant = 'default',
  className,
  children,
  headerAction,
}: CardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border transition-all duration-200',
        variantClasses[variant],
        className
      )}
    >
      {(title || subtitle || headerAction) && (
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-base font-bold text-[var(--color-foreground)]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

// Re-export Enums as strings for legacy compatibility
export const CardVariant = {
  DEFAULT: 'default' as const,
  GRADIENT: 'default' as const, // Map gradient to default for now
  GLASS: 'glass' as const,
};