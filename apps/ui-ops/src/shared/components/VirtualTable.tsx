import { useRef, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn.js';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  width?: number | string; // Optional width for virtual columns
}

interface VirtualTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  title?: string;
  height?: number | string; // Virtual tables need explicit height usually
  rowHeight?: number;
  emptyState?: {
    icon?: LucideIcon;
    title: string;
    description?: string;
  };
  getRowKey: (item: T, index: number) => string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function VirtualTable<T>({
  columns,
  data,
  isLoading = false,
  title,
  height = '600px',
  rowHeight = 52,
  emptyState,
  getRowKey,
  onRowClick,
  className,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  return (
    <div
      className={cn(
        'bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden flex flex-col',
        className
      )}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {title && (
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <h2 className="text-sm font-bold text-[var(--color-foreground)] uppercase tracking-tight">{title}</h2>
        </div>
      )}

      {/* Header - Sticky */}
      <div className="flex-shrink-0 bg-[var(--color-muted)]/30 text-[var(--color-foreground)] border-b border-[var(--color-border)]">
        <div className="flex px-6 py-2.5">
          {columns.map((column) => (
            <div
              key={column.key}
              className={cn(
                'text-left text-[10px] font-black uppercase tracking-widest flex-1 text-[var(--color-muted-foreground)]',
                column.className
              )}
              style={column.width ? { flex: `0 0 ${column.width}px` } : {}}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Body - Virtualized */}
      <div
        ref={parentRef}
        className="overflow-y-auto flex-1 custom-scrollbar"
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--color-border)] border-t-indigo-600"></div>
              <p className="text-[var(--color-muted-foreground)] text-[10px] font-black uppercase tracking-widest">Synchronizing Registry...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center p-16 text-center">
            <div className="space-y-4">
              {emptyState?.icon && (
                <div className="p-4 rounded-full bg-[var(--color-muted)] w-fit mx-auto">
                  <emptyState.icon className="w-8 h-8 text-[var(--color-muted-foreground)]/50" />
                </div>
              )}
              <div>
                <p className="font-bold text-[var(--color-foreground)] text-sm uppercase tracking-tight">
                  {emptyState?.title || 'No data available'}
                </p>
                {emptyState?.description && (
                  <p className="text-[11px] text-[var(--color-muted-foreground)] font-medium mt-1 max-w-xs mx-auto leading-relaxed">{emptyState.description}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = data[virtualRow.index];
              return (
                <div
                  key={getRowKey(item, virtualRow.index)}
                  className={cn(
                    'absolute top-0 left-0 w-full flex items-center px-6 border-b border-[var(--color-border)]/50 hover:bg-[var(--color-muted)]/20 transition-colors group',
                    onRowClick && 'cursor-pointer'
                  )}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className={cn('flex-1 truncate text-sm text-[var(--color-foreground)] font-medium', column.className)}
                      style={column.width ? { flex: `0 0 ${column.width}px` } : {}}
                    >
                      {column.render
                        ? column.render(item, virtualRow.index)
                        : <span className="text-[var(--color-foreground)]">{String((item as Record<string, unknown>)[column.key] ?? '')}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}