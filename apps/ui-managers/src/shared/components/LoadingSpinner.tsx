import { cn } from '../utils/cn.js';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({ message = 'Loading...', className, size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className={cn('p-12 text-center', className)}>
      <div
        className={cn(
          'inline-block animate-spin rounded-full border-[var(--color-border)] border-t-[var(--color-primary)]',
          sizeClasses[size]
        )}
      />
      {message && <p className="mt-4 text-muted-foreground">{message}</p>}
    </div>
  );
}
