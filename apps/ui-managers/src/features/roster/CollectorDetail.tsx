import React from 'react';
import { 
  User, 
  ChevronRight, 
  LineChart, 
  Clock, 
  Target, 
  Zap,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Package
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { UtilizationGauge } from './components/UtilizationGauge.js';

/**
 * CollectorDetail
 * High-fidelity profile view for an individual collector.
 */
export const CollectorDetail: React.FC<{ collectorId: string, onBack: () => void }> = ({ collectorId, onBack }) => {
  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      {/* Navigation Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
        <button onClick={onBack} className="hover:text-indigo-600 transition-colors">The Roster</button>
        <ChevronRight size={12} />
        <span className="text-slate-900">Natasha Romanoff</span>
      </nav>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 ring-4 ring-white shadow-md relative">
            <User size={36} />
            <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Natasha Romanoff</h1>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ring-1 ring-emerald-600/20">Elite Tier</span>
            </div>
            <p className="text-sm font-medium text-slate-500">Member of Team Alpha • 4.2 years experience</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all">
            <MessageSquare size={16} />
            Send Feedback
          </button>
          <button className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95">
            Adjust Capacity
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Performance Profile */}
        <div className="lg:col-span-8 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Promises Kept</span>
              <div className="text-2xl font-bold font-mono text-emerald-600">94.2%</div>
              <p className="text-[10px] text-slate-500 font-medium">+4% vs team avg</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RPC Rate</span>
              <div className="text-2xl font-bold font-mono text-slate-900">42.5%</div>
              <p className="text-[10px] text-slate-500 font-medium">Top 5% in organization</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue/Hour</span>
              <div className="text-2xl font-bold font-mono text-slate-900">$850</div>
              <p className="text-[10px] text-slate-500 font-medium">Consistent daily performance</p>
            </div>
          </div>

          {/* Activity Timeline Teaser */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Recent Engagement Activity</h3>
              <button className="text-[10px] font-bold text-indigo-600 uppercase">View Workstation</button>
            </div>
            <div className="p-0">
              {[
                { time: '14:20', type: 'PAYMENT', detail: 'Processed $1,240 installment for AC-99210', icon: Zap, color: 'text-emerald-600' },
                { time: '13:45', type: 'CALL', detail: 'Right Party Contact - Promise to pay secured', icon: Target, color: 'text-indigo-600' },
                { time: '13:10', type: 'COMPLIANCE', detail: 'Cease & Desist Flag Verified', icon: ShieldCheck, color: 'text-slate-400' },
              ].map((log, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400 w-10 shrink-0">{log.time}</span>
                  <div className={cn("h-8 w-8 rounded bg-slate-50 flex items-center justify-center shrink-0", log.color.replace('text', 'bg').replace('600', '100'))}>
                    <log.icon size={16} className={log.color} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-900">{log.type}</p>
                    <p className="text-[11px] text-slate-500">{log.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Skills & Capacity */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tactical Profile</h3>
            
            <div className="space-y-4">
              <UtilizationGauge label="Current Account Load" current={88} />
              <p className="text-[10px] text-slate-400 font-bold uppercase italic">88 / 100 Accounts Assigned</p>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Skills</p>
              <div className="flex flex-wrap gap-2">
                {['Medical Debt', 'Spanish Speaker', 'High Closer', 'FDCPA Certified'].map(s => (
                  <span key={s} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold uppercase ring-1 ring-indigo-600/10">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authorized Portfolios</p>
              <div className="space-y-2">
                {['Chase Retail Q4', 'Bofa 2025-A'].map(p => (
                  <div key={p} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Package size={14} className="text-slate-300" />
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 p-6 text-white shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">Daily Velocity</h4>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">Collections</span>
              <span className="text-xs font-mono font-bold text-emerald-400">$12,450</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800">
              <div className="h-full bg-emerald-500" style={{ width: '92%' }} />
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-400 italic">
              Natasha is on track to exceed her daily target by <span className="text-white font-bold">$1,200</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
