/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export enum ButtonSize {
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
}

export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  OUTLINE = 'outline',
  GHOST = 'ghost',
  DANGER = 'danger',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
  loading?: boolean;
  loadingText?: string;
  className?: string;
}

const sizeClasses: Record<ButtonSize, string> = {
  [ButtonSize.SM]: 'px-3 py-1.5 text-sm',
  [ButtonSize.MD]: 'px-4 py-2 text-base',
  [ButtonSize.LG]: 'px-6 py-3 text-lg',
};

const variantClasses: Record<ButtonVariant, string> = {
  [ButtonVariant.PRIMARY]: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90',
  [ButtonVariant.SECONDARY]: 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:opacity-90',
  [ButtonVariant.OUTLINE]: 'border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-muted)] text-[var(--color-foreground)]',
  [ButtonVariant.GHOST]: 'bg-transparent hover:bg-[var(--color-muted)] text-[var(--color-foreground)]',
  [ButtonVariant.DANGER]: 'bg-[var(--color-error)] text-white hover:opacity-90',
};

export function Button({
  children,
  size = ButtonSize.MD,
  variant = ButtonVariant.PRIMARY,
  loading = false,
  loadingText,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius)] font-medium transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </button>
  );
}