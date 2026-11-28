import { useQuery } from '@tanstack/react-query';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { organizationService } from '../../shared/services/organizationService.js';
import { Building2, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { Card } from '../../shared/components/Card.js';
import { StatusBadge } from '../../shared/components/Badge.js';
import { StatsCard } from '../../shared/components/StatsCard.js';
import { StatsGrid } from '../../shared/components/StatsGrid.js';
import { FilterBar } from '../../shared/components/FilterBar.js';
import { Button } from '../../shared/components/Button.js';
import { SelectOption } from '../../shared/components/Select.js';
import { VirtualTable, Column } from '../../shared/components/VirtualTable.js';
import { useState, useEffect } from 'react';
import { OrganizationStatus, OrganizationResponseDto } from '../../api/generated/organizations_models/index.js';
import { CreateOrganizationForm } from './components/CreateOrganizationForm.js';
import { EditOrganizationForm } from './components/EditOrganizationForm.js';

export function Organizations() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/organizations' }) as { action?: string };
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrganizationStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationResponseDto | null>(null);

  // Open create modal if action=create in URL
  useEffect(() => {
    if (search.action === 'create') {
      setIsCreateModalOpen(true);
      // Clear the search param after opening modal
      navigate({ to: '/organizations', search: undefined, replace: true });
    }
  }, [search.action, navigate]);

  const { data: orgsData, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationService.listOrganizations({ page: 1, pageSize: 100 }),
  });

  const organizations: OrganizationResponseDto[] = (orgsData?.data as unknown as OrganizationResponseDto[]) || [];
  const filteredOrgs = organizations.filter((org: OrganizationResponseDto) => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    total: organizations.length,
    active: organizations.filter((o: OrganizationResponseDto) => o.status === OrganizationStatus.ACTIVE).length,
    provisioning: organizations.filter((o: OrganizationResponseDto) => o.status === OrganizationStatus.PROVISIONING).length,
    suspended: organizations.filter((o: OrganizationResponseDto) => o.status === OrganizationStatus.SUSPENDED).length,
  };

  const getStatusIcon = (status: OrganizationStatus) => {
    switch (status) {
      case OrganizationStatus.ACTIVE:
        return <CheckCircle className="w-5 h-5" />;
      case OrganizationStatus.PROVISIONING:
        return <Clock className="w-5 h-5" />;
      case OrganizationStatus.SUSPENDED:
        return <XCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const statusFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All Statuses' },
    { value: OrganizationStatus.ACTIVE, label: 'Active' },
    { value: OrganizationStatus.PROVISIONING, label: 'Provisioning' },
    { value: OrganizationStatus.SUSPENDED, label: 'Suspended' },
    { value: OrganizationStatus.INACTIVE, label: 'Inactive' },
  ];

  const columns: Column<OrganizationResponseDto>[] = [
    {
      key: 'name',
      header: 'Organization',
      render: (org) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-foreground)] font-bold text-xs border border-[var(--color-border)]">
            {org.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{org.name}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">ID: {org.id.substring(0, 8)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 150,
      render: (org) => (
        <StatusBadge status={org.status} variant="outlined" />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      width: 150,
      render: (org) => (
        <span className="text-sm text-foreground">
          {new Date(org.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 150,
      className: 'justify-end',
      render: (org) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/organizations/$organizationId', params: { organizationId: org.id } })}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingOrg(org)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Organizations
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Manage client organizations and their settings</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          icon={Plus}
          size="sm"
        >
          New Organization
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="flex-shrink-0">
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Organizations"
            value={statusCounts.total}
            icon={Building2}
            gradient="primary"
          />
          <StatsCard
            title="Active"
            value={statusCounts.active}
            icon={CheckCircle}
            gradient="success"
          />
          <StatsCard
            title="Provisioning"
            value={statusCounts.provisioning}
            icon={Clock}
            gradient="warning"
          />
          <StatsCard
            title="Suspended"
            value={statusCounts.suspended}
            icon={XCircle}
            gradient="error"
          />
        </StatsGrid>
      </div>

      {/* Main Content Area - Virtual Table */}
      <Card variant="default" className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
        <div className="p-4 border-b border-border bg-[var(--color-muted)]/30">
          <FilterBar
            searchValue={searchQuery}
            searchPlaceholder="Search organizations..."
            onSearchChange={setSearchQuery}
            onSearchClear={() => setSearchQuery('')}
            filters={[
              {
                label: 'Status',
                value: statusFilter,
                options: statusFilterOptions,
                onChange: (value) => setStatusFilter(value as OrganizationStatus | 'all'),
              },
            ]}
          />
        </div>

        <VirtualTable
          data={filteredOrgs}
          columns={columns}
          isLoading={isLoading}
          getRowKey={(org) => org.id}
          className="border-0 rounded-none flex-1"
          height="100%"
          emptyState={{
            icon: Building2,
            title: 'No organizations found',
            description: 'Try adjusting your search or filters',
          }}
        />
      </Card>

      {/* Modals */}
      <CreateOrganizationForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditOrganizationForm
        organization={editingOrg}
        onClose={() => setEditingOrg(null)}
      />
    </div>
  );
}