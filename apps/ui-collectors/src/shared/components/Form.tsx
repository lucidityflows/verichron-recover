import React, { type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';

// Select component (existing)
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <Label htmlFor={props.id}>{label}</Label>}
        <select
          className={cn(
            'w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[var(--color-error)] focus:ring-[var(--color-error)]',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1 text-sm text-[var(--color-error)]">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

// Label component (existing)
const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className="block text-sm font-medium text-[var(--color-muted-foreground)] mb-1.5"
    {...props}
  />
);

// Input component (new)
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <Label htmlFor={props.id}>{label}</Label>}
        <input
          className={cn(
            'w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-foreground)] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[var(--color-error)] focus:ring-[var(--color-error)]',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-[var(--color-error)]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// Textarea component (new)
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, rows = 4, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <Label htmlFor={props.id}>{label}</Label>}
        <textarea
          className={cn(
            'w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-foreground)] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all resize-vertical',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[var(--color-error)] focus:ring-[var(--color-error)]',
            className
          )}
          rows={rows}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-[var(--color-error)]">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Select, Label, Input, Textarea };