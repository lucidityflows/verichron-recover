import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

/**
 * HardRuleList
 * Displays system-enforced Federal and State laws.
 * These are READ-ONLY to ensure legal safety.
 */
export const HardRuleList: React.FC = () => {
  const hardRules = [
    { id: 'hr_1', name: 'Federal Calling Window', detail: '08:00 – 21:00 (Local Time)', source: 'FDCPA' },
    { id: 'hr_2', name: 'CFPB 7-in-7 Rule', detail: 'Max 7 calls per 7 consecutive days', source: 'Regulation F' },
    { id: 'hr_3', name: 'Wait Period After Conversation', detail: '7-day silence after successful contact', source: 'Regulation F' },
    { id: 'hr_4', name: 'State Restriction: Massachusetts', detail: 'Max 2 calls per 7 days (Landline)', source: '940 CMR 7.00' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-success/10 flex items-center justify-center">
            <ShieldCheck size={14} className="text-success" />
          </div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">System Enforced</h3>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1 bg-muted rounded-md">Read-Only</span>
      </div>

      <div className="divide-y divide-border">
        {hardRules.map((rule) => (
          <div key={rule.id} className="p-4 flex items-start justify-between hover:bg-muted/30 transition-colors">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{rule.name}</span>
                <div className="h-5 w-5 rounded flex items-center justify-center bg-warning/10">
                  <Lock size={11} className="text-warning" />
                </div>
              </div>
              <p className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded-md inline-block">{rule.detail}</p>
            </div>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md uppercase tracking-tight ring-1 ring-primary/20 ml-3">{rule.source}</span>
          </div>
        ))}
      </div>

      <div className="p-4 bg-warning/5 text-center border-t border-border">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Lock size={12} className="text-warning" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-warning">Protected by System</p>
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          These rules are maintained by Verichron Legal and cannot be modified by organization administrators.
        </p>
      </div>
    </div>
  );
};
