import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { 
  MessageSquare, 
  Mail, 
  Eye, 
  Clock, 
  Building2, 
  User,
  LayoutTemplate,
  Send,
  Plus,
  Trash2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Card } from '../../shared/components/Card.js';
import { FilterBar } from '../../shared/components/FilterBar.js';
import { Badge, StatusBadge } from '../../shared/components/Badge.js';
import { VirtualTable, Column } from '../../shared/components/VirtualTable.js';
import { Button } from '../../shared/components/Button.js';
import { Select } from '../../shared/components/Select.js';
import { 
  useCommunicationsOpsControllerFindAllLogs,
} from '../../api/generated/communications/endpoints/ops-communications/ops-communications.js';
import { 
  useTemplatesControllerFindAll 
} from '../../api/generated/communications/endpoints/communication-templates/communication-templates.js';
import { CommunicationLog, CommunicationStatus, CommunicationType, Template } from '../../api/generated/communications_models/index.js';
import { organizationService } from '../../shared/services/organizationService.js';
import { useSandboxOpsControllerDispatch } from '../../api/generated/communications/endpoints/ops-sandbox/ops-sandbox.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../shared/utils/errors.js';
import { cn } from '../../shared/utils/cn.js';
import { format } from 'date-fns';
import { CreateTemplateForm } from './components/CreateTemplateForm.js';

