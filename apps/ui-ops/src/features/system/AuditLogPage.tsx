import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  Shield,
  Clock,
  User,
  Tag,
  Eye,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Database,
  Activity,
} from 'lucide-react';
import { Card } from '../../shared/components/Card.js';
import { FilterBar } from '../../shared/components/FilterBar.js';
import { Badge } from '../../shared/components/Badge.js';
import { VirtualTable, Column } from '../../shared/components/VirtualTable.js';
import { Button } from '../../shared/components/Button.js';
import {
  useAuditsOpsControllerFindPlatformLogs,
  useAuditsOpsControllerGetStats,
} from '../../api/generated/audits/endpoints/ops-audits/ops-audits.js';
import type { AuditLogResponseDto } from '../../api/generated/audits_models/auditLogResponseDto.js';
import { format } from 'date-fns';

const getActorValue = (snapshot: unknown, key: string): string | undefined => {
  if (!snapshot || typeof snapshot !== 'object') return undefined;
  const value = (snapshot as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
};

const getMetadataValue = (metadata: unknown, keys: string[]): string | undefined => {
  if (!metadata || typeof metadata !== 'object') return undefined;
  for (const key of keys) {
    const value = (metadata as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
};

export function AuditLogPage() {
  const navigate = useNavigate({ from: '/audits' });
  const search = useSearch({ from: '/audits' });
  const searchQuery = search.q ?? '';
  const actionFilter = search.action ?? '';
  const targetTypeFilter = search.targetType ?? '';
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 50;
  const [selectedLog, setSelectedLog] = useState<AuditLogResponseDto | null>(null);

  const updateSearch = (
    patch: Partial<{
      q?: string;
      action?: string;
      targetType?: string;
      page?: number;
      pageSize?: number;
    }>,
  ) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
      }),
      replace: true,
    });
  };

  const { data: response, isLoading } = useAuditsOpsControllerFindPlatformLogs({
    action: actionFilter || undefined,
    targetType: targetTypeFilter || undefined,
    search: searchQuery || undefined,
    page,
    pageSize,
  });
  const { data: statsResponse } = useAuditsOpsControllerGetStats();

  const logs = response?.data?.data ?? [];
  const total = response?.data?.total ?? 0;
  const totalPages = response?.data?.totalPages ?? 1;
  const currentPage = response?.data?.page ?? page;
  const stats = statsResponse?.data?.metrics;

  const columns: Column<AuditLogResponseDto>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      width: 180,
      render: (log) => (
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
          <span className="text-sm font-semibold text-foreground">
            {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
          </span>
        </div>
      )
    },
    {
      key: 'userId',
      header: 'System Actor',
      width: 180,
      render: (log) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center">
            <User className="w-3 h-3 text-indigo-500" />
          </div>
          <span
            className="text-xs font-mono text-[var(--color-muted-foreground)]"
            title={String(getActorValue(log.actorSnapshot, 'id') ?? 'system')}
          >
            {String(getActorValue(log.actorSnapshot, 'name') ?? getActorValue(log.actorSnapshot, 'email') ?? 'System')}
          </span>
        </div>
      )
    },
    {
      key: 'action',
      header: 'Action',
      width: 160,
      render: (log) => {
        let variant: 'default' | 'success' | 'info' | 'error' = 'default';
        if (log.action.includes('CREATED') || log.action.includes('ADDED')) variant = 'success';
        if (log.action.includes('UPDATED') || log.action.includes('CHANGED')) variant = 'info';
        if (log.action.includes('DELETED') || log.action.includes('REMOVED')) variant = 'error';
        return <Badge variant={variant} size="sm">{log.action}</Badge>;
      }
    },
    {
      key: 'entityName',
      header: 'Target Entity',
      width: 150,
      render: (log) => (
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground uppercase tracking-tight">{log.targetType}</span>
            <span className="text-[10px] font-mono text-[var(--color-muted-foreground)]">
              {String(log.targetId).slice(0, 10)}...
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'context',
      header: 'Context',
      render: (log) => (
        <span className="text-xs text-[var(--color-muted-foreground)] font-medium truncate">
          {getMetadataValue(log.metadata, ['reason', 'reasonCode', 'eventType', 'correlationId']) ?? '—'}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      width: 60,
      className: 'justify-end',
      render: (log) => (
        <Button variant="ghost" size="sm" onClick={(event) => {
          event.stopPropagation();
          setSelectedLog(log);
        }}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-500/10 text-slate-500 border border-slate-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Global Audit Trail</h1>
            <p className="text-[10px] text-[var(--color-muted-foreground)] font-black uppercase tracking-widest mt-1">Immutable Security Telemetry</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (logs.length === 0) return;
              const rows = logs.map((log) => ({
                id: log.id,
                createdAt: log.createdAt,
                action: log.action,
                targetType: log.targetType,
                targetId: log.targetId,
                actorName: getActorValue(log.actorSnapshot, 'name') ?? '',
                actorEmail: getActorValue(log.actorSnapshot, 'email') ?? '',
                eventId: log.eventId,
              }));
              const header = Object.keys(rows[0]).join(',');
              const body = rows
                .map((row) =>
                  Object.values(row)
                    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
                    .join(','),
                )
                .join('\n');
              const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = `platform-audits-page-${currentPage}.csv`;
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">
            <Database className="w-3.5 h-3.5" />
            Total Logs
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{stats?.totalLogs ?? total}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">
            <Activity className="w-3.5 h-3.5" />
            Logs Today
          </div>
          <p className="text-xl font-bold text-foreground mt-1">
            {stats?.logsToday ?? 'N/A'}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">
            <Shield className="w-3.5 h-3.5" />
            Active Filters
          </div>
          <p className="text-xl font-bold text-foreground mt-1">
            {[actionFilter, targetTypeFilter, searchQuery].filter(Boolean).length}
          </p>
        </Card>
      </div>

      <Card variant="default" className="h-[calc(100vh-250px)] flex flex-col p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={(value) => {
              updateSearch({
                q: value || undefined,
                page: 1,
              });
            }}
            onSearchClear={() => {
              updateSearch({
                q: undefined,
                page: 1,
              });
            }}
            filters={[
              {
                label: 'Action',
                value: actionFilter,
                options: [
                  { label: 'All Actions', value: '' },
                  { label: 'Created', value: 'ORGANIZATION.CREATED' },
                  { label: 'Activated', value: 'ORGANIZATION.ACTIVATED' },
                  { label: 'Updated', value: 'ORGANIZATION.UPDATED' },
                  { label: 'Settings Updated', value: 'ORGANIZATION.SETTINGS_UPDATED' },
                  { label: 'Team Created', value: 'TEAM.CREATED' },
                ],
                onChange: (value) => {
                  updateSearch({
                    action: value || undefined,
                    page: 1,
                  });
                },
              },
              {
                label: 'Entity',
                value: targetTypeFilter,
                options: [
                  { label: 'All Entities', value: '' },
                  { label: 'Organization', value: 'ORGANIZATION' },
                  { label: 'Team', value: 'TEAM' },
                  { label: 'Portfolio', value: 'PORTFOLIO' },
                ],
                onChange: (value) => {
                  updateSearch({
                    targetType: value || undefined,
                    page: 1,
                  });
                },
              }
            ]}
            actions={(
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                  {total} records
                </span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    updateSearch({
                      pageSize: Number(event.target.value),
                      page: 1,
                    });
                  }}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-xs"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          />
        </div>

        <VirtualTable
          data={logs}
          columns={columns}
          isLoading={isLoading}
          getRowKey={(item) => item.id}
          onRowClick={(log) => setSelectedLog(log)}
          className="border-0 rounded-none flex-1"
          height="100%"
          emptyState={{
            icon: ShieldAlert,
            title: 'No audit logs found',
            description: 'Try adjusting your search or filters'
          }}
        />
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--color-muted-foreground)]">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateSearch({ page: Math.max(1, currentPage - 1) })}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateSearch({ page: Math.min(totalPages, currentPage + 1) })}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {selectedLog && (
        <Card
          title="Audit Record Detail"
          subtitle={`${selectedLog.action} • ${selectedLog.id}`}
          headerAction={(
            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          )}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <p><span className="font-bold">Target:</span> {selectedLog.targetType} / {selectedLog.targetId}</p>
              <p><span className="font-bold">Actor:</span> {getActorValue(selectedLog.actorSnapshot, 'name') ?? 'System'}</p>
              <p><span className="font-bold">Created:</span> {format(new Date(selectedLog.createdAt), 'PPpp')}</p>
              <p><span className="font-bold">Event ID:</span> <span className="font-mono">{selectedLog.eventId}</span></p>
            </div>
            <div className="space-y-2">
              <p className="font-bold">Changes</p>
              <pre className="rounded bg-[var(--color-muted)] p-3 overflow-x-auto text-[10px]">
                {JSON.stringify(selectedLog.changes ?? {}, null, 2)}
              </pre>
              <p className="font-bold">Metadata</p>
              <pre className="rounded bg-[var(--color-muted)] p-3 overflow-x-auto text-[10px]">
                {JSON.stringify(selectedLog.metadata ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
