import React, { useState } from 'react';
import {
  ShieldAlert,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  ChevronDown,
  Clock,
  User,
  Loader2
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useEscalations } from './hooks/useEscalations.js';
import { formatDistanceToNow } from 'date-fns';
import { NotificationResponseDtoType } from '../../api/generated/collectors_models/index.js';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '../../shared/services/usersService.js';
import { useUser } from '../../shared/store/userStore.js';

/**
 * EscalationInbox
 * The "Zero-Inbox" command center for exceptions.
 * Organized by category: Financial, Compliance, Technical.
 */
export const EscalationInbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'FINANCIAL' | 'COMPLIANCE' | 'TECHNICAL'>('ALL');
  const [search, setSearch] = useState('');

  // 1. Fetch Escalations (Manager Notifications)
  const { items, isLoading, error, markRead } = useEscalations({
    isRead: false
  });

  const getCategory = (type: NotificationResponseDtoType): string => {
    if (type === NotificationResponseDtoType.MANAGER_ESCALATION) return 'FINANCIAL';
    if (type === NotificationResponseDtoType.HIGH_PRIORITY_ITEM) return 'COMPLIANCE';
    if (type === NotificationResponseDtoType.DEBTOR_RESPONSE) return 'TECHNICAL'; // Placeholder mapping
    return 'GENERAL';
  };

  const filteredItems = items
    .filter(item => {
      const category = getCategory(item.type);
      if (activeTab !== 'ALL' && category !== activeTab) return false;
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

  const handleAction = async (id: string) => {
    try {
      await markRead({ id, data: { isRead: true } });
    } catch (err) {
      console.error('Failed to process escalation:', err);
      // Error is handled by React Query's onError callbacks
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Escalation Inbox</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter escalations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 w-64"
            />
          </div>
          <button className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Filter size={16} />
            Filters
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {['ALL', 'FINANCIAL', 'COMPLIANCE', 'TECHNICAL'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-muted-foreground border border-border hover:bg-muted"
            )}
          >
            {tab} {tab === 'ALL' ? `(${items.length})` : `(${items.filter(i => getCategory(i.type) === tab).length})`}
          </button>
        ))}
      </div>

      {/* High-Density Escalation List */}
      <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden min-h-[400px]">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="rounded-full bg-error/10 p-4">
              <ShieldAlert size={32} className="text-error" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-error">Failed to Load Escalations</p>
              <p className="text-[10px] text-muted-foreground">Unable to fetch escalations. Please try refreshing the page.</p>
            </div>
          </div>
        ) : isLoading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Syncing exceptions...</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground">Exception Detail</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground">Target Entity</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground">Assigned To</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground text-right">Rapid Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item) => {
                const category = getCategory(item.type);
                return (
                  <tr key={item.id} className="group hover:bg-muted transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-1 h-2 w-2 rounded-full",
                          item.type === NotificationResponseDtoType.MANAGER_ESCALATION ? "bg-error shadow-[0_0_8px_rgb(var(--error-rgb)/0.5)]" :
                          item.type === NotificationResponseDtoType.HIGH_PRIORITY_ITEM ? "bg-warning" : "bg-muted-foreground"
                        )} />
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-foreground">{item.title}</div>
                          <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
                            <span className="flex items-center gap-1 uppercase tracking-wider">
                              <Clock size={10} /> {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </span>
                            <span className="bg-muted px-1.5 py-0.5 rounded text-foreground font-bold">{category}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-foreground truncate max-w-[200px]">{item.message}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">LINK: {item.actionLink || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <User size={14} />
                        </div>
                        <span className="text-xs font-medium text-foreground">Pending Review</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleAction(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded border border-border bg-card text-success hover:bg-success/10 hover:border-success/20 transition-colors" 
                          title="Approve / Resolve"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleAction(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded border border-border bg-card text-error hover:bg-error/10 hover:border-error/20 transition-colors" 
                          title="Reject / Dismiss"
                        >
                          <XCircle size={16} />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center rounded border border-border bg-card text-primary hover:bg-primary/10 hover:border-primary/20 transition-colors" title="Counter / Delegate">
                          <ArrowRightLeft size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        
        {!isLoading && filteredItems.length === 0 && !error && (
          <div className="py-20 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="rounded-full bg-success/10 p-4">
                <CheckCircle2 size={32} className="text-success" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-success">Queue Clear</h3>
                <p className="text-[10px] text-muted-foreground">No pending escalations in this category.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
