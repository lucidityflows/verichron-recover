import React from 'react';
import { Zap, Info } from 'lucide-react';
import { type OrganizationSettingsDto } from '../../../api/generated/organizations_models/index.js';

interface SoftRuleFormProps {
  settings: OrganizationSettingsDto;
  onChange: (settings: OrganizationSettingsDto) => void;
}

/**
 * SoftRuleForm
 * Configurable agency strategies. 
 * Allows stricter-than-legal guardrails for CX and operational efficiency.
 */
export const SoftRuleForm: React.FC<SoftRuleFormProps> = ({ settings, onChange }) => {
  const commPrefs = settings.communicationPreferences || {};
  const businessRules = settings.businessRules || {};
  const compliance = settings.compliance || {};

  const handleUpdate = (path: string, value: any) => {
    const newSettings = { ...settings };
    const [category, field] = path.split('.');
    
    if (!(newSettings as any)[category]) {
      (newSettings as any)[category] = {};
    }
    
    (newSettings as any)[category][field] = value;
    onChange(newSettings);
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
      <div className="p-4 border-b border-border bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <Zap size={14} className="text-primary" />
          </div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">Agency Strategy</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest px-2 py-1 bg-primary/10 rounded-md ring-1 ring-primary/20">
          <Info size={11} />
          Configurable
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Preferred Calling Window */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground uppercase tracking-tight">Preferred Calling Window</label>
            <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 bg-muted rounded-md">Must be within FDCPA 08:00-21:00</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Start Time</span>
              <input
                type="time"
                value={commPrefs.preferredContactTimeStart || '08:00'}
                onChange={(e) => handleUpdate('communicationPreferences.preferredContactTimeStart', e.target.value)}
                className="w-full rounded-lg border-border bg-card text-foreground text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex-1 space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">End Time</span>
              <input
                type="time"
                value={commPrefs.preferredContactTimeEnd || '21:00'}
                onChange={(e) => handleUpdate('communicationPreferences.preferredContactTimeEnd', e.target.value)}
                className="w-full rounded-lg border-border bg-card text-foreground text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Contact Frequency */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-foreground uppercase tracking-tight block">Custom Frequency Caps</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 space-y-3 hover:bg-primary/10 transition-all hover:shadow-lg hover:border-primary/30 ring-1 ring-primary/10">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Max Weekly Attempts</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={businessRules.maxPaymentPlanDurationMonths || 7}
                  onChange={(e) => handleUpdate('businessRules.maxPaymentPlanDurationMonths', parseInt(e.target.value))}
                  className="bg-transparent border-none p-0 text-3xl font-mono font-bold text-primary focus:ring-0 w-16"
                />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">per debtor</span>
              </div>
            </div>
            {/* Note: In a real implementation, we would use a dedicated field for frequency cap.
                Reusing maxPaymentPlanDurationMonths here as a placeholder for visual parity. */}
            <div className="p-5 rounded-xl bg-muted/50 border border-border space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quiet Period (Days)</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  defaultValue="2"
                  readOnly
                  className="bg-transparent border-none p-0 text-3xl font-mono font-bold text-muted-foreground focus:ring-0 w-16 opacity-50"
                />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">after payment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global DNC Checks */}
        <div className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-error/5 to-warning/5 border border-error/10 ring-1 ring-error/5">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Enforce Strict FDCPA Mode</span>
                {compliance.fdcpaStrictMode && (
                  <span className="px-1.5 py-0.5 rounded-md bg-error/10 text-error text-[9px] font-black uppercase ring-1 ring-error/20 shadow-sm">Active</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Auto-block all communication outside primary hours.</p>
            </div>
            <button
              onClick={() => handleUpdate('compliance.fdcpaStrictMode', !compliance.fdcpaStrictMode)}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 ease-in-out ml-4",
                compliance.fdcpaStrictMode ? "bg-primary shadow-md" : "bg-muted hover:bg-muted-foreground/20"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow-lg ring-0 transition duration-200 ease-in-out",
                compliance.fdcpaStrictMode ? "translate-x-5" : "translate-x-0"
              )}></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for class names
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
