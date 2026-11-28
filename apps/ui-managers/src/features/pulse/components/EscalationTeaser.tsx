import React from 'react';
import { ShieldAlert, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { type CriticalAlert } from '../../../shared/services/dashboardService.js';

interface EscalationTeaserProps {
  alerts?: CriticalAlert[];
  isLoading?: boolean;
}

/**
 * EscalationTeaser
 * Summary of the "Exception Inbox" requiring human decisions.
 */
export const EscalationTeaser: React.FC<EscalationTeaserProps> = ({ alerts = [], isLoading = false }) => {
  
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-md h-[300px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading escalations...</div>
      </div>
    );
  }

  // Take top 5 alerts
  const displayAlerts = alerts.slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden flex flex-col">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-error/10 p-2 rounded-lg">
            <ShieldAlert size={20} className="text-error" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Escalation Inbox</h3>
            <p className="text-xs font-medium text-muted-foreground">{alerts.length} decisions required</p>
          </div>
        </div>
        <button className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm">
          VIEW ALL <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="flex-1 divide-y divide-border overflow-y-auto max-h-[300px]">
        {displayAlerts.length === 0 ? (
           <div className="p-8 text-center text-muted-foreground text-sm">No pending escalations.</div>
        ) : (
          displayAlerts.map((item, index) => (
            <div key={`${item.id}-${index}`} className="p-4 hover:bg-muted transition-colors cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.severity === 'critical' ? 'bg-error/10 text-error' :
                      item.severity === 'warning' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
                    }`}>
                      {item.type.toUpperCase().replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold text-foreground">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock size={10} /> {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</span>
                    <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Action Required</span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-border opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-muted text-center border-t border-border">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic">Zero-Inbox Target: 100%</p>
      </div>
    </div>
  );
};
