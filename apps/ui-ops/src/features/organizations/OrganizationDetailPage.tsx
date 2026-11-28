import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useSearch } from '@tanstack/react-router';
import { organizationService } from '../../shared/services/organizationService.js';
import { 
  Building2, 
  ArrowLeft, 
  ShieldAlert, 
  FileStack, 
  Settings2, 
  Info,
  Tag,
  Hash,
  Calendar,
  Layers,
  DollarSign,
  Activity,
  AlertTriangle,
  Terminal,
  Fingerprint,
  User
} from 'lucide-react';
import { Card } from '../../shared/components/Card.js';
import { Button } from '../../shared/components/Button.js';
import { Badge, StatusBadge } from '../../shared/components/Badge.js';
import { VirtualTable, Column } from '../../shared/components/VirtualTable.js';
import { getErrorMessage } from '../../shared/utils/errors.js';
import { cn } from '../../shared/utils/cn.js';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { OrganizationStatus } from '../../api/generated/organizations_models/index.js';
import { AuditLogResponseDto } from '../../api/generated/audits_models/index.js';
import { useAuditsControllerFindAll } from '../../api/generated/audits/endpoints/audits/audits.js';
import { AuditIntegrityCard } from './components/AuditIntegrityCard.js';
import { portfolioService } from '../../shared/services/portfolioService.js';
import { settingsService } from '../../shared/services/settingsService.js';
import { auditsOpsControllerVerifyChain } from '../../api/generated/audits/endpoints/ops-audits/ops-audits.js';

