import React, { useState } from 'react';
import { 
  PlusCircle, 
  History, 
  FileUp, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Wrench,
  BrainCircuit,
  Zap,
  Send,
  Loader2
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { RepairShopGrid } from './components/RepairShopGrid.js';
import { IngestionMapper } from './components/IngestionMapper.js';
import { InvitationWave } from './components/InvitationWave.js';
import { ImportJobDetailModal } from './components/ImportJobDetailModal.js';
import { useUser } from '../../shared/store/userStore.js';
import {
  useImportJobs,
  useImportJobStatus
} from './hooks/useImportJobs.js';
import { useProfilesControllerInvitePortfolioDebtors } from '../../api/generated/debtors/endpoints/debtor-profiles/debtor-profiles.js';
import { useToast } from '@/shared/hooks';
import { formatDistanceToNow } from 'date-fns';

type IngestionState = 'OVERVIEW' | 'UPLOADING' | 'MAPPING' | 'REPAIRING';

/**
 * IngestionCenter
 * High-speed CSV/Excel import pipeline.
 */
export const IngestionCenter: React.FC = () => {
  const { organizationId } = useUser();
  const { success, error: toastError } = useToast();
  const [state, setState] = useState<IngestionState>('OVERVIEW');
  const [activeInvitation, setActiveInvitation] = useState<{ id: string, batchId: string, name: string, total: number } | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  // Mutations
  const { mutateAsync: invitePortfolio } = useProfilesControllerInvitePortfolioDebtors();

  const handleInviteDebtors = async (job: any) => {
    try {
      const response = await invitePortfolio({
        organizationId: organizationId!,
        data: { portfolioId: job.portfolioId }
      });

      if (!response.data || typeof response.data === 'undefined') {
        toastError('Invitation Failed', 'Failed to retrieve invitation response.');
        return;
      }

      const { invitationBatchId, totalInvitations } = response.data;

      if (!invitationBatchId || typeof totalInvitations === 'undefined') {
        toastError('Invitation Failed', 'Invalid invitation response.');
        return;
      }

      setActiveInvitation({
        id: job.id,
        batchId: invitationBatchId,
        name: job.portfolioName || 'Import',
        total: totalInvitations
      });

      success('Invitations Triggered', `Dispatching ${totalInvitations} portal invitations.`);
    } catch (err) {
      toastError('Invitation Failed', 'Failed to start the invitation wave.');
    }
  };

  
  // Form State for Import
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    portfolioName: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '0',
    source: ''
  });

  // Inspection Result State
  const [inspectionData, setInspectionData] = useState<{ 
    tempFileId: string, 
    headers: string[], 
    previewRows: any[] 
  } | null>(null);

  const { 
    jobs, 
    isLoading: isLoadingJobs, 
    createImport, 
    isCreating, 
    inspectImport, 
    isInspecting 
  } = useImportJobs({ pageSize: 10 });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      // Auto-fill portfolio name from filename if empty
      if (!formData.portfolioName) {
        setFormData(prev => ({ ...prev, portfolioName: e.target.files![0].name.split('.')[0] }));
      }
    }
  };

  const handleStartInspection = async () => {
    if (!file || !formData.portfolioName || !formData.source) {
      toastError('Missing Information', 'Please provide a file and all portfolio metadata.');
      return;
    }

    try {
      const response = await inspectImport(file);
      setInspectionData(response.data);
      setState('MAPPING');
    } catch (err) {
      toastError('Inspection Failed', 'Failed to read file headers. Please check your CSV format.');
    }
  };

  const handleExecuteImport = async (columnMapping: Record<string, string>) => {
    if (!inspectionData) return;

    try {
      await createImport({
        tempFileId: inspectionData.tempFileId,
        columnMapping,
        portfolioName: formData.portfolioName,
        purchaseDate: formData.purchaseDate,
        purchasePrice: parseFloat(formData.purchasePrice),
        source: formData.source
      } as any);

      success('Import Commited', 'Your portfolio is now being processed with the custom mapping.');
      setState('OVERVIEW');
      setFile(null);
      setInspectionData(null);
      setFormData({
        portfolioName: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: '0',
        source: ''
      });
    } catch (err) {
      toastError('Import Failed', 'Failed to execute the final import step.');
    }
  };

  if (state === 'MAPPING' && inspectionData) {
    return (
      <div className="space-y-4 animate-fade-in h-full flex flex-col -mt-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setState('OVERVIEW')} className="p-2 rounded-md hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ArrowLeft size={20} className="text-muted-foreground" /></button>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                <span>Ingestion Pipeline</span>
                <ChevronRight size={10} className="text-border" />
                <span className="text-muted-foreground">Schema Alignment</span>
              </div>
              <h1 className="text-xl font-bold text-foreground">Semantic Mapping</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mr-2">Step 2 of 4</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={cn("h-1 w-8 rounded-full", i <= 2 ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
          </div>
        </header>
        <div className="flex-1 min-h-0">
          <IngestionMapper
            headers={inspectionData.headers}
            previewRows={inspectionData.previewRows}
            onConfirm={handleExecuteImport}
            onCancel={() => setState('OVERVIEW')}
          />
        </div>
      </div>
    );
  }

  if (state === 'REPAIRING') {
    return (
      <div className="space-y-4 animate-fade-in h-full flex flex-col -mt-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setState('MAPPING')} className="p-2 rounded-md hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ArrowLeft size={20} className="text-muted-foreground" /></button>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                <span>Ingestion Pipeline</span>
                <ChevronRight size={10} className="text-border" />
                <span className="text-muted-foreground">Active Import</span>
              </div>
              <h1 className="text-xl font-bold text-foreground">Active Repair Shop</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mr-2">Step 3 of 4</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={cn("h-1 w-8 rounded-full", i <= 3 ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
          </div>
        </header>
        <div className="flex-1 min-h-0">
          <RepairShopGrid />
        </div>
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
            <span className="text-muted-foreground">Ingestion Center</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Data Ingestion</h1>
          <p className="text-sm font-medium text-muted-foreground">Transform creditor raw data into validated ledger entries.</p>
        </div>

        <button
          onClick={() => setState('UPLOADING')}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95"
        >
          <FileUp size={16} />
          New Portfolio Import
        </button>
      </header>

      {/* Realtime Invitation Active */}
      {activeInvitation && (
        <InvitationWave 
          batchId={activeInvitation.batchId}
          portfolioName={activeInvitation.name}
          total={activeInvitation.total}
          onDismiss={() => setActiveInvitation(null)}
        />
      )}

      {/* Ingestion Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-md">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Rows (30d)</div>
          <div className="mt-1 text-2xl font-bold font-mono text-foreground">
            {jobs.reduce((acc, j) => acc + (Number(j.totalRows) || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-md">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Automatic Match Rate</div>
          <div className="mt-1 text-2xl font-bold font-mono text-success">94.2%</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-md">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Jobs</div>
          <div className="mt-1 text-2xl font-bold font-mono text-primary">
            {jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PENDING').length}
          </div>
        </div>
      </div>

      {/* Active Work / History */}
      <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
        <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-tight">
            <History size={14} />
            Recent Activity
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Portfolio / Source</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Rows</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingJobs && jobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground font-medium">Loading import history...</span>
                    </div>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground text-xs italic">No import jobs found.</td>
                </tr>
              ) : (
                jobs.map((imp) => (
                  <tr key={imp.id} className="group hover:bg-muted transition-colors">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-foreground">{imp.portfolioName || 'Unnamed Portfolio'}</div>
                        <div className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-2">
                          <Clock size={10} /> {formatDistanceToNow(new Date(imp.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-mono font-bold text-muted-foreground">{(Number(imp.totalRows) || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset",
                        imp.status === 'COMPLETED' ? "bg-success/10 text-success ring-success/20" :
                        imp.status === 'PROCESSING' ? "bg-primary/10 text-primary ring-primary/20" :
                        imp.status === 'FAILED' ? "bg-error/10 text-error ring-error/20" :
                        "bg-muted text-muted-foreground ring-border"
                      )}>
                        {imp.status === 'COMPLETED' && <CheckCircle2 size={10} />}
                        {imp.status === 'FAILED' && <AlertCircle size={10} />}
                        {imp.status === 'PROCESSING' && <Loader2 size={10} className="animate-spin" />}
                        {imp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {imp.status === 'COMPLETED' && imp.portfolioId && (
                          <button
                            onClick={() => handleInviteDebtors(imp)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded bg-primary text-primary-foreground text-[10px] font-black uppercase hover:bg-primary-hover transition-colors shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            <Send size={12} />
                            Invite All
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedJobId(imp.id)}
                          className="text-[10px] font-bold text-muted-foreground hover:text-primary uppercase tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Job Detail Modal */}
      {selectedJobId && (
        <ImportJobDetailModal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
        />
      )}

      {/* Uploader Modal */}
      {state === 'UPLOADING' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-sidebar/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-card rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-border my-auto">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 p-3 text-primary flex items-center justify-center">
                  <FileUp size={24} />
                </div>
                <h3 className="text-xl font-bold text-foreground">Start New Ingestion</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">Provide portfolio metadata and upload your CSV file to begin.</p>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Portfolio Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Q4 2025 Retail Tranche"
                    value={formData.portfolioName}
                    onChange={(e) => setFormData({ ...formData, portfolioName: e.target.value })}
                    className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Purchase Date</label>
                  <input 
                    type="date" 
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Purchase Price (USD)</label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Data Source</label>
                  <input 
                    type="text" 
                    placeholder="e.g. JPMorgan Chase"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Upload Area */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".csv,.txt"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer group text-center space-y-2",
                  file ? "border-success bg-success/5" : "border-border bg-muted/30 hover:bg-muted/50"
                )}
              >
                {file ? (
                  <>
                    <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
                    <p className="text-sm font-bold text-foreground">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB - Click to change</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-foreground">Click to select CSV file</p>
                    <p className="text-xs text-muted-foreground">Standardized Verichron format (Max 50MB)</p>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setState('OVERVIEW')} 
                  disabled={isInspecting}
                  className="flex-1 px-4 py-3 text-sm font-bold text-foreground border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartInspection}
                  disabled={isInspecting || !file}
                  className="flex-1 px-4 py-3 text-sm font-bold text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                >
                  {isInspecting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Inspecting...
                    </>
                  ) : (
                    <>
                      Start Ingestion
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
