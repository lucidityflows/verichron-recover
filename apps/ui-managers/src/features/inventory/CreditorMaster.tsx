import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Database, Search, ChevronRight, CheckCircle2, AlertCircle, Merge, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { CreditorResolver } from './components/CreditorResolver.js';
import { CreditorDetail } from './components/CreditorDetail.js';
import { useCreditors } from './hooks/useCreditors.js';
import { useCreditorConflicts } from './hooks/useCreditorConflicts.js';

type RegistryState = 'LIST' | 'RESOLVING' | 'DETAIL';

/**
 * CreditorMaster
 * The "Source of Truth" for original creditors.
 * Handles entity resolution and deduplication.
 */
export const CreditorMaster: React.FC = () => {
  const [state, setState] = useState<RegistryState>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCreditorId, setSelectedCreditorId] = useState<string | null>(null);

  // Fetch creditors with search filter
  const { data: creditorsData, isLoading: creditorsLoading, error: creditorsError } = useCreditors({
    search: searchTerm || undefined,
    onlyMasters: true,
  });

  // Fetch all creditors (including unverified) for hygiene calc
  const { data: allCreditorsData } = useCreditors({ onlyMasters: false });

  // Fetch pending conflicts count
  const { data: conflictsData } = useCreditorConflicts({
    status: 'HIGH_CONFIDENCE',
  });

  const creditors = creditorsData?.creditors || [];
  const allCreditors = allCreditorsData?.creditors || [];
  const pendingConflictsCount = conflictsData?.total || 0;

  // Calculate Hygiene Score
  const verifiedCount = allCreditors.filter(c => c.einVerified || !c.hasUnresolvedConflict).length;
  const totalCount = allCreditors.length;
  const hygieneScore = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 100;

  if (state === 'RESOLVING') {
    return (
      <div className="h-full flex flex-col -mt-4 animate-fade-in">
        <CreditorResolver onBack={() => setState('LIST')} />
      </div>
    );
  }

  if (state === 'DETAIL' && selectedCreditorId) {
    return (
      <div className="h-full flex flex-col animate-fade-in">
        <CreditorDetail creditorId={selectedCreditorId} onBack={() => setState('LIST')} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Inventory</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Creditor Master</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Creditor Registry</h1>
          <p className="text-sm font-medium text-muted-foreground">Manage master records and resolve entity duplicates from incoming imports.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setState('RESOLVING')}
            className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95"
          >
            <Merge size={16} />
            Resolve Duplicates
          </button>
        </div>
      </header>

      {/* Hygiene and Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hygiene Score</p>
            <div className="text-2xl font-black font-mono text-foreground">{hygieneScore}%</div>
            <p className={cn(
              "text-[10px] font-bold uppercase",
              hygieneScore >= 90 ? "text-success" : hygieneScore >= 70 ? "text-warning" : "text-error"
            )}>
              {hygieneScore >= 90 ? 'Excellent' : hygieneScore >= 70 ? 'Fair' : 'Needs Attention'}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full border-4 border-muted flex items-center justify-center relative">
             <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  className={cn(
                    "stroke-current",
                    hygieneScore >= 90 ? "text-success" : hygieneScore >= 70 ? "text-warning" : "text-error"
                  )}
                  strokeWidth="4"
                  strokeDasharray={`${hygieneScore}, 100`}
                />
             </svg>
             <CheckCircle2 size={16} className={cn(hygieneScore >= 90 ? "text-success" : "text-muted-foreground")} />
          </div>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-5 shadow-md">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Master Records</p>
          <div className="mt-1 text-2xl font-black font-mono text-foreground">{creditors.length}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Unique canonical entities</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-md">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pending Conflicts</p>
          <div className="mt-1 text-2xl font-black font-mono text-primary">{pendingConflictsCount}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Requiring semantic review</p>
        </div>
      </div>

      {/* Registry Controls */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Legal Name, EIN, or Alias..."
          className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 shadow-sm"
        />
      </div>

      {/* High-Density Registry Table */}
      <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
        {creditorsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : creditorsError ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">Failed to Load Creditors</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {creditorsError instanceof Error ? creditorsError.message : 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              Retry
            </button>
          </div>
        ) : creditors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <Database className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No Creditors Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {searchTerm 
                ? 'No master records match your search criteria. Try a broader search or clear the filter.' 
                : 'Import a portfolio CSV to automatically populate your creditor registry with semantic entity resolution.'}
            </p>
            {!searchTerm && (
              <Link to="/inventory/ingestion" className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-all shadow-lg active:scale-95">
                Go to Ingestion Center
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Master Legal Name</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">EIN / Tax ID</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Linked Debts</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {creditors.map((cred: any) => (
                <tr key={cred.id} className="group hover:bg-muted transition-colors font-sans">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{cred.legalName}</div>
                      {cred.dbaName && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1 rounded uppercase tracking-tighter">
                            DBA: {String(cred.dbaName)}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-bold text-muted-foreground italic">
                    {cred.ein ? String(cred.ein) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset",
                      cred.einVerified ? "bg-success/10 text-success ring-success/20" : "bg-warning/10 text-warning ring-warning/20"
                    )}>
                      {cred.einVerified ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      {cred.einVerified ? 'VERIFIED' : 'UNVERIFIED'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-foreground">
                    {(cred.debtCount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedCreditorId(cred.id);
                        setState('DETAIL');
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
                      title="View Registry Details"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Semantic Resolution Call-out */}
      {pendingConflictsCount > 0 && (
        <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Merge size={20} className="text-primary" />
              <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Semantic Resolution Engine</h4>
            </div>
            <p className="text-xs text-muted-foreground max-w-xl">
              Vertex AI is currently monitoring incoming imports. It has identified <span className="text-sidebar-foreground font-bold">{pendingConflictsCount} possible {pendingConflictsCount === 1 ? 'duplicate' : 'duplicates'}</span> requiring your review to maintain master data integrity.
            </p>
          </div>
          <button
            onClick={() => setState('RESOLVING')}
            className="w-full md:w-auto rounded-md bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 shadow-lg"
          >
            OPEN RESOLVER
          </button>
        </div>
      )}
    </div>
  );
};