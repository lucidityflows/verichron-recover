import { type ReactNode } from 'react';
import { cn } from '../utils/cn';

export enum CardVariant {
  DEFAULT = 'default',
  GLASS = 'glass',
}

interface CardProps {
  className?: string;
  variant?: CardVariant;
  children: ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  [CardVariant.DEFAULT]: 'bg-[var(--color-card)] border-[var(--color-border)]',
  [CardVariant.GLASS]: 'bg-[var(--color-card)]/80 backdrop-blur-sm border-[var(--color-border)]/30',
};

export function Card({ className, variant = CardVariant.DEFAULT, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-xl)] border shadow-sm',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  );
}