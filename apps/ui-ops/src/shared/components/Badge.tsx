import { type ReactNode } from 'react';
import { cn } from '../utils/cn.js';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  className?: string;
}

const variantStyles = {
  default: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]',
  success: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20',
  warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20',
  error: 'bg-[var(--color-error)]/10 text-[var(--color-error)] border-[var(--color-error)]/20',
  info: 'bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/20',
  secondary: 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border-[var(--color-secondary)]/20',
  outline: 'bg-transparent text-[var(--color-foreground)] border-[var(--color-border)]',
};

const sizeStyles = {
  sm: 'text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider',
  md: 'text-xs px-2.5 py-1 font-semibold',
  lg: 'text-sm px-3 py-1.5 font-semibold',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Legacy wrapper for StatusBadge compatibility
export function StatusBadge({ status, icon, variant, className }: any) {
  let v: any = 'default';
  const s = status?.toUpperCase();
  
  if (s === 'ACTIVE') v = 'success';
  if (s === 'PROVISIONING' || s === 'PENDING') v = 'warning';
  if (s === 'SUSPENDED' || s === 'FAILED') v = 'error';
  if (variant === 'outlined') v = 'outline';

  return (
    <Badge variant={v} icon={icon} className={className}>
      {status}
    </Badge>
  );
}
