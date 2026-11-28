import { type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('p-12 text-center', className)}>
      <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-[var(--color-foreground)] font-semibold">{title}</p>
      {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-lg hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
