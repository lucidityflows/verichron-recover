import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { StatsCard, SkeletonStatsCard } from '../../shared/components/StatsCard.js';
import { StatsGrid } from '../../shared/components/StatsGrid.js';
import { Card } from '../../shared/components/Card.js';
import { Badge } from '../../shared/components/Badge.js';
import { OrganizationStatus, OrganizationResponseDto } from '../../api/generated/organizations_models/index.js';
import {
  Building2,
  Users,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Plus,
  Mail,
  Search,
  Database,
  ShieldCheck
} from 'lucide-react';
import { userService } from '../../shared/services/userService.js';
import { organizationService } from '../../shared/services/organizationService.js';
import { useAuditsOpsControllerGetStats } from '../../api/generated/audits/endpoints/ops-audits/ops-audits.js';
import { getErrorMessage } from '../../shared/utils/errors.js';

export function Dashboard() {
  const navigate = useNavigate();
  // Fetch users
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.listUsers({ page: 1, pageSize: 100 }),
  });

  // Fetch organizations
  const { data: orgsData, isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationService.listOrganizations({ page: 1, pageSize: 100 }),
  });

  // Fetch audit system stats for health observability
  const { data: auditStatsResponse } = useAuditsOpsControllerGetStats();
  const auditStats = auditStatsResponse?.data;

  const isLoading = usersLoading || orgsLoading;
  const hasError = usersError || orgsError;

  // Calculate metrics
  const totalOrgs = orgsData?.data?.length || 0;
  const totalUsers = usersData?.total || 0;
  const activeOrgs = (orgsData?.data as unknown as OrganizationResponseDto[])?.filter((org: OrganizationResponseDto) => org.status === OrganizationStatus.ACTIVE).length || 0;
  const provisioningOrgs = (orgsData?.data as unknown as OrganizationResponseDto[])?.filter((org: OrganizationResponseDto) => org.status === OrganizationStatus.PROVISIONING).length || 0;

  const stats = [
    {
      title: 'Total Organizations',
      value: totalOrgs,
      icon: Building2,
      gradient: 'primary',
      trend: { value: `${activeOrgs} active`, positive: true },
    },
    {
      title: 'Platform Users',
      value: totalUsers,
      icon: Users,
      gradient: 'info',
    },
    {
      title: 'Active Organizations',
      value: activeOrgs,
      icon: CheckCircle,
      gradient: 'success',
      trend: { value: `${provisioningOrgs} provisioning`, positive: true },
    },
    {
      title: 'Audit Logs (Total)',
      value: auditStats?.metrics?.totalLogs || 0,
      icon: ShieldCheck,
      gradient: auditStats?.status === 'active' ? 'success' : 'warning',
      trend: { value: `Today: ${auditStats?.metrics?.logsToday || 0}`, positive: true },
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Platform Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-black">
            Real-time overview of your SaaS platform
          </p>
        </div>

        <StatsGrid columns={4}>
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </StatsGrid>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-error mx-auto" />
          <p className="text-error font-semibold">Failed to load dashboard data</p>
          <p className="text-muted-foreground text-sm">
            {getErrorMessage(usersError || orgsError, 'Unknown error')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Platform Dashboard
        </h1>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-black">
          Real-time overview of your SaaS platform
        </p>
      </div>

      {/* Stats Grid */}
      <StatsGrid columns={4}>
        {stats.map((stat) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            gradient={stat.gradient}
            trend={stat.trend}
          />
        ))}
      </StatsGrid>

      {/* Grid Layout for Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card title="Quick Actions" subtitle="Platform shortcuts" className="lg:col-span-1">
          <div className="space-y-2">
            <button
              onClick={() => navigate({ to: '/organizations', search: { action: 'create' } })}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-all text-left group"
            >
              <div className="p-2 rounded bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                <Plus size={16} />
              </div>
              <span className="text-sm font-medium text-foreground">New Organization</span>
            </button>
            <button
              onClick={() => navigate({ to: '/users', search: { action: 'invite' } })}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-all text-left group"
            >
              <div className="p-2 rounded bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <Mail size={16} />
              </div>
              <span className="text-sm font-medium text-foreground">Invite Administrator</span>
            </button>
            <button
              onClick={() => navigate({ to: '/organizations' })}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-all text-left group"
            >
              <div className="p-2 rounded bg-slate-500/10 text-slate-500 group-hover:bg-slate-500 group-hover:text-white transition-all">
                <Search size={16} />
              </div>
              <span className="text-sm font-medium text-foreground">Audit Trail Search</span>
            </button>
          </div>
        </Card>

        {/* System Health Status */}
        <Card title="System Infrastructure" subtitle="Service availability" className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity size={16} className={auditStats?.status === 'active' ? 'text-emerald-500' : 'text-amber-500'} />
                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">Audit Service</span>
                </div>
                <Badge variant={auditStats?.status === 'active' ? 'success' : 'warning'} size="sm">
                  {auditStats?.status === 'active' ? 'Operational' : 'Partial'}
                </Badge>
              </div>
              <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase">
                {auditStats?.mode || 'Immutable'} chain active; last log {auditStats?.metrics?.lastLogAt ? new Date(auditStats.metrics.lastLogAt).toLocaleTimeString() : 'N/A'}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database size={16} className={auditStats?.infrastructure?.database === 'connected' ? 'text-emerald-500' : 'text-red-500'} />
                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">PostgreSQL</span>
                </div>
                <Badge variant={auditStats?.infrastructure?.database === 'connected' ? 'success' : 'error'} size="sm">
                  {auditStats?.infrastructure?.database === 'connected' ? 'Connected' : 'Offline'}
                </Badge>
              </div>
              <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase">
                {auditStats?.infrastructure?.database === 'connected' ? 'Multi-tenant logical databases synchronized' : 'Connection pool exhausted or DB unreachable'}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className={auditStats?.infrastructure?.eventBridge === 'connected' ? 'text-emerald-500' : 'text-amber-500'} />
                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">Event Bridge</span>
                </div>
                <Badge variant={auditStats?.infrastructure?.eventBridge === 'connected' ? 'success' : 'warning'} size="sm">
                  {auditStats?.infrastructure?.eventBridge === 'connected' ? 'Active' : 'Local Mode'}
                </Badge>
              </div>
              <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase">
                {auditStats?.infrastructure?.eventBridge === 'connected' ? 'GCP Pub/Sub relay operational' : 'Pub/Sub emulator active for development context'}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" />
                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">Load Balancer</span>
                </div>
                <Badge variant="info" size="sm">Provisioned</Badge>
              </div>
              <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase">Global SSL termination active at edge</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}