import { useQuery } from '@tanstack/react-query';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { userService } from '../../shared/services/userService.js';
import { Users as UsersIcon, CheckCircle, Clock, Mail, Plus } from 'lucide-react';
import { Card } from '../../shared/components/Card.js';
import { Badge, StatusBadge } from '../../shared/components/Badge.js';
import { StatsCard } from '../../shared/components/StatsCard.js';
import { StatsGrid } from '../../shared/components/StatsGrid.js';
import { FilterBar } from '../../shared/components/FilterBar.js';
import { Button } from '../../shared/components/Button.js';
import { useState, useEffect } from 'react';
import { UserDetailDto, UserSummaryDto, UserStatus } from '../../api/generated/users_models/index.js';
import { InviteUserForm } from './components/InviteUserForm.js';
import { UserDetailsModal } from './components/UserDetailsModal.js';
import { EditUserForm } from './components/EditUserForm.js';

export function Users() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/users' }) as { action?: string };
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserSummaryDto | UserDetailDto | null>(null);

  // Open invite modal if action=invite in URL
  useEffect(() => {
    if (search.action === 'invite') {
      setIsInviteModalOpen(true);
      // Clear the search param after opening modal
      navigate({ to: '/users', search: undefined, replace: true });
    }
  }, [search.action, navigate]);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.listUsers({ page: 1, pageSize: 100 }),
  });

  const users = usersData?.data || [];
  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const userStatusCounts = {
    total: users.length,
    active: users.filter(u => u.status === UserStatus.ACTIVE).length,
    pending: users.filter(u => u.status === UserStatus.PENDING).length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage platform and organization users</p>
        </div>
        <StatsGrid columns={3}>
          <div className="h-24 bg-[var(--color-card)] rounded-xl animate-pulse border border-[var(--color-border)]" />
          <div className="h-24 bg-[var(--color-card)] rounded-xl animate-pulse border border-[var(--color-border)]" />
          <div className="h-24 bg-[var(--color-card)] rounded-xl animate-pulse border border-[var(--color-border)]" />
        </StatsGrid>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            User Management
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1 font-black uppercase tracking-widest">
            Manage platform and organization users
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsInviteModalOpen(true)}
          icon={Plus}
          size="sm"
        >
          Invite Administrator
        </Button>
      </div>

      {/* Stats Overview */}
      <StatsGrid columns={3}>
        <StatsCard
          title="Total Platform Users"
          value={userStatusCounts.total}
          icon={UsersIcon}
          gradient="primary"
        />
        <StatsCard
          title="Active Accounts"
          value={userStatusCounts.active}
          icon={CheckCircle}
          gradient="success"
        />
        <StatsCard
          title="Pending Invitations"
          value={userStatusCounts.pending}
          icon={Clock}
          gradient="warning"
        />
      </StatsGrid>

      {/* Users Content */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
          <FilterBar
            searchValue={searchQuery}
            searchPlaceholder="Search by name, email or ID..."
            onSearchChange={setSearchQuery}
            onSearchClear={() => setSearchQuery('')}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-muted)]/10">
                <th className="text-left p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)]">User Profile</th>
                <th className="text-left p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)]">Authentication</th>
                <th className="text-left p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)]">Status</th>
                <th className="text-right p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-[var(--color-muted)]/20 transition-colors group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-foreground)] font-bold text-xs border border-[var(--color-border)] uppercase">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">ID: {user.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      {user.email}
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={user.status} variant="outlined" />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-[var(--color-muted)] w-fit mx-auto mb-4">
                <UsersIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">No matching users</h3>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <InviteUserForm
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
      <UserDetailsModal
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onEdit={(user) => setEditingUser(user)}
      />
      <EditUserForm
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />
    </div>
  );
}