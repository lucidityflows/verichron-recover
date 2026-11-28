import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Clock, User, FileText, Package, Users2, Command, X, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface SearchResult {
  id: string;
  type: 'debtor' | 'debt' | 'portfolio' | 'collector' | 'recent';
  title: string;
  subtitle: string;
  metadata?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECENT_SEARCHES_KEY = 'globalSearchRecent';
const MAX_RECENT_SEARCHES = 5;

/**
 * Omni-Search (Command+K)
 * High-density, multi-index search for the Command Center.
 * Follows the "Quiet Power" ERP aesthetic.
 */
export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Mock search results for initial build (to be replaced by actual API calls)
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['global-search', searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];
      
      // Simulate API latency
      await new Promise(r => setTimeout(r, 150));

      const mockResults: SearchResult[] = ([
        { id: 'p1', type: 'portfolio', title: 'Chase Retail Q4', subtitle: 'Strategic Inventory', metadata: '$12.5M' },
        { id: 'd1', type: 'debtor', title: 'Anthony Stark', subtitle: 'AC-99210', metadata: '$12,450' },
        { id: 'c1', type: 'collector', title: 'Natasha Romanoff', subtitle: 'Team Alpha', metadata: 'Elite' },
        { id: 'acc1', type: 'debt', title: 'Account AC-11204', subtitle: 'Bank of America', metadata: '$5,200' },
      ] as SearchResult[]).filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    r.subtitle.toLowerCase().includes(searchTerm.toLowerCase()));

      return mockResults;
    },
    enabled: isOpen && searchTerm.length >= 2,
  });

  const displayedResults = useMemo(() => {
    if (searchTerm.length < 2) return recentSearches;
    return searchResults || [];
  }, [searchTerm, searchResults, recentSearches]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearchTerm('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % displayedResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + displayedResults.length) % displayedResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (displayedResults[selectedIndex]) handleSelect(displayedResults[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, displayedResults]);

  const handleSelect = (result: SearchResult) => {
    // Save to recent
    if (result.type !== 'recent') {
      const newRecent = [
        { ...result, type: 'recent' as const },
        ...recentSearches.filter(r => r.id !== result.id)
      ].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(newRecent);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newRecent));
    }

    // Domain-driven navigation
    if (result.type === 'portfolio') navigate({ to: '/inventory/portfolios' });
    if (result.type === 'collector') navigate({ to: '/roster/coaching' });
    if (result.type === 'debtor' || result.type === 'debt') navigate({ to: '/inventory/ingestion' }); // Placeholder for now

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-card rounded-xl shadow-xl border border-border overflow-hidden animate-in slide-in-from-top-4 duration-300">
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search size={20} className="text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search portfolios, debtors, accounts..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-base font-medium"
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted border border-border text-[10px] font-bold text-muted-foreground">
            <Command size={10} />
            <span>K</span>
          </div>
        </div>

        {/* Results Area */}
        <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
          {displayedResults.length === 0 ? (
            <div className="py-12 text-center">
              <Search size={32} className="mx-auto text-border mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No results found for "{searchTerm}"</p>
            </div>
          ) : (
            <div className="space-y-1">
              {displayedResults.map((result, index) => (
                <SearchResultItem
                  key={`${result.type}-${result.id}`}
                  result={result}
                  isSelected={index === selectedIndex}
                  onClick={() => handleSelect(result)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted px-4 py-2 border-t border-border flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><ChevronDown size={12} /> Navigate</span>
            <span className="flex items-center gap-1"><span className="text-xs">↵</span> Select</span>
          </div>
          <span>{displayedResults.length} Results</span>
        </div>
      </div>
    </div>
  );
}

function SearchResultItem({ result, isSelected, onClick }: { result: SearchResult, isSelected: boolean, onClick: () => void }) {
  const Icon = {
    portfolio: Package,
    debtor: User,
    debt: FileText,
    collector: Users2,
    recent: Clock
  }[result.type];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
        isSelected ? "bg-primary/10 ring-1 ring-primary/20 shadow-sm" : "hover:bg-muted border-transparent"
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
        result.type === 'portfolio' ? "bg-warning/10 text-warning" :
        result.type === 'collector' ? "bg-success/10 text-success" :
        result.type === 'debtor' ? "bg-info/10 text-info" :
        "bg-muted text-muted-foreground"
      )}>
        <Icon size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground truncate">{result.title}</span>
          {result.metadata && (
            <span className="text-xs font-mono font-bold text-muted-foreground">{result.metadata}</span>
          )}
        </div>
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight truncate">{result.subtitle}</div>
      </div>
    </button>
  );
}