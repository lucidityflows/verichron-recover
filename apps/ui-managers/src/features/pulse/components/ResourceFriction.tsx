import React from 'react';
import { Users2, ShieldAlert, Thermometer, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { type TeamStatusCollector } from '../../../shared/services/dashboardService.js';

interface ResourceFrictionProps {
  collectors: TeamStatusCollector[];
  totalContacts: number;
  isLoading?: boolean;
}

/**
 * ResourceFriction
 * Replaces StaffHeatmap.
 * Insights on bandwidth vs. opportunity.
 */
export const ResourceFriction: React.FC<ResourceFrictionProps> = ({ collectors, totalContacts, isLoading }) => {
  const onlineCount = collectors.filter(c => c.status === 'online').length;
  const offlineCount = collectors.filter(c => c.status === 'offline').length;
  const totalCollectors = collectors.length;

  // Calculate capacity utilization
  // Logic: Compare actual contacts to expected baseline (15 contacts per online collector per day)
  const baselineContactsPerCollector = 15; // Configurable per org in future
  const expectedContacts = onlineCount * baselineContactsPerCollector;

  // Utilization % = (actual / expected) * 100
  // Values below 60% indicate underutilization (high friction)
  // Values above 100% indicate overutilization (collectors overwhelmed)
  const utilizationPercent = expectedContacts > 0 ? Math.round((totalContacts / expectedContacts) * 100) : 0;

  // Friction score: distance from optimal (80-100%)
  // Low contacts = high friction (underutilization)
  // Too many contacts = also friction (overwhelmed)
  let frictionScore = 0;
  if (onlineCount === 0) {
    frictionScore = 100; // All offline = maximum friction
  } else if (utilizationPercent < 60) {
    frictionScore = 100 - utilizationPercent; // Low activity = friction
  } else if (utilizationPercent > 120) {
    frictionScore = Math.min(utilizationPercent - 100, 100); // Overwhelmed = friction
  } else {
    frictionScore = 0; // Optimal range (60-120%)
  }

  const getFrictionColor = (score: number) => {
    if (score > 50) return 'text-error';
    if (score > 25) return 'text-warning';
    return 'text-success';
  };

  return (
      <div className="bg-card rounded-xl border border-border shadow-md flex flex-col h-[420px]">
        <div className="p-4 border-b border-border flex items-center gap-2 shrink-0">
          <Thermometer size={16} className="text-primary" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Capacity Utilization</h3>
        </div>

        <div className="flex-1 p-6 flex flex-col">
        <div className="flex-1 flex flex-col justify-center space-y-4">
          <div className="text-center space-y-1">
            <div className={cn("text-5xl font-black font-mono tracking-tighter", getFrictionColor(frictionScore))}>
              {utilizationPercent}%
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {frictionScore === 0 ? 'Optimal' : frictionScore > 50 ? 'Critical' : 'Warning'}
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex justify-between items-end">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Active Resources</p>
                <p className="text-xs font-bold text-foreground">{onlineCount} Online / {totalCollectors} Total</p>
              </div>
              <Users2 size={14} className="text-muted-foreground mb-1" />
            </div>

            <div className="flex justify-between items-end">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Contact Volume</p>
                <p className="text-xs font-bold text-foreground">
                  {totalContacts} / {expectedContacts} Expected
                </p>
              </div>
              <BrainCircuit size={14} className={cn(frictionScore > 50 ? "text-error" : frictionScore > 25 ? "text-warning" : "text-success", "mb-1")} />
            </div>
          </div>
        </div>

        {frictionScore > 50 ? (
          <div className="rounded-lg bg-error/10 p-3 border border-error/20 flex gap-3 items-center animate-pulse shrink-0">
            <ShieldAlert size={16} className="text-error flex-shrink-0" />
            <p className="text-[10px] font-bold text-error leading-tight uppercase tracking-tight">
              {utilizationPercent < 60 ? 'Alert: Capacity underutilized.' : 'Alert: Collectors overwhelmed.'}
            </p>
          </div>
        ) : frictionScore > 25 ? (
          <div className="rounded-lg bg-warning/10 p-3 border border-warning/20 flex gap-3 items-center shrink-0">
            <ShieldAlert size={16} className="text-warning flex-shrink-0" />
            <p className="text-[10px] font-bold text-warning leading-tight uppercase tracking-tight">
              {utilizationPercent < 80 ? 'Warning: Below target utilization.' : 'Warning: Approaching capacity limit.'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-success/5 p-3 border border-success/10 flex gap-3 items-center shrink-0">
            <CheckCircle2 size={16} className="text-success flex-shrink-0" />
            <p className="text-[9px] font-bold text-success leading-tight uppercase tracking-tight">
              Status: Nominal. Capacity utilization optimal.
            </p>
          </div>
        )}
        </div>
      </div>
  );
};
