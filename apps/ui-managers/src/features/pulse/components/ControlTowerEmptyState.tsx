import React from 'react';
import { 
  Database, 
  UploadCloud, 
  ArrowRight, 
  Activity,
  BarChart3,
  Users
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface ControlTowerEmptyStateProps {
  onImportClick: () => void;
  onInviteClick?: () => void;
}

export const ControlTowerEmptyState: React.FC<ControlTowerEmptyStateProps> = ({ 
  onImportClick,
  onInviteClick 
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-card/50 p-8 md:p-12">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        {/* Icon Header */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
          <Activity size={40} className="text-primary" />
        </div>

        {/* Text Content */}
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Initialize Command Center
        </h2>
        <p className="mb-8 text-muted-foreground md:text-lg">
          The Control Tower uses real-time signals from your portfolios to generate 
          predictive insights. Import your first dataset to activate the dashboard.
        </p>

        {/* Feature Grid (Value Prop) */}
        <div className="mb-10 grid gap-4 text-left sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
            <BarChart3 className="mb-3 h-6 w-6 text-violet-500" />
            <h3 className="mb-1 text-sm font-bold text-foreground">Liquidation Analytics</h3>
            <p className="text-xs text-muted-foreground">Track recovery performance against daily targets in real-time.</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
            <Users className="mb-3 h-6 w-6 text-blue-500" />
            <h3 className="mb-1 text-sm font-bold text-foreground">Team Pulse</h3>
            <p className="text-xs text-muted-foreground">Monitor collector activity, goal progress, and resource friction.</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
            <Activity className="mb-3 h-6 w-6 text-emerald-500" />
            <h3 className="mb-1 text-sm font-bold text-foreground">Escalation Radar</h3>
            <p className="text-xs text-muted-foreground">Detect and resolve compliance risks and operational bottlenecks.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={onImportClick}
            className="group flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 active:scale-95"
          >
            <UploadCloud size={18} />
            Import Portfolio
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
          
          {onInviteClick && (
            <button
              onClick={onInviteClick}
              className="flex items-center justify-center gap-2 rounded-md border border-border bg-card px-8 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted active:bg-muted/80"
            >
              <Users size={18} />
              Invite Team
            </button>
          )}
        </div>
        
        <p className="mt-6 text-[10px] uppercase tracking-widest text-muted-foreground">
          System Status: <span className="text-amber-500 font-bold">Awaiting Data</span>
        </p>
      </div>
    </div>
  );
};
