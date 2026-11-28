import React from 'react';
import { Send, CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

import { useComplianceControllerGetInvitationMetrics } from '../../../api/generated/communications/endpoints/compliance/compliance.js';

interface InvitationWaveProps {
  batchId: string;
  portfolioName: string;
  total: number;
  onDismiss: () => void;
}

/**
 * InvitationWave
 * Real-time progress visualization for bulk debtor invitations.
 * Leverages the "Neural Bridge" UI standard.
 */
export const InvitationWave: React.FC<InvitationWaveProps> = ({
  batchId,
  portfolioName,
  total,
  onDismiss
}) => {
  // 1. Fetch Real-time Metrics
  const { data: metricsData, isLoading } = useComplianceControllerGetInvitationMetrics(batchId, {
    query: {
      refetchInterval: 3000, // Poll every 3 seconds during wave
      enabled: !!batchId,
    }
  });

  const metrics = (metricsData as any)?.data || { 
    totalSent: 0, 
    delivered: 0, 
    bounced: 0, 
    opened: 0, 
    clicked: 0 
  };

  const completed = metrics.totalSent;
  const errors = metrics.bounced;
  const progressPercent = Math.min(100, Math.round((completed / total) * 100));
  const isFinished = completed >= total;

  return (
    <div className="rounded-xl border border-indigo-100 bg-white shadow-lg overflow-hidden animate-in slide-in-from-top-4 duration-500">
      <div className="bg-indigo-900 px-6 py-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300">
            <Zap size={24} className={cn(!isFinished && "animate-pulse")} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-300">Invitation Wave Active</h3>
            <p className="text-lg font-bold text-white leading-tight">{portfolioName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Status</p>
            <p className="text-xs font-mono font-bold text-white">{isFinished ? 'COMPLETED' : 'DISPATCHING'}</p>
          </div>
          {isFinished && (
            <button 
              onClick={onDismiss}
              className="ml-4 p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <CheckCircle2 size={20} className="text-emerald-400" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">{completed.toLocaleString()}</span>
              <span className="text-sm font-bold text-slate-400">/ {total.toLocaleString()} Emailed</span>
            </div>
            <span className="text-xs font-black font-mono text-indigo-600">{progressPercent}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Tactical Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-slate-50 pt-6">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivered</p>
              <p className="text-sm font-bold text-slate-900 font-mono">{metrics.delivered}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-red-500" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bounced</p>
              <p className="text-sm font-bold text-slate-900 font-mono">{metrics.bounced}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opened</p>
              <p className="text-sm font-bold text-slate-900 font-mono">{metrics.opened}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clicked</p>
              <p className="text-sm font-bold text-slate-900 font-mono">{metrics.clicked}</p>
            </div>
          </div>
        </div>
      </div>

      {!isFinished && (
        <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Syncing with SMTP Gateways via Pub/Sub Event Mesh...</span>
        </div>
      )}
    </div>
  );
};
