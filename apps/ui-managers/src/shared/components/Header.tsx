import { Search } from 'lucide-react';
import { UserMenu } from './UserMenu.js';
import { useGlobalSearch } from '../hooks/index.js';
import { cn } from '../utils/cn.js';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { openSearch } = useGlobalSearch();

  return (
    <header
      className={cn(
        'hidden h-16 border-b border-border bg-card shadow-sm md:flex items-center justify-between px-8',
        className
      )}
    >
      {/* Omni-Search Trigger (Cmd+K) */}
      <div className="flex-1 max-w-xl">
        <button
          onClick={openSearch}
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:bg-card hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <Search size={18} className="text-muted-foreground" />
          <span className="flex-1 text-left truncate">Search anything (Portfolios, Debtors, Accounts)...</span>
          <kbd className="hidden rounded bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium border border-border text-muted-foreground sm:block shadow-sm">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Action Tray */}
      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  );
}
