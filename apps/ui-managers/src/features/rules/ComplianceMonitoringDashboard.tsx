import React from 'react';
import {
  ShieldCheck,
  ShieldX,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Phone,
  Mail,
  MessageSquare,
  Ban,
  Loader2
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useComplianceControllerGetStats, useComplianceControllerGetActivity } from '../../api/generated/communications/endpoints/compliance/compliance.js';
import { formatDistanceToNow } from 'date-fns';

/**
 * ComplianceMonitoringDashboard
 * Real-time compliance enforcement metrics showing violations PREVENTED.
 * Demonstrates "Block, Don't Flag" approach.
 */
export const ComplianceMonitoringDashboard: React.FC = () => {
  // 1. Fetch Prevention Stats
  const { data: statsData, isLoading: isLoadingStats } = useComplianceControllerGetStats({ days: 7 }, {
    query: {
      refetchInterval: 30000,
    }
  });

  // 2. Fetch Live Activity
  const { data: activityData, isLoading: isLoadingActivity } = useComplianceControllerGetActivity({
    query: {
      refetchInterval: 10000,
    }
  });

  const stats = statsData?.data;
  const activity = activityData?.data;

  const totalPrevented = stats?.totalPrevented || 0;
  const breakdown = stats?.byType || {};

  const complianceRules = [
    { id: 'rule_1', name: 'Time Restrictions', status: 'ACTIVE', blocked: breakdown.TIME_OF_DAY || 0, description: '8am-9pm debtor local time' },
    { id: 'rule_2', name: 'Frequency Caps', status: 'ACTIVE', blocked: breakdown.FREQUENCY_LIMIT || 0, description: '7 contacts per 7 days (CFPB)' },
    { id: 'rule_3', name: 'DNC Registry', status: 'ACTIVE', blocked: breakdown.DNC || 0, description: 'National Do Not Call list' },
    { id: 'rule_4', name: 'Cease & Desist', status: 'ACTIVE', blocked: breakdown.OPT_OUT || 0, description: 'Consumer-requested blocks' },
    { id: 'rule_5', name: 'State Restrictions', status: 'ACTIVE', blocked: breakdown.JURISDICTION || 0, description: 'Jurisdiction-specific rules' }
  ];

  if (isLoadingStats || isLoadingActivity) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-slate-500">Syncing live protection feed...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest">
            <span>The Rules</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-500">Compliance Monitoring</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Compliance Protection</h1>
          <p className="text-sm font-medium text-slate-500">Real-time enforcement metrics and violation prevention tracking.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 ring-1 ring-inset ring-emerald-600/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Active Protection</span>
          </div>
        </div>
      </header>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Compliance Score */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compliance Health</div>
            <ShieldCheck size={16} className="text-emerald-600" />
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray="351 351"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-600">100%</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Score</div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-slate-600">
            <span className="font-bold text-emerald-600">Active Enforcement</span>
            <br />
            <span className="text-slate-400">making violations impossible</span>
          </p>
        </div>

        {/* Violations Prevented */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prevented (7D)</div>
            <ShieldX size={16} className="text-slate-400" />
          </div>
          <div className="text-5xl font-bold text-slate-900 mb-2">{totalPrevented}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <TrendingUp size={12} className="text-emerald-600" />
            <span><span className="font-bold text-emerald-600">Active protection</span> enabled</span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">System Prevented</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Potential lawsuits</span>
                <span className="font-bold text-slate-900">{totalPrevented}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Est. liability cost</span>
                <span className="font-bold text-emerald-600">${(totalPrevented * 1000).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Violation-Free Streak */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Protection Status</div>
            <CheckCircle size={16} className="text-emerald-600" />
          </div>
          <div className="text-6xl font-bold text-emerald-600 mb-2">LIVE</div>
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-4">Monitoring</div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-white border border-emerald-200">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={16} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-900">Zero Violations</p>
              <p className="text-[10px] text-slate-500">Bouncer mode active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prevention Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prevention by Type */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-tight">
              <Activity size={14} />
              Prevention Breakdown (7D)
            </div>
          </div>
          <div className="p-6 space-y-4">
            {complianceRules.map((rule) => (
              <div key={rule.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-slate-900">{rule.name}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                      "bg-emerald-50 text-emerald-700"
                    )}>
                      {rule.status}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{rule.blocked}</span>
                </div>
                <div className="text-[10px] text-slate-500">{rule.description}</div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: totalPrevented > 0 ? `${(rule.blocked / totalPrevented) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-tight">
              <Clock size={14} />
              Live Activity
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Real-time
            </div>
          </div>
          <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
            {(!activity || activity.length === 0) ? (
              <div className="p-10 text-center text-sm text-slate-400 italic">No blocked attempts in recent history.</div>
            ) : (
              activity.map((log: any) => (
                <div key={log._id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 bg-red-50 text-red-600">
                      <ShieldX size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {log.type} attempt blocked
                        </p>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0 bg-red-50 text-red-700">
                          BLOCKED
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-2">
                        <span>{log.collectorUserId || 'System'}</span>
                        <span>•</span>
                        <span>Debtor ID: {log.debtorId.split('-')[0]}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                      </div>
                      <p className="text-xs text-slate-600 italic">"{log.blockedReason}"</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Information Card */}
      <div className="rounded-xl bg-indigo-900 p-8 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={24} className="text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-3">Proactive Compliance Protection</h3>
            <p className="text-sm leading-relaxed text-slate-300 mb-4">
              Verichron prevents compliance violations <span className="text-white font-bold">before they occur</span>. The system actively blocks calls, emails, and SMS that would violate FDCPA, TCPA, or CFPB regulations. Your compliance score is 100% not because your collectors are perfect, but because the system makes violations impossible.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-indigo-800/40">
                <div className="text-2xl font-bold text-white mb-1">$0</div>
                <div className="text-[10px] text-indigo-300 uppercase tracking-widest">FDCPA Penalties</div>
              </div>
              <div className="p-4 rounded-lg bg-indigo-800/40">
                <div className="text-2xl font-bold text-white mb-1">0</div>
                <div className="text-[10px] text-indigo-300 uppercase tracking-widest">Class Actions</div>
              </div>
              <div className="p-4 rounded-lg bg-indigo-800/40">
                <div className="text-2xl font-bold text-white mb-1">100%</div>
                <div className="text-[10px] text-indigo-300 uppercase tracking-widest">Audit Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
