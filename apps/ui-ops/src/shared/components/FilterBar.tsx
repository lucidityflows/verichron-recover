import { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Select, SelectOption } from './Select.js';
import { cn } from '../utils/cn.js';

export interface FilterBarProps {
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onSearchClear?: () => void;
  filters?: Array<{
    label: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
  }>;
  actions?: ReactNode;
  className?: string;
}

export function FilterBar({
  searchValue = '',
  searchPlaceholder = 'Search...',
  onSearchChange,
  onSearchClear,
  filters = [],
  actions,
  className = '',
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between", className)}>
      {/* Search Input */}
      {onSearchChange && (
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)] group-focus-within:text-[var(--color-primary)] transition-colors" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "w-full pl-10 pr-10 py-2 rounded-lg border text-sm transition-all outline-none",
              "bg-[var(--color-muted)]/20 text-[var(--color-foreground)] border-[var(--color-border)]",
              "focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5",
              "placeholder:text-[var(--color-muted-foreground)]/50 placeholder:font-medium"
            )}
          />
          {searchValue && onSearchClear && (
            <button
              onClick={onSearchClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        {filters.map((filter) => (
          <div key={filter.label} className="min-w-[140px]">
            <Select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              options={filter.options}
              className="py-1.5"
            />
          </div>
        ))}
        {actions}
      </div>
    </div>
  );
}