const getActorField = (snapshot: unknown, key: string): string | undefined => {
  if (!snapshot || typeof snapshot !== 'object') {
    return undefined;
  }
  const value = (snapshot as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
};

const getChangePair = (changes: unknown, key: string): { old?: unknown; new?: unknown } | undefined => {
  if (!changes || typeof changes !== 'object') {
    return undefined;
  }
  const value = (changes as Record<string, unknown>)[key];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as { old?: unknown; new?: unknown };
};

export function OrganizationDetailPage() {
  const { organizationId } = useParams({ from: '/organizations/$organizationId' });
  const navigate = useNavigate({ from: '/organizations/$organizationId' });
  const { tab: currentTab = 'overview' } = useSearch({ from: '/organizations/$organizationId' }) as { tab?: string };
  const queryClient = useQueryClient();
  
  const { data: org, isLoading: isOrgLoading } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => organizationService.getOrganizationById(organizationId),
  });

  const { data: auditResponse, isLoading: isLogsLoading } = useAuditsControllerFindAll(
    organizationId,
    { pageSize: 100 },
    {
      query: {
        enabled: currentTab === 'audits'
      }
    }
  );

  const logs = auditResponse?.data?.data;

  const { data: portfolios, isLoading: isPortfoliosLoading } = useQuery({
    queryKey: ['org-portfolios', organizationId],
    queryFn: () =>
      portfolioService.listPortfolios(organizationId, {
        page: 1,
        pageSize: 50,
      } as any),
  });

  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['org-settings', organizationId],
    queryFn: () => settingsService.getSettings(organizationId),
    enabled: currentTab === 'integrations'
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      return organizationService.updateOrganization(organizationId, {
        status: org?.status === OrganizationStatus.SUSPENDED ? OrganizationStatus.ACTIVE : OrganizationStatus.SUSPENDED
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      toast.success(org?.status === OrganizationStatus.SUSPENDED ? 'Tenant Reactivated' : 'Tenant Suspended');
    },
    onError: (error) => {
      toast.error('Operation failed', { description: getErrorMessage(error) });
    }
  });

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Info },
    { id: 'audits', name: 'Audit Trail', icon: ShieldAlert },
    { id: 'imports', name: 'Import History', icon: FileStack },
    { id: 'integrations', name: 'Integrations', icon: Settings2 },
  ];

  const auditColumns: Column<AuditLogResponseDto>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      width: 160,
      render: (log) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
          </span>
          <span className="text-[10px] text-[var(--color-muted-foreground)] font-mono">
            {log.id.substring(0, 8)}
          </span>
        </div>
      )
    },
    {
      key: 'action',
      header: 'Action',
      width: 180,
      render: (log) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={log.action} variant="outlined" />
          <div className="flex items-center gap-1 opacity-60">
            <Tag className="w-2.5 h-2.5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">{log.targetType}</span>
          </div>
        </div>
      )
    },
    {
      key: 'actor',
      header: 'Actor',
      width: 200,
      render: (log) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground truncate max-w-[140px]">{getActorField(log.actorSnapshot, 'name') || 'SYSTEM'}</span>
            <span className="text-[9px] text-[var(--color-muted-foreground)] font-medium uppercase">{getActorField(log.actorSnapshot, 'role') || 'SYSTEM'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'integrity',
      header: 'Integrity',
      width: 120,
      render: (log) => (
        <div className="flex items-center gap-1.5 group cursor-help">
          <div className={cn(
            "w-2 h-2 rounded-full",
            log.prevHash ? "bg-emerald-500" : "bg-blue-500"
          )} />
          <span className="text-[10px] font-mono text-[var(--color-muted-foreground)] group-hover:text-foreground transition-colors">
            {log.prevHash ? 'CHAINED' : 'GENESIS'}
          </span>
          <Fingerprint className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
        </div>
      )
    },
    {
      key: 'details',
      header: 'Changes',
      render: (log) => (
        <div className="flex gap-2 flex-wrap">
          {log.changes && Object.keys(log.changes).map((key) => {
            const change = getChangePair(log.changes, key);
            return (
              <Badge key={key} variant="outline" size="sm" className="bg-slate-500/5 text-[9px]">
                {key}: {String(change?.old)} → {String(change?.new)}
              </Badge>
            );
          })}
          {!log.changes && <span className="text-[10px] text-[var(--color-muted-foreground)] italic">System invariant</span>}
        </div>
      )
    }
  ];

  const portfolioColumns: Column<any>[] = [
    {
      key: 'name',
      header: 'Portfolio Name',
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-foreground">{p.name}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (p) => <StatusBadge status={p.status || 'ACTIVE'} />
    },
    {
      key: 'value',
      header: 'Total Value',
      width: 150,
      render: (p) => (
        <div className="flex items-center gap-1.5 font-mono text-emerald-500 font-bold text-sm">
          <DollarSign className="w-3.5 h-3.5" />
          {Number(p.totalValue || 0).toLocaleString()}
        </div>
      )
    },
    {
      key: 'createdAt',
      header: 'Imported At',
      width: 150,
      render: (p) => <span className="text-sm text-[var(--color-muted-foreground)]">{format(new Date(p.createdAt), 'MMM d, yyyy')}</span>
    }
  ];

  if (isOrgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--color-border)] border-t-indigo-600"></div>
          <p className="text-[var(--color-muted-foreground)] text-[10px] font-black uppercase tracking-widest">Accessing Tenant Registry...</p>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-24">
        <div className="p-4 rounded-full bg-[var(--color-muted)] w-fit mx-auto mb-4">
          <Building2 className="w-8 h-8 text-[var(--color-muted-foreground)]" />
        </div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Organization not found</h3>
        <Button onClick={() => navigate({ to: '/organizations' })} variant="ghost" size="sm" className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Registry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate({ to: '/organizations' })}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          Back to Terminal
        </button>
        <div className="flex gap-2">
          <Button 
            variant={org.status === OrganizationStatus.SUSPENDED ? "primary" : "danger"} 
            size="sm"
            onClick={() => suspendMutation.mutate()}
            isLoading={suspendMutation.isPending}
            icon={org.status === OrganizationStatus.SUSPENDED ? Activity : AlertTriangle}
          >
            {org.status === OrganizationStatus.SUSPENDED ? 'Execute Reactivation' : 'Suspend Tenant'}
          </Button>
          <Button variant="outline" size="sm">Modify Policy</Button>
        </div>
      </div>

      {/* Profile Header */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-start gap-6 p-6">
          <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-inner border border-white/10">
            {org.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">{org.name}</h1>
              <StatusBadge status={org.status} variant="outlined" />
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1 font-bold uppercase tracking-tight">{org.displayName || 'GENERIC IDENTITY'}</p>
            <div className="flex gap-6 mt-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                <Hash className="w-3 h-3 opacity-50" />
                ID: <span className="font-mono text-foreground">{org.id}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                <Calendar className="w-3 h-3 opacity-50" />
                ESTABLISHED: <span className="text-foreground">{format(new Date(org.createdAt), 'MMM yyyy')}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex p-1 bg-[var(--color-muted)]/30 rounded-xl w-fit border border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate({ search: (prev: any) => ({ ...prev, tab: tab.id }) })}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-tight transition-all duration-200",
              currentTab === tab.id
                ? "bg-[var(--color-card)] text-indigo-500 shadow-sm ring-1 ring-[var(--color-border)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card)]/50"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="duration-500 min-h-[500px]">
        {currentTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Operational Performance" className="lg:col-span-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                  <p className="text-[10px] text-indigo-500/60 uppercase font-black tracking-widest">Asset Count</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{portfolios?.total ?? (isPortfoliosLoading ? '...' : '0')}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[10px] text-emerald-500/60 uppercase font-black tracking-widest">Health Score</p>
                  <p className="text-2xl font-bold text-foreground mt-1">98%</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <p className="text-[10px] text-blue-500/60 uppercase font-black tracking-widest">Provisioning</p>
                  <p className="text-2xl font-bold text-foreground mt-1 uppercase">ENTERPRISE</p>
                </div>
              </div>
            </Card>
            <AuditIntegrityCard organizationId={organizationId} />
            <Card title="Tenant Profile">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                  <span className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Fiscal ID</span>
                  <span className="text-xs font-mono font-bold text-foreground">{org.taxId || 'NOT PROVIDED'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]">
                  <span className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Market Type</span>
                  <Badge variant="outline" size="sm">{org.organizationType}</Badge>
                </div>
              </div>
            </Card>
          </div>
        )}

        {currentTab === 'audits' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[var(--color-muted)]/20 p-4 rounded-xl border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Fingerprint size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-tight">Immutable Record Ledger</p>
                  <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase">SHA-256 Hash Chain Integrity Verification</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                icon={Fingerprint}
                onClick={() => {
                  toast.promise(auditsOpsControllerVerifyChain(organizationId), {
                    loading: 'Executing Forensic Chain Analysis...',
                    success: (res) => {
                      return res.data?.valid ? 'Chain Integrity Verified: Intact' : 'Warning: Chain Integrity compromised';
                    },
                    error: 'Verification Protocol Failed'
                  });
                }}
              >
                Execute Forensic Audit
              </Button>
            </div>

            <VirtualTable
              data={logs || []}
              columns={auditColumns}
              isLoading={isLogsLoading}
              getRowKey={(item) => item.id}
              height="600px"
              emptyState={{
                icon: ShieldAlert,
                title: 'Empty Audit Log',
                description: 'This tenant has no recorded immutable system actions.'
              }}
            />
          </div>
        )}

        {currentTab === 'imports' && (
          <VirtualTable
            data={portfolios?.data || []}
            columns={portfolioColumns}
            isLoading={isPortfoliosLoading}
            getRowKey={(item) => item.id}
            height="600px"
            emptyState={{
              icon: FileStack,
              title: 'No Import History',
              description: 'Zero debt portfolio synchronization events detected for this identity.'
            }}
          />
        )}

        {currentTab === 'integrations' && (
          <div className="space-y-6">
            <Card 
              title="System Configuration Kernel" 
              subtitle="JSONB environment state"
              headerAction={<Badge variant="warning" size="sm" icon={<Terminal size={8}/>}>SYSOPS_READ_ONLY</Badge>}
            >
              <div className="mt-2">
                {isSettingsLoading ? (
                  <div className="h-32 animate-pulse bg-[var(--color-muted)]/20 rounded-lg" />
                ) : (
                  <pre className="p-6 bg-slate-950 text-indigo-400 rounded-xl font-mono text-xs overflow-x-auto border border-white/5 shadow-2xl">
                    {JSON.stringify(settings || org.settings, null, 2)}
                  </pre>
                )}
              </div>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Authorized Connectivity">
                <div className="flex items-center justify-between p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight text-foreground">Restricted Rotation</p>
                      <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase">X-API-KEY regeneration requires Level 3 auth</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Initiate</Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}