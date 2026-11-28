import React, { useState } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  ChevronRight,
  Clock,
  User,
  ArrowRight,
  ShieldCheck,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Users,
  DollarSign,
  Settings,
  ChevronDown,
  Loader2,
  Lock,
  Fingerprint
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useAuditLogs } from './hooks/useAuditLogs.js';
import { formatDistanceToNow, format } from 'date-fns';
import { type AuditLogResponseDto } from '../../api/generated/audits_models/index.js';

/**
 * AuditTrailViewer
 * High-value change log showing strategic decisions and their business impact.
 * Focused on manager-relevant actions rather than low-level system changes.
 */
export const AuditTrailViewer: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // 1. Fetch Audit Logs
  const { data: logList, isLoading } = useAuditLogs({ pageSize: 100 });

  const logs = (logList?.data || []).map((log: AuditLogResponseDto) => {
    // Basic mapping logic
    let category = 'OPERATIONS';
    const action = String(log.action || 'UNKNOWN');
    const title = action.replace(/_/g, ' ');
    let Icon = Settings;
    let iconColor = 'text-primary';
    let bgColor = 'bg-primary/10';

    if (action.includes('SETTLEMENT') || action.includes('LADDER') || action.includes('STRATEGY')) {
      category = 'STRATEGY';
      Icon = DollarSign;
      iconColor = 'text-emerald-600';
      bgColor = 'bg-emerald-50';
    }

    if (action.includes('COMPLIANCE') || action.includes('AUDIT') || action.includes('LEGAL')) {
      category = 'COMPLIANCE';
      Icon = ShieldCheck;
      iconColor = 'text-indigo-600';
      bgColor = 'bg-indigo-50';
    }

    if (action.includes('ACTIVATED') || action.includes('STATUS')) {
      category = 'LIFECYCLE';
      Icon = TrendingUp;
      iconColor = 'text-blue-600';
      bgColor = 'bg-blue-50';
    }

    // Attempt to extract meaningful summary
    const summary = `${log.action} performed on ${log.targetType}`;

    return {
      ...log,
      category,
      title,
      summary,
      Icon,
      iconColor,
      bgColor,
      user: log.actorSnapshot?.name || 'System',
      role: log.actorSnapshot?.role || 'Service',
    };
  });

  const filteredLogs = logs.filter(log => {
    if (activeFilter !== 'ALL' && log.category !== activeFilter) return false;
    
    const titleMatch = typeof log.title === 'string' && log.title.toLowerCase().includes(search.toLowerCase());
    const actionMatch = typeof log.action === 'string' && log.action.toLowerCase().includes(search.toLowerCase());
    
    if (search && !titleMatch && !actionMatch) return false;
    return true;
  });

  const stats = {
    total: logs.length,
    strategy: logs.filter(l => l.category === 'STRATEGY').length,
    compliance: logs.filter(l => l.category === 'COMPLIANCE').length,
    ops: logs.filter(l => l.category === 'OPERATIONS').length,
  };

  if (isLoading && !logList) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Syncing audit trail...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Evidence</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Audit Trail</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Immutable Change Log</h1>
          <p className="text-sm font-medium text-muted-foreground">Cryptographically signed system actions and policy decisions.</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Calendar size={16} />
            Last 30 Days
          </button>
          <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Export Certified Report
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-card border border-border p-5 shadow-md">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Total Evidence</div>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1">Immutable blocks</div>
        </div>
        <div className="rounded-xl bg-success/10 border border-success/20 p-5 shadow-md">
          <div className="text-[10px] font-bold text-success uppercase tracking-widest mb-2">Strategy</div>
          <div className="text-2xl font-bold text-success">{stats.strategy}</div>
          <div className="text-xs text-success mt-1">Policy decisions</div>
        </div>
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-5 shadow-md">
          <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Compliance</div>
          <div className="text-2xl font-bold text-indigo-600">{stats.compliance}</div>
          <div className="text-xs text-indigo-600 mt-1">Signed interactions</div>
        </div>
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-5 shadow-md">
          <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Operations</div>
          <div className="text-2xl font-bold text-primary">{stats.ops}</div>
          <div className="text-xs text-primary mt-1">Lifecycle events</div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search action, actor, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'STRATEGY', 'COMPLIANCE', 'OPERATIONS'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                activeFilter === f ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground border border-border hover:border-primary"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Change Log Cards */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-xl">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-sm font-bold text-foreground">Audit Trail Clear</h3>
            <p className="text-xs text-muted-foreground mt-1">No log entries matching your current filters.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const Icon = log.Icon;
            const isExpanded = expandedLog === log.id;

            return (
              <div key={log.id} className="rounded-xl border border-border bg-card shadow-md overflow-hidden transition-all hover:shadow-lg">
                {/* Header */}
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 relative", log.bgColor)}>
                      <Icon size={24} className={log.iconColor} />
                      {log.prevHash && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-border">
                          <Lock size={8} className="text-success fill-success" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-bold text-foreground uppercase tracking-tight">{log.title}</h3>
                            <div className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border",
                              log.prevHash ? "border-success/20 bg-success/5 text-success" : "border-blue-200 bg-blue-50 text-blue-600"
                            )}>
                              {log.prevHash ? 'Chained' : 'Genesis'}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{log.summary}</p>
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex-shrink-0",
                          log.category === 'COMPLIANCE' ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100" :
                          log.category === 'STRATEGY' ? "bg-success/10 text-success ring-1 ring-success/20" :
                          "bg-primary/10 text-primary ring-1 ring-primary/20"
                        )}>
                          {log.category}
                        </span>
                      </div>

                      {/* Impact Bar */}
                      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <User size={12} className="text-muted-foreground" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground leading-none">{String(log.user)}</span>
                            <span className="text-[9px] text-muted-foreground uppercase mt-0.5">{String(log.role)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock size={12} />
                          <span className="font-mono">{format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}</span>
                          <span className="text-[10px] opacity-60">({formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })})</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-foreground uppercase tracking-widest">{log.targetType}</div>
                            <div className="text-[9px] text-muted-foreground font-mono truncate max-w-[150px]">ID: {log.targetId.split('-')[0]}...</div>
                          </div>
                          <button
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            className="h-8 w-8 rounded-lg bg-muted hover:bg-muted/50 flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            <ChevronDown size={16} className={cn("text-foreground transition-transform", isExpanded && "rotate-180")} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/50 p-6 space-y-6">
                    {/* Rationale */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-tight">
                        <Fingerprint size={14} className="text-primary" />
                        Evidence Verification
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Field Mutations</p>
                          <div className="bg-card p-4 rounded border border-border">
                            {log.changes && Object.keys(log.changes).length > 0 ? (
                              <div className="space-y-2">
                                {Object.entries(log.changes).map(([key, delta]: [string, any]) => (
                                  <div key={key} className="flex items-center justify-between text-[10px]">
                                    <span className="font-bold text-muted-foreground uppercase">{key}:</span>
                                    <span className="font-mono">
                                      {String(delta.old)} <ArrowRight size={10} className="inline mx-1 opacity-40" /> {String(delta.new)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground italic">No state mutations recorded for this invariant action.</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Cryptographic Linkage</p>
                          <div className="bg-slate-900 p-4 rounded border border-white/5 text-indigo-300 font-mono text-[9px] space-y-2">
                            <div>
                              <p className="text-white/40 uppercase mb-1">Previous Hash</p>
                              <p className="break-all">{log.prevHash || '0000000000000000000000000000000000000000000000000000000000000000'}</p>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                              <p className="text-white/40 uppercase mb-1">Event Trace ID</p>
                              <p className="text-white">{log.eventId}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="p-4 bg-card rounded-lg border border-border">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Action Context</p>
                        <pre className="text-[10px] text-foreground font-mono">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
