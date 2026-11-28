import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn.js';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  // Legacy props for compatibility during transition
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 shadow-sm',
  secondary: 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:opacity-90 shadow-sm',
  outline: 'border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-muted)] text-[var(--color-foreground)]',
  ghost: 'bg-transparent hover:bg-[var(--color-muted)] text-[var(--color-foreground)]',
  danger: 'bg-[var(--color-error)] text-white hover:opacity-90 shadow-sm',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-semibold',
  md: 'px-4 py-2 text-sm font-semibold',
  lg: 'px-6 py-3 text-base font-semibold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      isLoading = false,
      leftIcon,
      rightIcon,
      loading,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isActuallyLoading = isLoading || loading;
    
    return (
      <button
        ref={ref}
        disabled={disabled || isActuallyLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-200 active:scale-[0.98]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variantClasses[variant as ButtonVariant] || variantClasses.primary,
          sizeClasses[size as ButtonSize] || sizeClasses.md,
          className
        )}
        {...props}
      >
        {isActuallyLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <>
            {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
            {leftIcon}
            {children}
            {rightIcon}
            {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Re-export Enums as strings for legacy compatibility if needed
export const ButtonVariant = {
  PRIMARY: 'primary' as const,
  SECONDARY: 'secondary' as const,
  OUTLINE: 'outline' as const,
  GHOST: 'ghost' as const,
  DANGER: 'danger' as const,
};

export const ButtonSize = {
  SM: 'sm' as const,
  MD: 'md' as const,
  LG: 'lg' as const,
};