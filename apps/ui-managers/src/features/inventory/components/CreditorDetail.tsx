import React from 'react';
import {
  Building2,
  ChevronRight,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  TrendingUp,
  Loader2,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useCreditor } from '../hooks/useCreditors.js';

interface CreditorDetailProps {
  creditorId: string;
  onBack: () => void;
}

/**
 * CreditorDetail
 * Full detail view for a single creditor master record.
 */
export const CreditorDetail: React.FC<CreditorDetailProps> = ({ creditorId, onBack }) => {
  const { data: creditor, isLoading, error } = useCreditor(creditorId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !creditor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-6 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Failed to Load Creditor</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {error instanceof Error ? error.message : 'Creditor not found'}
        </p>
        <button
          onClick={onBack}
          className="rounded-md bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          Back to Registry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      {/* Navigation Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <button onClick={onBack} className="hover:text-primary transition-colors">Creditor Registry</button>
        <ChevronRight size={12} />
        <span className="text-foreground">{creditor.legalName}</span>
      </nav>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground ring-4 ring-background shadow-md relative">
            <Building2 size={36} />
            {creditor.isPlatformVerified && (
              <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-purple-500 border-2 border-background flex items-center justify-center" title="Platform Verified">
                <ShieldCheck size={12} className="text-white" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{creditor.legalName}</h1>
              {creditor.isMasterRecord && (
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ring-1 ring-primary/20">Master Record</span>
              )}
              {creditor.isPlatformVerified && (
                <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ring-1 ring-purple-600/20 flex items-center gap-1">
                  <Globe size={10} />
                  Platform Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {creditor.ein && (
                <p className="text-sm font-medium text-muted-foreground font-mono">EIN: {String(creditor.ein)}</p>
              )}
              {creditor.dbaName && (
                <span className="text-xs text-muted-foreground">• DBA: {String(creditor.dbaName)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-all">
            <FileText size={16} />
            Edit Details
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Creditor Information */}
        <div className="lg:col-span-8 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Debts</span>
              <div className="text-2xl font-black font-mono text-foreground">{creditor.debtCount.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground font-medium">Accounts linked to this creditor</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Principal</span>
              <div className="text-2xl font-black font-mono text-foreground">
                ${parseFloat(creditor.totalPrincipal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Face value of all debts</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hygiene Score</span>
              <div className="text-2xl font-black font-mono text-foreground">
                {creditor.hygieneScore ? `${creditor.hygieneScore as unknown as number}%` : 'N/A'}
              </div>
              <p className={cn(
                "text-[10px] font-bold uppercase",
                creditor.hygieneScore && (creditor.hygieneScore as unknown as number) >= 90 ? "text-success" :
                creditor.hygieneScore && (creditor.hygieneScore as unknown as number) >= 70 ? "text-warning" : "text-muted-foreground"
              )}>
                {creditor.hygieneScore && (creditor.hygieneScore as unknown as number) >= 90 ? 'Excellent' :
                 creditor.hygieneScore && (creditor.hygieneScore as unknown as number) >= 70 ? 'Fair' : 'Data Quality Score'}
              </p>
            </div>
          </div>

          {/* Address Information */}
          {(creditor.street1 || creditor.city || creditor.state) && (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted flex items-center gap-2">
                <MapPin size={16} className="text-muted-foreground" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">Mailing Address</h3>
              </div>
              <div className="p-6">
                <div className="space-y-1 font-mono text-sm text-foreground">
                  {creditor.street1 && <div>{String(creditor.street1)}</div>}
                  {creditor.street2 && <div>{String(creditor.street2)}</div>}
                  {creditor.street3 && <div>{String(creditor.street3)}</div>}
                  {(creditor.city || creditor.state || creditor.postalCode) && (
                    <div>
                      {creditor.city && String(creditor.city)}
                      {creditor.city && creditor.state && ', '}
                      {creditor.state && String(creditor.state)}
                      {' '}
                      {creditor.postalCode && String(creditor.postalCode)}
                    </div>
                  )}
                  {creditor.country && creditor.country !== 'US' && (
                    <div className="text-muted-foreground">{creditor.country}</div>
                  )}
                </div>
                {creditor.latitude && creditor.longitude && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin size={12} />
                      <span className="font-mono">
                        {String(creditor.latitude)}, {String(creditor.longitude)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {creditor.notes && (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted flex items-center gap-2">
                <FileText size={16} className="text-muted-foreground" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">Notes</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-foreground whitespace-pre-wrap">{String(creditor.notes)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Verification & Metadata */}
        <div className="lg:col-span-4 space-y-6">
          {/* Verification Status */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Verification Status</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">EIN Verified</span>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset",
                  creditor.einVerified ? "bg-success/10 text-success ring-success/20" : "bg-warning/10 text-warning ring-warning/20"
                )}>
                  {creditor.einVerified ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                  {creditor.einVerified ? 'VERIFIED' : 'UNVERIFIED'}
                </span>
              </div>

              {creditor.isPlatformVerified && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Platform Match</span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset bg-purple-50 text-purple-700 ring-purple-600/20">
                    <ShieldCheck size={10} />
                    VERIFIED
                  </span>
                </div>
              )}

              {creditor.globalLinkConfidence && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Global Match Confidence</span>
                    <span className="text-xs font-bold font-mono text-foreground">{creditor.globalLinkConfidence as unknown as number}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all"
                      style={{ width: `${creditor.globalLinkConfidence as unknown as number}%` }}
                    />
                  </div>
                </div>
              )}

              {creditor.hasUnresolvedConflict && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Conflicts</span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset bg-warning/10 text-warning ring-warning/20">
                    <AlertCircle size={10} />
                    PENDING
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Master Record Info */}
          {!creditor.isMasterRecord && creditor.masterCreditorId && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Duplicate Record</h3>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">This is a duplicate that has been merged into a master record.</p>
                <button className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                  <ExternalLink size={12} />
                  View Master Record
                </button>
                {creditor.matchConfidenceScore && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Match Confidence</span>
                      <span className="text-xs font-bold font-mono text-foreground">{creditor.matchConfidenceScore as unknown as number}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Industry Classification */}
          {creditor.industry && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Industry</h3>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{String(creditor.industry)}</span>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Record Metadata</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-mono text-foreground">
                  {new Date(creditor.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-mono text-foreground">
                  {new Date(creditor.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Record ID</span>
                <span className="font-mono text-muted-foreground text-[10px]">
                  {creditor.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
