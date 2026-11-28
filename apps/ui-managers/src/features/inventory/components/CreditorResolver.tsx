import React, { useState } from 'react';
import {
  Merge,
  UserPlus,
  ArrowRight,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useCreditorConflicts, useCreditorConflict, useResolveConflict } from '../hooks/useCreditorConflicts.js';
import { ResolveConflictDtoAction } from '@/api/generated/debts_models';

/**
 * CreditorResolver
 * The interactive UI for resolving AI-detected entity duplicates.
 * Implements the "Human-Verification-at-Scale" pattern.
 */
export const CreditorResolver: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeConflictIndex, setActiveConflictIndex] = useState(0);

  // Fetch all pending conflicts
  const { data: conflictsData, isLoading: conflictsLoading, error: conflictsError } = useCreditorConflicts({
    status: 'HIGH_CONFIDENCE',
  });

  // Fetch detailed conflict data for current conflict
  const conflicts = conflictsData?.conflicts || [];
  const currentConflictId = conflicts[activeConflictIndex]?.id || null;
  const { data: conflictDetail } = useCreditorConflict(currentConflictId);

  // Resolve conflict mutation
  const { mutate: resolveConflict, isPending: isResolving } = useResolveConflict();

  const current = conflictDetail || conflicts[activeConflictIndex];

  const handleMerge = (targetMasterId: string) => {
    if (!current?.id) return;

    resolveConflict(
      {
        conflictId: current.id,
        dto: {
          action: ResolveConflictDtoAction.MERGE,
          targetMasterId,
          notes: 'Merged via AI suggestion',
        },
      },
      {
        onSuccess: () => {
          // Move to next conflict
          if (activeConflictIndex < conflicts.length - 1) {
            setActiveConflictIndex(activeConflictIndex + 1);
          } else {
            onBack(); // All conflicts resolved
          }
        },
      }
    );
  };

  const handleCreateNew = () => {
    if (!current?.id) return;

    resolveConflict(
      {
        conflictId: current.id,
        dto: {
          action: ResolveConflictDtoAction.CREATE_NEW,
          notes: 'AI suggestions rejected - created new master',
        },
      },
      {
        onSuccess: () => {
          // Move to next conflict
          if (activeConflictIndex < conflicts.length - 1) {
            setActiveConflictIndex(activeConflictIndex + 1);
          } else {
            onBack(); // All conflicts resolved
          }
        },
      }
    );
  };

  const handleSkip = () => {
    if (activeConflictIndex < conflicts.length - 1) {
      setActiveConflictIndex(activeConflictIndex + 1);
    } else {
      setActiveConflictIndex(0); // Loop back to start
    }
  };

  const handleNext = () => {
    if (activeConflictIndex < conflicts.length - 1) {
      setActiveConflictIndex(activeConflictIndex + 1);
    }
  };

  // Loading state
  if (conflictsLoading) {
    return (
      <div className="flex flex-col h-full bg-card animate-fade-in overflow-hidden border border-border rounded-xl shadow-2xl">
        <header className="bg-sidebar px-6 py-4 flex items-center justify-between text-sidebar-foreground">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Merge size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Semantic Entity Resolver</h2>
              <p className="text-xs text-muted-foreground">Loading conflicts...</p>
            </div>
          </div>
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Error state
  if (conflictsError) {
    return (
      <div className="flex flex-col h-full bg-card animate-fade-in overflow-hidden border border-border rounded-xl shadow-2xl">
        <header className="bg-sidebar px-6 py-4 flex items-center justify-between text-sidebar-foreground">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Merge size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Semantic Entity Resolver</h2>
              <p className="text-xs text-muted-foreground">Failed to load conflicts</p>
            </div>
          </div>
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <AlertCircle className="h-12 w-12 text-error mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Failed to Load Conflicts</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {conflictsError instanceof Error ? conflictsError.message : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!conflicts.length || !current) {
    return (
      <div className="flex flex-col h-full bg-card animate-fade-in overflow-hidden border border-border rounded-xl shadow-2xl">
        <header className="bg-sidebar px-6 py-4 flex items-center justify-between text-sidebar-foreground">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Merge size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Semantic Entity Resolver</h2>
              <p className="text-xs text-muted-foreground">No conflicts to resolve</p>
            </div>
          </div>
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-success mb-4" />
          <h3 className="text-2xl font-bold text-foreground mb-2">All Caught Up!</h3>
          <p className="text-sm text-muted-foreground mb-6">
            There are no pending creditor conflicts to resolve at this time.
          </p>
          <button
            onClick={onBack}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            Back to Registry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card animate-fade-in overflow-hidden border border-border rounded-xl shadow-2xl">
      {/* Resolver Header */}
      <header className="bg-sidebar px-6 py-4 flex items-center justify-between text-sidebar-foreground">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Merge size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Semantic Entity Resolver</h2>
            <p className="text-xs text-muted-foreground">
              Reviewing {conflicts.length} unresolved creditor {conflicts.length === 1 ? 'string' : 'strings'} from recent imports.
            </p>
          </div>
        </div>
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors" disabled={isResolving}>
          <X size={20} />
        </button>
      </header>

      {/* Main Resolution Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Raw Data Context */}
        <div className="w-1/3 border-r border-border p-8 space-y-8 bg-muted/30">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Unresolved Data</h3>
            <div className="p-6 rounded-xl border-2 border-dashed border-border bg-card shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Input String:</span>
              <div className="text-2xl font-black font-mono tracking-tight text-foreground">
                "{current.rawCreditorName}"
              </div>
              <div className="pt-2 flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                {current.sourceImportId && (
                  <span className="bg-muted px-1.5 py-0.5 rounded uppercase">
                    Import: {String(current.sourceImportId).slice(0, 8)}
                  </span>
                )}
                <span className="bg-muted px-1.5 py-0.5 rounded uppercase">
                  Status: {String(current.status)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Resolution Path</h3>
            <div className="space-y-3">
              <button
                onClick={handleCreateNew}
                disabled={isResolving}
                className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary hover:shadow-md transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary">
                    {isResolving ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">Create New Master</p>
                    <p className="text-[10px] text-muted-foreground">Ignore AI suggestions and create new record.</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Suggestions Grid */}
        <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Vertex AI Matches</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Sparkles size={14} />
              <span>Confidence: {current.status}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* AI suggested creditors */}
            {(current.suggestedMasterIds || []).map((masterId: string, i: number) => {
              const confidence = current.confidenceScores?.[i] || 0;
              const isHighConfidence = confidence > 90;
              const isPlatform = current.isPlatformMatch && i === 0;

              return (
                <div
                  key={masterId}
                  className={cn(
                    'relative rounded-xl border p-6 transition-all cursor-pointer group',
                    isHighConfidence
                      ? isPlatform
                        ? 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20'
                        : 'border-success/30 bg-success/10 hover:bg-success/20'
                      : 'border-border bg-card hover:border-primary'
                  )}
                >
                  {isHighConfidence && (
                    <div className={cn(
                      "absolute -top-2.5 right-6 px-3 py-0.5 rounded-full text-[10px] font-bold text-white uppercase shadow-sm",
                      isPlatform ? "bg-purple-500" : "bg-emerald-500"
                    )}>
                      {isPlatform ? 'Platform Match' : 'High Confidence Match'}
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          'h-12 w-12 rounded-lg flex items-center justify-center',
                          isHighConfidence
                            ? isPlatform
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-emerald-100 text-emerald-600'
                            : 'bg-slate-100 text-slate-400'
                        )}
                      >
                        <Building2 size={24} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-bold text-foreground">
                          {isPlatform ? 'Platform Creditor' : 'Org Creditor'}
                        </h4>
                        <div className="flex items-center gap-4 text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-tighter">
                          <span>ID: {masterId.slice(0, 8)}</span>
                        </div>
                        <div className="pt-2 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            AI Logic: {current.aiMatchReason ? String(current.aiMatchReason) : 'Semantic similarity'}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded",
                            isPlatform ? "text-purple-600 bg-purple-600/10" : "text-blue-600 bg-blue-600/10"
                          )}>
                            {isPlatform ? 'PLATFORM MASTER' : 'ORG MASTER'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-3">
                      <div className="text-2xl font-black font-mono text-foreground">
                        {Math.round(confidence)}%
                      </div>
                      <button
                        onClick={() => handleMerge(masterId)}
                        disabled={isResolving}
                        className={cn(
                          'flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
                          isHighConfidence
                            ? isPlatform
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-success text-white hover:bg-success/90'
                            : 'bg-primary text-primary-foreground hover:bg-primary-hover'
                        )}
                      >
                        {isResolving ? <Loader2 size={14} className="animate-spin" /> : <Merge size={14} />}
                        {isPlatform ? 'LINK TO PLATFORM' : 'MERGE INTO MASTER'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {!current.suggestedMasterIds?.length && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">No AI Suggestions</h3>
                <p className="text-sm text-muted-foreground">
                  Vertex AI couldn't find any confident matches. Consider creating a new master record.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Controls */}
      <footer className="bg-card border-t border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Decision Progress</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {activeConflictIndex + 1} / {conflicts.length}
            </span>
            <div className="flex gap-1">
              {conflicts.slice(0, Math.min(conflicts.length, 10)).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 w-8 rounded-full transition-all',
                    i < activeConflictIndex ? 'bg-success' : i === activeConflictIndex ? 'bg-primary' : 'bg-muted'
                  )}
                />
              ))}
              {conflicts.length > 10 && (
                <span className="text-xs text-muted-foreground ml-1">+{conflicts.length - 10} more</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            disabled={isResolving}
            className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground uppercase disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip For Now
          </button>
          <button
            onClick={handleNext}
            disabled={isResolving || activeConflictIndex >= conflicts.length - 1}
            className="flex items-center gap-2 rounded-md bg-muted px-6 py-2 text-xs font-bold text-foreground hover:bg-muted/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Unresolved
            <ChevronRight size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
};
