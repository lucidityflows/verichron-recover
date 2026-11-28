import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
            {label}
            {props.required && <span className="text-[var(--color-error)] ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2 rounded-lg border text-sm',
            'bg-[var(--color-muted)]/20 text-[var(--color-foreground)]',
            'border-[var(--color-border)] focus:border-[var(--color-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10',
            'transition-all duration-200 shadow-inner',
            'placeholder:text-[var(--color-muted-foreground)]/50',
            error && 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/10',
            props.disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs font-bold text-[var(--color-error)] uppercase tracking-tight">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-[10px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-tight">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';