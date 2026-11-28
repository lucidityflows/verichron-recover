import { useQuery } from '@tanstack/react-query';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { rbacService } from '../../shared/services/rbacService.js';
import { Shield, CheckCircle, Plus, Users as UsersIcon } from 'lucide-react';
import { Card } from '../../shared/components/Card.js';
import { Badge, StatusBadge } from '../../shared/components/Badge.js';
import { StatsCard } from '../../shared/components/StatsCard.js';
import { StatsGrid } from '../../shared/components/StatsGrid.js';
import { FilterBar } from '../../shared/components/FilterBar.js';
import { Button } from '../../shared/components/Button.js';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { RoleResponseDto } from '../../api/generated/users_models/index.js';
import { getErrorMessage } from '../../shared/utils/errors.js';
import { CreateRoleForm } from './components/CreateRoleForm.js';
import { RoleDetailsModal } from './components/RoleDetailsModal.js';
import { EditRoleForm } from './components/EditRoleForm.js';

export function Roles() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/roles' }) as { action?: string };
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<RoleResponseDto | null>(null);

  // Open create modal if action=create in URL
  useEffect(() => {
    if (search.action === 'create') {
      setIsCreateModalOpen(true);
      // Clear the search param after opening modal
      navigate({ to: '/roles', search: undefined, replace: true });
    }
  }, [search.action, navigate]);

  const { data: rolesData, isLoading, error } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rbacService.listRoles({ page: 1, pageSize: 100 }),
  });

  const roles: RoleResponseDto[] = rolesData?.data || [];
  const filteredRoles = roles.filter((role: RoleResponseDto) => {
    const matchesSearch = role.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const roleCounts = {
    total: roles.length,
    system: roles.filter((r: RoleResponseDto) => r.isSystemRole).length,
    custom: roles.filter((r: RoleResponseDto) => !r.isSystemRole).length,
  };

  // Platform admins cannot create roles (org-agnostic)
  const canCreateRole = false; // Platform admin restriction

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-xs text-muted-foreground mt-1">Synchronizing authorization schema...</p>
        </div>
        <StatsGrid columns={3}>
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[var(--color-card)] rounded-xl animate-pulse border border-[var(--color-border)]" />)}
        </StatsGrid>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-error mx-auto" />
          <p className="text-error font-semibold">Failed to load roles</p>
          <p className="text-muted-foreground text-sm">{getErrorMessage(error, 'Unknown error')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              RBAC Governance
            </h1>
            <p className="text-[10px] text-[var(--color-muted-foreground)] font-black uppercase tracking-widest mt-1">Platform-wide Access Control Policy</p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          icon={Plus}
          size="sm"
          disabled={!canCreateRole}
          title={!canCreateRole ? 'Platform admins cannot create roles. Only organization admins can create custom roles.' : 'Create a new custom role'}
        >
          New Security Role
        </Button>
      </div>

      {/* Stats Overview */}
      <StatsGrid columns={3}>
        <StatsCard
          title="Total Master Roles"
          value={roleCounts.total}
          icon={Shield}
          gradient="primary"
        />
        <StatsCard
          title="System Defaults"
          value={roleCounts.system}
          icon={CheckCircle}
          gradient="info"
        />
        <StatsCard
          title="Tenant Customizations"
          value={roleCounts.custom}
          icon={UsersIcon}
          gradient="primary"
        />
      </StatsGrid>

      {/* Content Area */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
          <FilterBar
            searchValue={searchQuery}
            searchPlaceholder="Search roles by name..."
            onSearchChange={setSearchQuery}
            onSearchClear={() => setSearchQuery('')}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-muted)]/10 text-left">
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)]">Authorization Identity</th>
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)] text-center">Source</th>
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)] text-center">User Count</th>
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)]">Established</th>
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredRoles.map((role) => (
                <tr
                  key={role.id}
                  className="hover:bg-[var(--color-muted)]/20 transition-colors group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-foreground)] font-bold text-xs border border-[var(--color-border)] uppercase">
                        {role.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{role.name}</p>
                        {role.description && (
                          <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-tight line-clamp-1">{role.description as unknown as string}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {role.isSystemRole ? (
                      <Badge variant="info" size="sm">SYSTEM</Badge>
                    ) : (
                      <Badge variant="outline" size="sm">CUSTOM</Badge>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--color-muted)] border border-[var(--color-border)]">
                      <UsersIcon size={10} className="text-[var(--color-muted-foreground)]" />
                      <span className="text-[11px] font-bold text-foreground">{role.userCount}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-[var(--color-muted-foreground)]">
                    {format(new Date(role.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRoleId(role.id)}
                      >
                        Policy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRole(role)}
                        disabled={role.isSystemRole}
                        title={role.isSystemRole ? 'System roles cannot be modified' : 'Edit role configuration'}
                      >
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRoles.length === 0 && (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-[var(--color-muted)] w-fit mx-auto mb-4">
                <Shield className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">No matching policies</h3>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your active filters</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <CreateRoleForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <RoleDetailsModal
        roleId={selectedRoleId}
        onClose={() => setSelectedRoleId(null)}
        onEdit={(role) => setEditingRole(role)}
      />
      <EditRoleForm
        role={editingRole}
        onClose={() => setEditingRole(null)}
      />
    </div>
  );
}