export function CommunicationsHubPage() {
  const navigate = useNavigate({ from: '/communications' });
  const { tab: currentTab = 'logs' } = useSearch({ from: '/communications' }) as { tab?: string };
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | CommunicationType>('');
  const [statusFilter, setStatusFilter] = useState<'' | CommunicationStatus>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Compose State
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // 1. Logs Data
  const { data: logsResponse, isLoading: isLogsLoading } = useCommunicationsOpsControllerFindAllLogs({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  }, {
    query: {
      enabled: currentTab === 'logs'
    }
  });

  const logs = logsResponse?.data || [];

  // 2. Templates Data (System Scoped - SYSTEM org templates)
  const { data: templatesResponse, isLoading: isTemplatesLoading } = useTemplatesControllerFindAll('SYSTEM', {
    isActive: true
  }, {
    query: {
      enabled: currentTab === 'templates' || currentTab === 'compose'
    }
  });

  const templates: Template[] = templatesResponse?.data ?? [];

  // 3. Organizations for Compose Tab
  const { data: orgsResponse } = useQuery({
    queryKey: ['organizations-list-simple'],
    queryFn: () => organizationService.listOrganizations({ page: 1, pageSize: 100 }),
    enabled: currentTab === 'compose'
  });

  // 4. Dispatch Mutation
  const dispatchMutation = useSandboxOpsControllerDispatch({
    mutation: {
      onSuccess: () => {
        toast.success('Platform dispatch initiated successfully');
        queryClient.invalidateQueries({ queryKey: ['global-dispatch-logs'] });
        setSelectedOrgId('');
        setSelectedTemplate('');
      },
      onError: (error: any) => {
        toast.error('Dispatch failed', { description: getErrorMessage(error) });
      }
    }
  });

  const handleDispatch = () => {
    if (!selectedOrgId || !selectedTemplate) {
      toast.error('Missing configuration', { description: 'Please select a recipient tenant and blueprint.' });
      return;
    }

    const template = templates.find((t) => t.name === selectedTemplate);
    
    dispatchMutation.mutate({
      data: {
        organizationId: selectedOrgId,
        method: template?.type === 'EMAIL' ? 'EMAIL' : 'SMS',
        templateName: selectedTemplate,
        to: 'ADMIN_DEFAULT', // Placeholder for "send to org admin" logic in sandbox
        context: {
          subject: template?.subject || 'Platform Notice',
          platform_notice: true
        }
      }
    });
  };

  const filteredLogs = logs.filter((log) => 
    log.debtorId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.organizationId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.content?.subject || '').toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const logColumns: Column<CommunicationLog>[] = [
    {
      key: 'sentAt',
      header: 'Timestamp',
      width: 180,
      render: (log) => (
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
          <span className="text-sm font-semibold text-foreground">
            {log.sentAt ? format(new Date(log.sentAt), 'MMM d, HH:mm') : 'Pending'}
          </span>
        </div>
      )
    },
    {
      key: 'organizationId',
      header: 'Tenant',
      width: 150,
      render: (log) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-indigo-500/60" />
          <span className="text-[11px] font-mono text-[var(--color-muted-foreground)] truncate" title={log.organizationId}>
            {log.organizationId.split('-')[0]}...
          </span>
        </div>
      )
    },
    {
      key: 'debtorId',
      header: 'Recipient',
      width: 150,
      render: (log) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[var(--color-muted)] flex items-center justify-center">
            <User className="w-3 h-3 text-[var(--color-muted-foreground)]" />
          </div>
          <span className="text-[11px] font-mono text-[var(--color-muted-foreground)] truncate">
            {log.debtorId.split('-')[0]}...
          </span>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Channel',
      width: 100,
      render: (log) => (
        <Badge variant="outline" size="sm" icon={log.type === 'EMAIL' ? <Mail size={10} /> : <MessageSquare size={10} />}>
          {log.type}
        </Badge>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (log) => <StatusBadge status={log.status} variant="outlined" />
    },
    {
      key: 'actions',
      header: '',
      width: 60,
      className: 'justify-end',
      render: () => (
        <Button variant="ghost" size="sm">
          <Eye size={14} />
        </Button>
      )
    }
  ];

  const templateColumns: Column<any>[] = [
    {
      key: 'name',
      header: 'Template Name',
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-indigo-500/10 text-indigo-500">
            <FileText size={16} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">{t.name}</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-widest font-black">System Default</p>
          </div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Channel',
      width: 100,
      render: (t) => <Badge variant="outline" size="sm">{t.type}</Badge>
    },
    {
      key: 'version',
      header: 'v.',
      width: 60,
      render: (t) => <span className="text-[11px] font-mono font-bold text-[var(--color-muted-foreground)]">v{t.version}</span>
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      width: 150,
      render: (t) => <span className="text-sm text-[var(--color-muted-foreground)]">{format(new Date(t.updatedAt), 'MMM d, yyyy')}</span>
    },
    {
      key: 'actions',
      header: '',
      width: 100,
      className: 'justify-end',
      render: () => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm">
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="sm" className="hover:text-red-500">
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ];

  const tabs = [
    { id: 'logs', name: 'Global Dispatch Log', icon: Clock },
    { id: 'templates', name: 'Platform Blueprints', icon: LayoutTemplate },
    { id: 'compose', name: 'Manual Outreach', icon: Send },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Dispatch Communications
            </h1>
            <p className="text-[10px] text-[var(--color-muted-foreground)] font-black uppercase tracking-widest mt-1">Platform Delivery & Blueprint Management</p>
          </div>
        </div>
        {currentTab === 'templates' && (
          <Button 
            variant="primary" 
            size="sm" 
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Blueprint
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
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
      <div className="duration-500 min-h-[600px]">
        {currentTab === 'logs' && (
          <Card className="h-[calc(100vh-280px)] flex flex-col p-0 overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
              <FilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search by ID or Subject..."
                filters={[
                  {
                    label: 'Channel',
                    value: typeFilter,
                    options: [
                      { label: 'All Channels', value: '' },
                      { label: 'Email', value: 'EMAIL' },
                      { label: 'SMS', value: 'SMS' },
                    ],
                    onChange: (value) => setTypeFilter((value as CommunicationType) || ''),
                  },
                  {
                    label: 'Status',
                    value: statusFilter,
                    options: [
                      { label: 'All Statuses', value: '' },
                      { label: 'Sent', value: 'SENT' },
                      { label: 'Delivered', value: 'DELIVERED' },
                      { label: 'Failed', value: 'FAILED' },
                      { label: 'Blocked', value: 'BLOCKED' },
                    ],
                    onChange: (value) => setStatusFilter((value as CommunicationStatus) || ''),
                  }
                ]}
              />
            </div>
            <VirtualTable
              data={filteredLogs}
              columns={logColumns}
              isLoading={isLogsLoading}
              getRowKey={(item) => String(item._id)}
              className="border-0 rounded-none flex-1"
              height="100%"
              emptyState={{
                icon: MessageSquare,
                title: 'No dispatches found',
                description: 'Try adjusting your search or filters'
              }}
            />
          </Card>
        )}

        {currentTab === 'templates' && (
          <Card className="h-[calc(100vh-280px)] flex flex-col p-0 overflow-hidden">
            <VirtualTable
              data={templates}
              columns={templateColumns}
              isLoading={isTemplatesLoading}
              getRowKey={(item) => item.id}
              className="border-0 rounded-none flex-1"
              height="100%"
              emptyState={{
                icon: LayoutTemplate,
                title: 'No platform blueprints',
                description: 'Create system templates for outreach to organization admins.'
              }}
            />
          </Card>
        )}

        {currentTab === 'compose' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card title="New Outreach Dispatch" subtitle="Manual platform-level messaging">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Target Recipient Group</label>
                  <div className="flex gap-2">
                    <Select
                      className="flex-1"
                      placeholder="Select Tenant..."
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      options={orgsResponse?.data?.map((org: any) => ({ label: org.name, value: org.id })) || []}
                    />
                    <Button variant="outline" size="sm">Select All</Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Message Blueprint</label>
                  <Select
                    placeholder="Select blueprint..."
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    options={templates.map((t) => ({ label: t.displayName, value: t.name }))}
                  />
                </div>

                <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                  <div className="flex items-center gap-2 text-indigo-500 mb-2">
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Protocol Warning</span>
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                    Manual dispatches from this terminal bypass standard tenant compliance rules and utilize the platform's primary secure identity.
                  </p>
                </div>

                <Button 
                  variant="primary" 
                  className="w-full" 
                  icon={Send}
                  onClick={handleDispatch}
                  isLoading={dispatchMutation.isPending}
                >
                  Initiate Dispatch
                </Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card title="Real-time Preview" className="opacity-50">
                <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-[var(--color-border)] rounded-xl">
                  <Eye className="w-10 h-10 text-[var(--color-muted-foreground)] mb-3 opacity-20" />
                  <p className="text-xs text-[var(--color-muted-foreground)] font-black uppercase tracking-widest">Awaiting Selection</p>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      <CreateTemplateForm 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
