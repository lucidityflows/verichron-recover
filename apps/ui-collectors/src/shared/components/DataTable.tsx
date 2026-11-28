/* eslint-disable @typescript-eslint/no-base-to-string */
import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  title?: string;
  emptyState?: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  getRowKey: (item: T, index: number) => string;
  onRowClick?: (item: T) => void;
  className?: string;
  loadingMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  title,
  emptyState,
  getRowKey,
  onRowClick,
  className,
  loadingMessage = 'Loading data...',
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        'bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden',
        className
      )}
    >
      {title && (
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>
        </div>
      )}
      <div className="overflow-x-auto">
        {isLoading ? (
          <LoadingSpinner message={loadingMessage} />
        ) : data.length === 0 ? (
          emptyState ? (
            <EmptyState {...emptyState} />
          ) : (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )
        ) : (
          <table className="w-full">
            <thead className="bg-[var(--color-muted)] text-[var(--color-foreground)]">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider',
                      column.className
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {data.map((item, index) => (
                <tr
                  key={getRowKey(item, index)}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'hover:bg-[var(--color-surface-hover)] transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  style={{ animationDelay: `${(index + 5) * 100}ms` }}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn('px-6 py-4', column.className)}>
                      {column.render
                        ? column.render(item, index)
                        : String((item as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
