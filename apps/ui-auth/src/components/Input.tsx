import { type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  icon,
  error,
  helperText,
  className,
  ...props
}: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          {label}
          {props.required && <span className="text-[var(--color-error)] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">
            {icon}
          </div>
        )}
        <input
          className={cn(
            'w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-background px-4 py-2.5 text-[var(--color-foreground)] transition-all duration-200',
            'placeholder:text-[var(--color-muted-foreground)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[var(--color-error)] focus:ring-[var(--color-error)] focus:border-[var(--color-error)]',
            icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-[var(--color-error)]">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-[var(--color-muted-foreground)]">{helperText}</p>
      )}
    </div>
  );
}