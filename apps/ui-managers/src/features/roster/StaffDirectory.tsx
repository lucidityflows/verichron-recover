import React, { useState, useRef, useEffect } from 'react';
import { 
  Users2, 
  UserPlus, 
  Search, 
  Filter, 
  ChevronRight, 
  Shield, 
  Mail, 
  MoreVertical,
  CheckCircle2,
  Clock,
  ShieldCheck,
  UserCog,
  Trash2,
  Eye,
  Pencil
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useUser } from '../../shared/store/userStore.js';
import { useUsers } from './hooks/useUsers.js';
import { useTeamsControllerGetTeams } from '../../api/generated/organizations/endpoints/teams/teams.js';
import { useProfilesControllerDeleteUser } from '../../api/generated/users/endpoints/users/users.js';
import { UserStatus, type UserSummaryDto } from '../../api/generated/users_models/index.js';
import { formatDistanceToNow } from 'date-fns';
import { InviteStaffModal } from './components/InviteStaffModal.js';
import { EditStaffModal } from './components/EditStaffModal.js';
import { useToast } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useRosterStore } from '@/shared/store/rosterStore';

/**
 * StaffDirectory
 * Centralized user management for the organization.
 * Integrates with api-users RBAC.
 */
export const StaffDirectory: React.FC = () => {
  const { organizationId } = useUser();
  const navigate = useNavigate();
  const { membershipMap, fetchMembershipMap } = useRosterStore();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummaryDto | null>(null);
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Users
  const { data: usersData, isLoading: isLoadingUsers } = useUsers(organizationId, {
    pageSize: 50,
    search: search || undefined
  });

  // Fetch membership map on mount
  useEffect(() => {
    if (organizationId) {
      fetchMembershipMap(organizationId);
    }
  }, [organizationId, fetchMembershipMap]);

  // 2. Fetch Teams (to show counts or context)
  const { data: teamsResponse } = useTeamsControllerGetTeams(organizationId!, undefined);
  const teams = teamsResponse?.data || [];

  const staff = usersData?.data || [];
  
  const filteredStaff = staff.filter((s) => {
    if (activeTab === 'ACTIVE') return s.status === UserStatus.ACTIVE || s.status === UserStatus.SUSPENDED;
    return s.status === UserStatus.PENDING || s.status === UserStatus.PROVISIONAL;
  });

  const stats = {
    total: usersData?.total || 0,
    active: staff.filter((s) => s.status === UserStatus.ACTIVE).length,
    pending: staff.filter((s) => s.status === UserStatus.PENDING || s.status === UserStatus.PROVISIONAL).length,
    collectors: staff.filter((s) => s.roleName === 'ORG_COLLECTOR' || s.roleName === 'ORG_TEAM_LEAD').length
  };

  if (isLoadingUsers && !usersData) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-medium">Loading staff directory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Roster</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Staff Directory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Organization Roster</h1>
          <p className="text-sm font-medium text-muted-foreground">Manage agency staff, assign roles, and track system access.</p>
        </div>

        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95"
        >
          <UserPlus size={16} />
          Invite Staff Member
        </button>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: stats.total, color: 'text-foreground', bgColor: 'bg-primary/5', icon: Users2, iconColor: 'text-primary' },
          { label: 'Active Now', value: stats.active, color: 'text-success', bgColor: 'bg-success/5', icon: CheckCircle2, iconColor: 'text-success' },
          { label: 'Pending Invites', value: stats.pending, color: 'text-warning', bgColor: 'bg-warning/5', icon: Clock, iconColor: 'text-warning' },
          { label: 'Role: Collectors', value: stats.collectors, color: 'text-primary', bgColor: 'bg-blue-500/5', icon: Shield, iconColor: 'text-blue-600' },
        ].map((stat, i) => {
          const IconComponent = stat.icon;
          return (
            <div key={i} className={cn("rounded-xl border border-border bg-card p-5 shadow-md transition-all hover:shadow-lg hover:border-primary/30", stat.bgColor)}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", stat.bgColor)}>
                  <IconComponent size={16} className={stat.iconColor} />
                </div>
              </div>
              <p className={cn("text-2xl font-bold font-mono", stat.color)}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Main Directory Area */}
      <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-1.5 p-1 bg-muted/80 rounded-lg border border-border/50">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={cn(
                "px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring flex items-center gap-2",
                activeTab === 'ACTIVE'
                  ? "bg-card text-primary shadow-md border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              <CheckCircle2 size={12} />
              Active Staff
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              className={cn(
                "px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring flex items-center gap-2",
                activeTab === 'PENDING'
                  ? "bg-card text-warning shadow-md border border-warning/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              <Clock size={12} />
              Pending
              {stats.pending > 0 && (
                <span className="ml-1 bg-warning/20 text-warning px-1.5 py-0.5 rounded-full text-[9px] font-black">
                  {stats.pending}
                </span>
              )}
            </button>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by name, email, or team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-ring"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-foreground">Identity</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-foreground">Access Role</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-foreground">Team Assignments</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-foreground text-right">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-xs italic">No staff members found.</td>
                </tr>
              ) : (
                filteredStaff.map((user) => {
                  // Use the real roleName from the API, fall back to 'Staff Member' if not provided
                  const roleName = user.roleName?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Staff Member';

                  // Generate initials
                  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();

                  // Color based on first letter for visual variety
                  const avatarColors = [
                    'bg-blue-500/10 text-blue-600 border-blue-500/20',
                    'bg-purple-500/10 text-purple-600 border-purple-500/20',
                    'bg-green-500/10 text-green-600 border-green-500/20',
                    'bg-amber-500/10 text-amber-600 border-amber-500/20',
                    'bg-pink-500/10 text-pink-600 border-pink-500/20',
                  ];
                  const avatarColor = avatarColors[user.firstName?.charCodeAt(0) % 5 || 0];

                  // Status badge styling
                  const statusStyles: Record<UserStatus, string> = {
                    [UserStatus.ACTIVE]: 'bg-success/10 text-success ring-1 ring-success/20',
                    [UserStatus.PENDING]: 'bg-warning/10 text-warning ring-1 ring-warning/20',
                    [UserStatus.PROVISIONAL]: 'bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20',
                    [UserStatus.SUSPENDED]: 'bg-error/10 text-error ring-1 ring-error/20',
                    [UserStatus.INACTIVE]: 'bg-muted text-muted-foreground ring-1 ring-border',
                  };

                  return (
                    <tr 
                      key={user.id} 
                      onClick={() => navigate({ to: '/roster/staff/$userId', params: { userId: user.id } })}
                      className="group hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs border", avatarColor)}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{user.firstName} {user.lastName}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Mail size={10} /> {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                            <ShieldCheck size={14} className="text-primary" />
                          </div>
                          <span className="text-[10px] font-bold text-foreground uppercase tracking-tight">
                            {roleName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {membershipMap[user.id] ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate({ to: '/roster/teams/$teamId', params: { teamId: membershipMap[user.id].teamId } });
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all uppercase tracking-tight border border-primary/20"
                            >
                              {membershipMap[user.id].teamName}
                            </button>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">No Team</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight",
                          statusStyles[user.status] || statusStyles[UserStatus.INACTIVE]
                        )}>
                          {user.status === UserStatus.ACTIVE && <CheckCircle2 size={10} />}
                          {user.status === UserStatus.PENDING && <Clock size={10} />}
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Governance Banner */}
      <div className="rounded-xl bg-gradient-to-br from-sidebar via-sidebar to-primary/5 p-6 text-sidebar-foreground shadow-xl border border-primary/10">
        <div className="flex items-start gap-4">
          <div className="bg-primary/20 p-3 rounded-xl text-primary ring-1 ring-primary/20 shadow-lg">
            <UserCog size={22} />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Role Authority</h4>
              <div className="h-1 flex-1 bg-gradient-to-r from-primary/20 to-transparent rounded-full" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
              User roles define financial authority and visibility scopes. Upgrading a user to <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider border border-primary/20">ORG_MANAGER</span> will grant them access to all organization-wide portfolios and strategy matrices.
            </p>
          </div>
        </div>
      </div>

      <InviteStaffModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      <EditStaffModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
      />
    </div>
  );
};