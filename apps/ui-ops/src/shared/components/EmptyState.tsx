import { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn.js';
import { Button } from './Button.js';

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
    <div className={cn('p-16 text-center flex flex-col items-center justify-center', className)}>
      <div className="p-4 rounded-full bg-[var(--color-muted)]/50 mb-4 border border-[var(--color-border)]">
        <Icon className="w-8 h-8 text-[var(--color-muted-foreground)] opacity-50" />
      </div>
      <h3 className="text-sm font-bold text-[var(--color-foreground)] uppercase tracking-tight">{title}</h3>
      {description && <p className="text-xs text-[var(--color-muted-foreground)] font-medium mt-1 max-w-xs mx-auto leading-relaxed">{description}</p>}
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="mt-6"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}