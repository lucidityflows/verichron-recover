import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  ChevronRight,
  Calendar,
  Download,
  FileArchive,
  Clock,
  History,
  AlertCircle,
  FileText,
  User,
  Users,
  Briefcase,
  Search,
  Loader2,
  CheckCircle2,
  X
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useAuditRequests } from './hooks/useAuditRequests.js';
import {
  useAuditsControllerGetLatestComplianceBrief,
  useAuditsControllerRunNightlyComplianceBrief,
} from '@/api/generated/audits/endpoints/audits/audits.js';
import { useUser } from '@/shared/store/userStore.js';
import { toast } from 'sonner';

type AuditType = 'DEBTOR' | 'COLLECTOR' | 'PORTFOLIO' | 'BULK';
type GenerationStatus = 'idle' | 'generating';

/**
 * AuditRequestCenter (The Regulator Desk)
 * Enhanced with specific audit workflows for debtor/collector/portfolio audits.
 */
export const AuditRequestCenter: React.FC = () => {
  const { organizationId } = useUser();
  const [activeTab, setActiveTab] = useState<'GENERATE' | 'HISTORY'>('GENERATE');
  const [selectedAuditType, setSelectedAuditType] = useState<AuditType>('DEBTOR');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'>('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [generatedRequestId, setGeneratedRequestId] = useState<string | null>(null);
  const [generatedAuditName, setGeneratedAuditName] = useState('');
  const [lastGeneratedCount, setLastGeneratedCount] = useState(0);
  const [lastGeneratedChecksum, setLastGeneratedChecksum] = useState<string | null>(null);
  const [downloadingRequestId, setDownloadingRequestId] = useState<string | null>(null);

  const auditTypes = [
    {
      id: 'DEBTOR' as AuditType,
      name: 'Debtor Audit',
      icon: User,
      description: 'Complete interaction history for a single debtor',
      includes: ['Communication timeline', 'Payment history', 'Disputes', 'Compliance status']
    },
    {
      id: 'COLLECTOR' as AuditType,
      name: 'Collector Audit',
      icon: Users,
      description: 'Performance and compliance review for a collector',
      includes: ['Activity metrics', 'Compliance violations', 'Call monitoring scores', 'Training records']
    },
    {
      id: 'PORTFOLIO' as AuditType,
      name: 'Portfolio Audit',
      icon: Briefcase,
      description: 'Financial reconciliation and compliance for a portfolio',
      includes: ['Financial reconciliation', 'Payment reconciliation', 'Compliance status', 'Accounting proof']
    },
    {
      id: 'BULK' as AuditType,
      name: 'Bulk Evidence',
      icon: FileArchive,
      description: 'Package multiple accounts for regulatory submission',
      includes: ['Interaction notes', 'Call recordings', 'Strategy logs', 'Verification data']
    }
  ];

  const targetTypeByAuditType: Record<AuditType, string | undefined> = {
    DEBTOR: 'DEBTOR',
    COLLECTOR: 'USER',
    PORTFOLIO: 'PORTFOLIO',
    BULK: undefined,
  };

  const {
    requests,
    pagination,
    isLoadingRequests,
    isRefetchingRequests,
    refetchRequests,
    selectedRequest,
    isLoadingSelectedRequest,
    createAuditRequest,
    isCreatingRequest,
    downloadRequestArtifact,
  } = useAuditRequests({
    page: historyPage,
    pageSize: 20,
    status: historyStatusFilter === 'ALL' ? undefined : historyStatusFilter,
    search: historySearch || undefined,
  }, selectedRequestId);

  const latestBriefQuery = useAuditsControllerGetLatestComplianceBrief(organizationId, {
    query: { enabled: !!organizationId },
  });
  const runNightlyBriefMutation = useAuditsControllerRunNightlyComplianceBrief({
    mutation: {
      onSuccess: async () => {
        toast.success('Compliance brief generated');
        await latestBriefQuery.refetch();
      },
      onError: () => {
        toast.error('Failed to generate compliance brief');
      },
    },
  });

  const auditHistory = useMemo(
    () =>
      requests.map((request) => {
        const filters = request.filters ?? {};
        const targetType =
          typeof filters.targetType === 'string' ? filters.targetType : request.requestType;
        const targetId = typeof filters.targetId === 'string' ? filters.targetId : 'ALL';
        return {
          id: request.id,
          type: request.requestType,
          status: request.status,
          target: `${targetType} • ${targetId}`,
          generatedAt: new Date(request.createdAt).toLocaleString(),
          recordCount: request.recordCount ?? 0,
          format: request.format,
          artifactUrl: request.status === 'SUCCEEDED' ? request.artifactUrl ?? null : null,
          checksum: request.artifactChecksum ?? null,
          errorMessage: request.errorMessage ?? null,
        };
      }),
    [requests],
  );

  useEffect(() => {
    if (!pendingRequestId) {
      return;
    }
    const request = requests.find((entry) => entry.id === pendingRequestId);
    if (!request) {
      return;
    }

    if (request.status === 'SUCCEEDED') {
      setGeneratedRequestId(request.id);
      setLastGeneratedCount(request.recordCount ?? 0);
      setLastGeneratedChecksum(request.artifactChecksum ?? null);
      setShowSuccessModal(true);
      setPendingRequestId(null);
      setGenerationStatus('idle');
      toast.success('Audit request completed', {
        description: `${request.requestType} report is ready for download.`,
      });
      return;
    }

    if (request.status === 'FAILED') {
      setPendingRequestId(null);
      setGenerationStatus('idle');
      toast.error('Audit request failed', {
        description: request.errorMessage ?? 'Generation failed before artifact creation.',
      });
    }
  }, [pendingRequestId, requests]);

  const downloadArtifact = async (requestId: string, fallbackName: string) => {
    try {
      setDownloadingRequestId(requestId);
      const artifact = await downloadRequestArtifact(requestId);
      const content = artifact.content ?? {};
      const mimeType = artifact.mimeType ?? 'application/json';
      const extension = mimeType.includes('csv') ? 'csv' : 'json';
      const serialized = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      const blob = new Blob([serialized], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${fallbackName}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Unable to download artifact', {
        description: error instanceof Error ? error.message : 'Unknown download error',
      });
    } finally {
      setDownloadingRequestId(null);
    }
  };

  const handleGenerateAudit = async () => {
    const auditNames = {
      DEBTOR: 'Debtor Compliance Audit',
      COLLECTOR: 'Collector Performance Audit',
      PORTFOLIO: 'Portfolio Reconciliation Audit',
      BULK: 'Bulk Evidence Package'
    };

    setGeneratedAuditName(auditNames[selectedAuditType]);
    setGenerationStatus('generating');
    try {
      const created = await createAuditRequest({
        requestType: selectedAuditType,
        targetType: targetTypeByAuditType[selectedAuditType],
        format: 'JSON',
      });
      setGeneratedRequestId(created.id);
      setLastGeneratedChecksum(null);
      setPendingRequestId(created.id);
      setHistoryPage(1);
      await refetchRequests();
      toast.info('Audit request submitted', {
        description: 'Generation is running in the background.',
      });
    } catch (error) {
      setGenerationStatus('idle');
      toast.error('Failed to create audit request', {
        description: error instanceof Error ? error.message : 'Unknown request error',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Evidence</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Audit Requests</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Evidence Collector</h1>
          <p className="text-sm font-medium text-muted-foreground">Generate comprehensive audit reports for regulatory or client review.</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('GENERATE')}
          className={cn(
            "px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            activeTab === 'GENERATE' ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          )}
        >
          Generate Audit
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={cn(
            "px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            activeTab === 'HISTORY' ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          )}
        >
          Audit History
        </button>
      </div>

      {/* Generate Audit View */}
      {activeTab === 'GENERATE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Audit Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {auditTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedAuditType(type.id)}
                  className={cn(
                    "group relative rounded-xl border p-6 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    selectedAuditType === type.id
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border bg-card hover:border-primary"
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                      selectedAuditType === type.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:text-primary"
                    )}>
                      <type.icon size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className={cn(
                        "text-sm font-bold",
                        selectedAuditType === type.id ? "text-primary" : "text-foreground"
                      )}>
                        {type.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-1">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Audit Configuration */}
            <div className="rounded-xl border border-border bg-card p-8 shadow-md space-y-6">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-tight">
                <FileText size={16} className="text-muted-foreground" />
                Audit Configuration
              </div>

              {selectedAuditType === 'DEBTOR' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-tight">Debtor Lookup</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search by SSN, Account #, or Name..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-foreground uppercase tracking-tight">Date Range</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground cursor-pointer hover:border-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        <Calendar size={16} className="text-muted-foreground" />
                        <span>All History</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-foreground uppercase tracking-tight">Export Format</label>
                      <select className="w-full rounded-lg border-border bg-card text-sm font-medium text-foreground focus:ring-ring">
                        <option>PDF (Recommended)</option>
                        <option>Excel Spreadsheet</option>
                        <option>JSON Data</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedAuditType === 'COLLECTOR' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-tight">Collector Selection</label>
                    <select className="w-full rounded-lg border-border bg-card text-sm font-medium text-foreground focus:ring-ring">
                      <option>Sarah Johnson (Collector #4521)</option>
                      <option>Mike Davis (Collector #4522)</option>
                      <option>Emily Chen (Collector #4523)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-foreground uppercase tracking-tight">Review Period</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground cursor-pointer hover:border-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        <Calendar size={16} className="text-muted-foreground" />
                        <span>Last 30 Days</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-foreground uppercase tracking-tight">Include Benchmarks</label>
                      <select className="w-full rounded-lg border-border bg-card text-sm font-medium text-foreground focus:ring-ring">
                        <option>Team Average</option>
                        <option>Agency Average</option>
                        <option>Industry Standard</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedAuditType === 'PORTFOLIO' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-tight">Portfolio Selection</label>
                    <select className="w-full rounded-lg border-border bg-card text-sm font-medium text-foreground focus:ring-ring">
                      <option>Chase Retail Q4 2025</option>
                      <option>BofA Chargeoffs Q3 2025</option>
                      <option>Medical Debt Tranche A</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-foreground uppercase tracking-tight block">Audit Sections</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { id: 'sec_1', label: 'Financial Reconciliation', desc: 'ROI, liquidation rate, costs' },
                        { id: 'sec_2', label: 'Payment Reconciliation', desc: 'Deposits, bank reconciliation' },
                        { id: 'sec_3', label: 'Compliance Status', desc: 'Disputes, violations, inquiries' },
                        { id: 'sec_4', label: 'Accounting Proof', desc: 'Balance verification, escheatment' },
                      ].map((section) => (
                        <label key={section.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted hover:border-primary cursor-pointer transition-all">
                          <input type="checkbox" defaultChecked className="mt-1 rounded border-border text-primary focus:ring-ring" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground">{section.label}</p>
                            <p className="text-[10px] text-muted-foreground">{section.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedAuditType === 'BULK' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-tight">Portfolio Scope</label>
                    <select className="w-full rounded-lg border-border bg-card text-sm font-medium text-foreground focus:ring-ring">
                      <option>Chase Retail Q4 (All Accounts)</option>
                      <option>BofA Chargeoffs (All Accounts)</option>
                      <option>Single Account Lookup...</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-tight">Audit Period</label>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground cursor-pointer hover:border-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                      <Calendar size={16} className="text-muted-foreground" />
                      <span>Dec 01, 2025 – Dec 25, 2025</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-foreground uppercase tracking-tight block">Evidence Types Required</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { id: 'ev_1', label: 'Interaction Notes', desc: 'Full collector audit trail' },
                        { id: 'ev_2', label: 'Call Recordings', desc: 'WAV files from api-voice' },
                        { id: 'ev_3', label: 'Strategy Log', desc: 'Mutation history for this tranche' },
                        { id: 'ev_4', label: 'Verification Data', desc: 'Skip tracing and SSN checks' },
                      ].map((item) => (
                        <label key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted hover:border-primary cursor-pointer transition-all">
                          <input type="checkbox" defaultChecked className="mt-1 rounded border-border text-primary focus:ring-ring" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock size={14} />
                  <span>Est. Generation Time: {generationStatus === 'generating' ? 'Processing...' : '20s'}</span>
                </div>
                <button
                  onClick={handleGenerateAudit}
                  disabled={generationStatus !== 'idle' || isCreatingRequest}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-bold text-white shadow-xl transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    generationStatus === 'idle'
                      ? "bg-primary hover:bg-primary-hover active:scale-95"
                      : "bg-primary cursor-wait"
                  )}
                >
                  {generationStatus === 'idle' && <FileArchive size={18} />}
                  {generationStatus === 'generating' && <Loader2 size={18} className="animate-spin" />}
                  {generationStatus === 'idle' && 'GENERATE AUDIT'}
                  {generationStatus === 'generating' && 'FETCHING...'}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck size={20} className="text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-primary">What's Included</h4>
              </div>
              <ul className="space-y-3">
                {auditTypes.find(t => t.id === selectedAuditType)?.includes.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-tight">
                <History size={16} className="text-muted-foreground" />
                Regulatory Protocol
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                All audit reports are <span className="text-foreground font-bold">cryptographically hashed</span> at generation for tamper-proof verification in court proceedings or regulatory review.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-tight">
                <AlertCircle size={16} className="text-muted-foreground" />
                Temporary Access Links
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Generate secure 24-hour read-only links for external auditors or regulators.
              </p>
              <button className="w-full py-2 rounded-md border border-border text-[10px] font-bold text-foreground hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                GENERATE SECURE LINK
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-tight">
                  <ShieldCheck size={16} className="text-muted-foreground" />
                  Nightly Compliance Brief
                </div>
                <button
                  disabled={!organizationId || runNightlyBriefMutation.isPending}
                  onClick={() => {
                    if (!organizationId) {
                      return;
                    }
                    runNightlyBriefMutation.mutate({
                      organizationId,
                      params: { briefDate: new Date().toISOString().split('T')[0] },
                    });
                  }}
                  className="px-2 py-1 text-[10px] font-bold uppercase rounded border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {runNightlyBriefMutation.isPending ? 'Running...' : 'Run'}
                </button>
              </div>
              {latestBriefQuery.isLoading ? (
                <p className="text-[10px] text-muted-foreground">Loading latest brief...</p>
              ) : latestBriefQuery.data?.data ? (
                <div className="space-y-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Brief date</span>
                    <span className="font-mono text-foreground">{latestBriefQuery.data.data.briefDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Risk score</span>
                    <span className="font-mono text-foreground">{latestBriefQuery.data.data.riskScore}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Anomalies</span>
                    <span className="font-mono text-foreground">{latestBriefQuery.data.data.anomalyCount}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">No brief generated yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/40 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up">
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X size={20} />
            </button>

            <div className="p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-success" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Audit Generated Successfully</h3>
                <p className="text-sm text-muted-foreground">
                  Your <span className="font-bold text-foreground">{generatedAuditName}</span> has been generated and cryptographically signed.
                </p>
              </div>

              <div className="rounded-xl bg-muted p-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Records Included:</span>
                  <span className="font-mono font-bold text-foreground">{lastGeneratedCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-mono font-bold text-foreground">JSON</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Artifact:</span>
                  <span className="font-mono text-xs text-primary">{generatedRequestId ? 'Ready' : 'Pending'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cryptographic Hash:</span>
                  <span className="font-mono text-xs text-primary">{lastGeneratedChecksum ?? 'Pending'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 px-6 py-3 rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Close
                </button>
                <button
                  disabled={!generatedRequestId || downloadingRequestId === generatedRequestId}
                  onClick={() => generatedRequestId && downloadArtifact(generatedRequestId, 'audit-artifact')}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Download size={16} />
                  {downloadingRequestId === generatedRequestId ? 'Downloading...' : 'Download'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Detail Modal */}
      {selectedRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/40 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-slide-up">
            <button
              onClick={() => setSelectedRequestId(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X size={20} />
            </button>
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">Audit Request Detail</h3>
                <p className="text-xs text-muted-foreground font-mono">{selectedRequestId}</p>
              </div>

              {isLoadingSelectedRequest || !selectedRequest ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  Loading request details...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-[10px] uppercase text-muted-foreground">Type</p>
                      <p className="text-sm font-bold text-foreground">{selectedRequest.requestType}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-[10px] uppercase text-muted-foreground">Status</p>
                      <p className="text-sm font-bold text-foreground">{selectedRequest.status}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-[10px] uppercase text-muted-foreground">Format</p>
                      <p className="text-sm font-bold text-foreground">{selectedRequest.format}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-[10px] uppercase text-muted-foreground">Records</p>
                      <p className="text-sm font-bold text-foreground">{selectedRequest.recordCount ?? 0}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground mb-2">Requested Filters</p>
                    <pre className="text-[11px] text-foreground font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedRequest.filters ?? {}, null, 2)}
                    </pre>
                  </div>

                  {selectedRequest.errorMessage && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                      <p className="text-[10px] uppercase text-destructive mb-1">Error</p>
                      <p className="text-xs text-foreground">{selectedRequest.errorMessage}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setSelectedRequestId(null)}
                      className="px-4 py-2 rounded border border-border text-xs font-bold text-foreground hover:bg-muted"
                    >
                      Close
                    </button>
                    <button
                      disabled={selectedRequest.status !== 'SUCCEEDED' || downloadingRequestId === selectedRequest.id}
                      onClick={() => downloadArtifact(selectedRequest.id, `audit-${selectedRequest.id}`)}
                      className="px-4 py-2 rounded bg-primary text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloadingRequestId === selectedRequest.id ? 'Downloading...' : 'Download Artifact'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit History View */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <History size={20} className="text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Generated Audits</h4>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              All generated audits are retained for <span className="text-sidebar-foreground font-bold">24 months</span> for regulatory compliance.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
            <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-tight">
                <FileText size={14} />
                Audit Archive
              </div>
              <div className="flex items-center gap-2">
                {isRefetchingRequests && (
                  <span className="text-[10px] text-muted-foreground">Refreshing...</span>
                )}
                <select
                  value={historyStatusFilter}
                  onChange={(event) => {
                    setHistoryStatusFilter(event.target.value as typeof historyStatusFilter);
                    setHistoryPage(1);
                  }}
                  className="px-2 py-1.5 text-xs rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="RUNNING">Running</option>
                  <option value="SUCCEEDED">Succeeded</option>
                  <option value="FAILED">Failed</option>
                </select>
                <input
                  type="text"
                  value={historySearch}
                  onChange={(event) => {
                    setHistorySearch(event.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Search audits..."
                  className="px-3 py-1.5 text-xs rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Audit Type</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Generated</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Format</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Records</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditHistory.map((audit) => (
                  <tr key={audit.id} className="hover:bg-muted transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-primary/10 text-primary">
                        {audit.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase',
                        audit.status === 'SUCCEEDED' && 'bg-success/10 text-success',
                        audit.status === 'FAILED' && 'bg-destructive/10 text-destructive',
                        (audit.status === 'PENDING' || audit.status === 'RUNNING') && 'bg-warning/10 text-warning',
                      )}>
                        {audit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-foreground">{audit.target}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Clock size={10} />
                        {audit.generatedAt}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-muted text-foreground">
                        {audit.format}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground font-mono">{audit.recordCount}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setSelectedRequestId(audit.id)}
                          className="text-xs font-bold text-foreground hover:text-primary uppercase tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          View
                        </button>
                        <button
                          disabled={audit.status !== 'SUCCEEDED' || downloadingRequestId === audit.id}
                          onClick={() => downloadArtifact(audit.id, `audit-${audit.id}`)}
                          className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <Download size={12} />
                          {downloadingRequestId === audit.id ? 'Downloading...' : 'Download'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoadingRequests && auditHistory.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-xs text-muted-foreground">
                      No audit records found for the selected scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {pagination && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="text-[10px] text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                    className="px-2 py-1 text-[10px] font-bold uppercase rounded border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                  >
                    Prev
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() =>
                      setHistoryPage((current) => Math.min(pagination.totalPages, current + 1))
                    }
                    className="px-2 py-1 text-[10px] font-bold uppercase rounded border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
