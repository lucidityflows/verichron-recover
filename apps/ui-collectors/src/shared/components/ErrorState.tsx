import { AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface ErrorStateProps {
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function ErrorState({ title, message, action, className }: ErrorStateProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
      <div className="text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-[var(--color-error)] mx-auto" />
        <p className="text-[var(--color-error)] font-semibold">{title}</p>
        {message && <p className="text-muted-foreground text-sm">{message}</p>}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-lg hover:opacity-90 transition-opacity"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
