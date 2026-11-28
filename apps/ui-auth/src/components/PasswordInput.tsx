import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { cn } from '../utils/cn';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  showIcon?: boolean;
  showStrengthIndicator?: boolean;
}

export const PasswordInput = ({
  label,
  error,
  helperText,
  showIcon = true,
  className,
  ...props
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {showIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
        )}
        <input
          type={showPassword ? 'text' : 'password'}
          className={cn(
            'w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-background px-4 py-2.5 text-[var(--color-foreground)] transition-all duration-200',
            'placeholder:text-[var(--color-muted-foreground)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-primary)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[var(--color-error)] focus:ring-[var(--color-error)] focus:border-[var(--color-error)]',
            showIcon && 'pl-10',
            'pr-10',
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
