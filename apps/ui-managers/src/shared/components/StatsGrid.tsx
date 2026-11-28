import { cn } from '../utils/cn.js';
import { type ReactNode } from 'react';

interface StatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

const columnClasses = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-6', columnClasses[columns], className)}>
      {children}
    </div>
  );
}
