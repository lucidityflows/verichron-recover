import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
            {label}
            {props.required && <span className="text-[var(--color-error)] ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full px-4 py-2 rounded-lg border text-sm appearance-none cursor-pointer',
              'bg-[var(--color-muted)]/20 text-[var(--color-foreground)]',
              'border-[var(--color-border)] focus:border-[var(--color-primary)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10',
              'transition-all duration-200 pr-10 shadow-inner',
              error && 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/10',
              props.disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-[var(--color-card)] text-[var(--color-foreground)]">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)] pointer-events-none" />
        </div>
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

Select.displayName = 'Select';