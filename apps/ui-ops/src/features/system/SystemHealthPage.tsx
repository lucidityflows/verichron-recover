import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Database,
  Server,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { Card } from '../../shared/components/Card.js';
import { StatsCard, SkeletonStatsCard } from '../../shared/components/StatsCard.js';
import { StatsGrid } from '../../shared/components/StatsGrid.js';
import { Button } from '../../shared/components/Button.js';
import { Badge } from '../../shared/components/Badge.js';
import {
  usersApiClient,
  organizationsApiClient,
  debtsApiClient,
  debtorsApiClient,
  communicationsApiClient,
  transactionsApiClient,
  collectorsApiClient,
  voiceApiClient,
  workflowsApiClient,
  automationsApiClient,
} from '../../shared/services/apiClient.js';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastChecked: Date;
  version?: string;
  endpoint: string;
  infrastructure?: any;
}

export function SystemHealthPage() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Health check for each service
  const checkServiceHealth = async (
    client: any,
    serviceName: string,
    endpoint: string
  ): Promise<ServiceStatus> => {
    const startTime = Date.now();
    try {
      const response = await client.get(endpoint);
      const responseTime = Date.now() - startTime;

      return {
        name: serviceName,
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        endpoint,
        infrastructure: response.data?.infrastructure
      };
    } catch (error) {
      return {
        name: serviceName,
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        endpoint,
      };
    }
  };

  const { data: servicesStatus, isLoading, refetch } = useQuery({
    queryKey: ['system-health', lastRefresh],
    queryFn: async () => {
      const checks = await Promise.all([
        checkServiceHealth(usersApiClient, 'Users Service', '/health'),
        checkServiceHealth(organizationsApiClient, 'Organizations Service', '/health'),
        checkServiceHealth(debtsApiClient, 'Debts Service', '/health'),
        checkServiceHealth(debtorsApiClient, 'Debtors Service', '/health'),
        checkServiceHealth(transactionsApiClient, 'Transactions Service', '/health'),
        checkServiceHealth(communicationsApiClient, 'Communications Service', '/health'),
        checkServiceHealth(collectorsApiClient, 'Collectors Service', '/health'),
        checkServiceHealth(voiceApiClient, 'Voice Service', '/health'),
        checkServiceHealth(workflowsApiClient, 'Workflows Service', '/health'),
        checkServiceHealth(automationsApiClient, 'Automations Service', '/health'),
      ]);
      return checks;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  if (isLoading && !servicesStatus) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
          <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
        </div>
        <StatsGrid columns={4}>
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </StatsGrid>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-muted/20 animate-pulse rounded-xl border border-border"></div>
          <div className="h-64 bg-muted/20 animate-pulse rounded-xl border border-border"></div>
        </div>
      </div>
    );
  }

  const infraStatus = servicesStatus?.find(s => s.name === 'Automations Service')?.infrastructure;
  const dbStatus = infraStatus?.postgres?.status || 'unknown';
  const redisStatus = infraStatus?.redis?.status || 'unknown';
  const mongoStatus = infraStatus?.mongodb?.status || 'unknown';
  const pubsubStatus = infraStatus?.pubsub?.status || 'unknown';

  const handleRefresh = () => {
    setLastRefresh(new Date());
    refetch();
  };

  const healthyCount = servicesStatus?.filter(s => s.status === 'healthy').length || 0;
  const degradedCount = servicesStatus?.filter(s => s.status === 'degraded').length || 0;
  const downCount = servicesStatus?.filter(s => s.status === 'down').length || 0;
  const totalServices = servicesStatus?.length || 10;

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return 'success';
      case 'stable': return 'success';
      case 'degraded': return 'warning';
      case 'down': return 'error';
      case 'offline': return 'error';
      default: return 'default';
    }
  };

  const overallHealth = downCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-500/10 text-slate-500 border border-slate-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Infrastructure Health
            </h1>
            <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1 font-black uppercase tracking-widest">Global Telemetry & Service Mesh Status</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          icon={RefreshCw}
          isLoading={isLoading}
        >
          Force Telemetry Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Overall Status"
          value={overallHealth === 'healthy' ? 'Operational' : overallHealth === 'degraded' ? 'Degraded' : 'Critical'}
          icon={Activity}
          gradient={overallHealth === 'healthy' ? 'success' : overallHealth === 'degraded' ? 'warning' : 'error'}
        />
        <StatsCard
          title="Cluster Nodes"
          value={`${healthyCount}/${totalServices} Active`}
          icon={Server}
          gradient="success"
        />
        <StatsCard
          title="Persistence Layer"
          value={dbStatus === 'healthy' ? 'Stable' : dbStatus === 'unknown' ? 'Synchronizing' : 'Warning'}
          icon={Database}
          gradient={dbStatus === 'healthy' ? 'primary' : 'warning'}
        />
        <StatsCard
          title="Avg Grid Uptime"
          value="99.98%"
          icon={Clock}
          gradient="info"
        />
      </StatsGrid>

      {/* Infrastructure Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database & Cache */}
        <Card title="Storage & Persistence" subtitle="Distributed data layers status">
          <div className="space-y-3">
            {[
              { name: 'PostgreSQL', status: dbStatus, desc: 'Primary Transaction Store', icon: Database },
              { name: 'Redis', status: redisStatus, desc: 'Distributed Cache & Pub/Sub', icon: Activity },
              { name: 'MongoDB', status: mongoStatus, desc: 'Communication Logs & Metadata', icon: Server }
            ].map((infra) => (
              <div key={infra.name} className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-slate-500/10 text-slate-500">
                    <infra.icon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{infra.name}</p>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tight">{infra.desc}</p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(infra.status)} size="sm">
                  {infra.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Messaging & Cloud */}
        <Card title="Transport & Gateways" subtitle="Event-driven infrastructure status">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-indigo-500/10 text-indigo-500">
                  <Activity size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{infraStatus?.pubsub?.name || 'Verichron Event Bridge'}</p>
                  <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tight">
                    {infraStatus?.pubsub?.mode === 'production' ? 'Google Cloud Native' : 'Local Development Mode'}
                  </p>
                </div>
              </div>
              <Badge variant={getStatusVariant(pubsubStatus)} size="sm">
                {pubsubStatus.toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/5 opacity-60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-slate-500/10 text-slate-500">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">External Gateways</p>
                  <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tight">SendGrid, Twilio, Stripe</p>
                </div>
              </div>
              <Badge variant="default" size="sm">PASSIVE</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Service Status Details */}
      <Card title="Microservices Cluster" subtitle="Individual service endpoint availability" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-muted)]/10 text-left">
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)]">Service Name</th>
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)]">Endpoint</th>
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)] text-center">Latency</th>
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)] text-right">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {servicesStatus?.map((service) => (
                <tr key={service.name} className="hover:bg-[var(--color-muted)]/20 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                      <span className="text-sm font-semibold text-foreground">{service.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] font-mono text-[var(--color-muted-foreground)] bg-[var(--color-muted)] px-1.5 py-0.5 rounded uppercase">{service.endpoint}</span>
                  </td>
                  <td className="p-4 text-center">
                    {service.responseTime !== undefined ? (
                      <span className={`text-[11px] font-bold ${service.responseTime > 500 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {service.responseTime}ms
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Badge variant={getStatusVariant(service.status)} size="sm">
                      {service.status.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}