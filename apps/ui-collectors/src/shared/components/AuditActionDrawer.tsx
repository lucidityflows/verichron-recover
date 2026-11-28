import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, X, ArrowRight, ClipboardCheck } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export interface AuditImpact {
  label: string;
  previousValue: string;
  newValue: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

interface AuditActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reasonCode: string, comment: string) => void;
  title: string;
  description: string;
  impacts: AuditImpact[];
  isSubmitting?: boolean;
}

/**
 * AuditActionDrawer
 * The mandatory gatekeeper for all policy mutations.
 * Implements the "Audit-First" requirement from v3.0 Spec.
 */
export const AuditActionDrawer: React.FC<AuditActionDrawerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  impacts,
  isSubmitting = false
}) => {
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-sidebar/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-card shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg ring-2 ring-primary/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground leading-none">{title}</h3>
              <p className="text-xs font-medium text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} className="text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* 1. Impact Summary */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Impact Analysis</h4>
            <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
              {impacts.map((impact, i) => (
                <div key={i} className="p-4 flex items-start gap-4">
                  <div className={cn(
                    "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                    impact.severity === 'CRITICAL' ? "bg-error animate-pulse ring-2 ring-error/20" :
                    impact.severity === 'WARNING' ? "bg-warning ring-2 ring-warning/20" : "bg-primary ring-2 ring-primary/20"
                  )} />
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold text-foreground">{impact.label}</p>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-muted-foreground line-through">{impact.previousValue}</span>
                      <ArrowRight size={12} className="text-border" />
                      <span className="text-primary font-bold">{impact.newValue}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Reason for Change */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Change Management</h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-tight">Reason Code *</label>
                <select
                  required
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full rounded-lg border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select a reason...</option>
                  <option value="REGULATORY">Regulatory Compliance Update</option>
                  <option value="STRATEGY">Strategy Optimization</option>
                  <option value="CLIENT">Client Specific Requirement</option>
                  <option value="ERROR">Correction of Previous Entry</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-tight">Technical Description</label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Summarize the intent and expected outcome of this change..."
                  className="w-full rounded-lg border-border bg-card text-foreground placeholder:text-muted-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </section>

          {/* Warning Block */}
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-3 ring-1 ring-warning/10">
            <AlertCircle size={18} className="text-warning mt-0.5 flex-shrink-0" />
            <p className="text-[11px] leading-relaxed text-foreground">
              <span className="font-bold text-warning">Caution:</span> This action will be logged to the immutable organization audit trail. Unauthorized or unverified changes to compliance strategy may result in legal liability.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-border bg-card">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-foreground border border-border rounded-lg hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              disabled={!reasonCode || isSubmitting}
              onClick={() => onConfirm(reasonCode, comment)}
              className={cn(
                "flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95",
                !reasonCode ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-sidebar text-sidebar-foreground hover:bg-sidebar/90"
              )}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-sidebar-foreground/20 border-t-sidebar-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <ClipboardCheck size={18} />
                  CONFIRM & COMMIT
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
