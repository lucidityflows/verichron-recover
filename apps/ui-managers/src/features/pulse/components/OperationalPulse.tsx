import React from 'react';
import { Activity, Zap, CreditCard, UserPlus, Milestone, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/shared/utils/cn';
import { type RecentActivity } from '../../../shared/services/dashboardService.js';

interface OperationalPulseProps {
  activities: RecentActivity[];
  isLoading?: boolean;
}

/**
 * OperationalPulse
 * Terminal-style high-density activity feed.
 * Shows what the "Machine" is doing right now.
 */
export const OperationalPulse: React.FC<OperationalPulseProps> = ({ activities, isLoading }) => {
  
  const getIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'collection': return <CreditCard size={14} className="text-success" />;
      case 'contact': return <Activity size={14} className="text-primary" />;
      case 'goal_completed': return <Milestone size={14} className="text-amber-500" />;
      case 'alert': return <Zap size={14} className="text-error" />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden flex flex-col h-[420px]">
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Operational Pulse</h3>
        </div>
        <div className="flex gap-1 items-center">
          <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-bold text-success uppercase">
            {activities.length === 0 ? 'System Standby' : 'Live Feed'}
          </span>
        </div>
      </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/50">
          {activities.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                <Zap size={28} className="text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-primary uppercase tracking-wider">System Standby</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[280px]">
                  The operational pulse is active and listening. Activity will populate here once collectors begin outreach or payments are processed.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase">Portfolios: Ready</div>
                <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase">Gateways: Linked</div>
              </div>
            </div>
          ) : (
            activities.map((item, index) => (
              <div key={`${item.id}-${index}`} className="p-4 hover:bg-muted/50 transition-colors group">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-7 w-7 rounded-lg bg-background border border-border flex items-center justify-center shadow-sm flex-shrink-0 group-hover:border-primary/30 transition-colors">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-foreground leading-tight truncate">
                        {item.description}
                      </p>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground whitespace-nowrap uppercase">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary">
                          {item.collectorName?.[0] || 'S'}
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                          {item.collectorName || 'System'}
                        </span>
                      </div>
                      {item.amount && (
                        <div className="text-[10px] font-black text-success bg-success/10 px-1.5 py-0.5 rounded leading-none">
                          +${item.amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
    </div>
  );
};
