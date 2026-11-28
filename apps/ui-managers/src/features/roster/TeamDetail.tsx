import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users2,
  ChevronRight,
  Package,
  LineChart,
  TrendingUp,
  ArrowLeft,
  Search,
  MoreVertical,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Briefcase,
  Eye,
  BarChart3
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { UtilizationGauge } from './components/UtilizationGauge.js';
import { RosterManagerDrawer } from './components/RosterManagerDrawer.js';
import { PortfolioSelectorDrawer } from './components/PortfolioSelectorDrawer.js';
import { EditTeamModal } from './components/EditTeamModal.js';
import {
  useTeamsControllerGetTeamById,
  useTeamsControllerGetTeamMembers,
  useTeamsControllerDeleteTeam,
  getTeamsControllerGetTeamsQueryKey,
  useTeamsControllerGetPortfoliosForTeam
} from '@/api/generated/organizations/endpoints/teams/teams';
import { usePortfolios } from '@/features/inventory/hooks/usePortfolios';
import { usePerformanceControllerGetLeaderboard } from '@/api/generated/collectors/endpoints/collector-performance/collector-performance';
import { TrendGranularity } from '@/api/generated/collectors_models';
import { useUser } from '@/shared/store/userStore';
import { useUsers } from './hooks/useUsers';
import { useToast } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

/**
 * TeamDetail
 * Drill-down view for a specific Team.
 */
export const TeamDetail: React.FC<{ teamId: string, onBack: () => void }> = ({ teamId, onBack }) => {
  const { organizationId, user } = useUser();
  const navigate = useNavigate();
  const [showRosterDrawer, setShowRosterDrawer] = useState(false);
  const [showPortfolioDrawer, setShowPortfolioDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Team Details
  const { data: teamResponse, isLoading: isLoadingTeam } = useTeamsControllerGetTeamById(organizationId!, teamId);
  const team = teamResponse?.data as any;

  // 2. Fetch Team Members
  const { data: membersData, isLoading: isLoadingMembers } = useTeamsControllerGetTeamMembers(organizationId!, teamId);
  const members = Array.isArray(membersData?.data) ? membersData.data : [];

  // 3. Fetch Assigned Portfolios (IDs)
  const { data: assignmentsResponse, isLoading: isLoadingAssignments } = useTeamsControllerGetPortfoliosForTeam(organizationId!, teamId);
  const assignments = assignmentsResponse?.data || [];
  const assignedIds = new Set(assignments.map(a => a.portfolioId));

  // 4. Fetch All Portfolios (to resolve names)
  // Optimization: In a real app, we might want a bulk fetch by ID or ensure the cache is warm.
  const { data: portfoliosData, isLoading: isLoadingPortfolios } = usePortfolios({ pageSize: 100 });
  const allPortfolios = portfoliosData?.data || [];

  // Join: Filter portfolios that are assigned to this team
  const assignedPortfolios = allPortfolios.filter(p => assignedIds.has(p.id));

  // 5. Fetch all users to map userId to name/email
  const { data: usersData } = useUsers(organizationId, { pageSize: 100 });
  const users = usersData?.data || [];

  // 6. Fetch Team Performance (Daily Leaderboard)
  const { data: performanceData } = usePerformanceControllerGetLeaderboard(
    organizationId!,
    {
      period: TrendGranularity.DAILY,
      teamId: teamId
    },
    {
      query: {
        enabled: !!organizationId && !!user?.id,
      }
    }
  );
  const performanceEntries = performanceData?.data?.entries || [];

  // Create performance lookup map
  const performanceMap = new Map(performanceEntries.map(p => [p.collectorId, p]));

  // 7. Calculate Team Aggregated Stats
  const teamStats = useMemo(() => {
    return performanceEntries.reduce((acc, entry) => ({
      totalCollected: acc.totalCollected + (entry.totalCollected || 0),
      totalContacts: acc.totalContacts + (entry.totalContacts || 0),
      accountsResolved: acc.accountsResolved + (entry.accountsResolved || 0),
    }), { totalCollected: 0, totalContacts: 0, accountsResolved: 0 });
  }, [performanceEntries]);

  // 8. Calculate Team Staffing Capacity
  const totalAssignedDebts = assignedPortfolios.reduce((sum, p) => sum + (p.debtCount || 0), 0);
  const idealCollectorsForLoad = Math.ceil(totalAssignedDebts / 75); // 75 accounts per collector (industry standard)
  const staffingCapacity = idealCollectorsForLoad > 0 ? (members.length / idealCollectorsForLoad) * 100 : 100;

  // 9. Delete Mutation
  const { mutateAsync: deleteTeam, isPending: isDeleting } = useTeamsControllerDeleteTeam();

  // 10. Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId) {
        const target = event.target as HTMLElement;
        if (!target.closest('.action-menu')) {
          setActiveMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  // Create a lookup map for users
  const userMap = new Map(users.map(u => [u.id, u]));

  const handleDeleteTeam = async () => {
    if (!window.confirm(`Are you sure you want to delete "${team?.name}"? This action cannot be undone. All team members and portfolio assignments will be removed.`)) {
      return;
    }

    try {
      await deleteTeam({ organizationId: organizationId!, teamId });
      queryClient.invalidateQueries({ queryKey: getTeamsControllerGetTeamsQueryKey(organizationId!) });
      success('Team Deleted', `${team.name} has been deleted successfully.`);
      onBack();
    } catch (error: any) {
      toastError('Deletion Failed', error.message || 'Failed to delete team.');
    }
  };

  // Filter roster based on search (search by name or email now)
  const filteredMembers = members.filter((m: any) => {
    const user = userMap.get(m.userId);
    if (!user) return false;
    const searchLower = memberSearch.toLowerCase();
    return (
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  if (isLoadingTeam || isLoadingMembers) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team || typeof team !== 'object' || !('name' in team)) {
    return (
      <div className="flex flex-col h-[400px] items-center justify-center gap-4">
        <div className="text-muted-foreground font-medium">Team not found</div>
        <button onClick={onBack} className="text-primary hover:underline">
          Return to roster
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Navigation Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <button onClick={onBack} className="hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm">The Roster</button>
        <ChevronRight size={12} />
        <span className="text-foreground">{team.name}</span>
      </nav>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
            <Users2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{team.name}</h1>
            <p className="text-sm font-medium text-muted-foreground">{team.description || 'No description provided.'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Pencil size={14} />
            Edit Team
          </button>
          <button
            onClick={handleDeleteTeam}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-md bg-error/10 border border-error/20 px-3 py-2 text-sm font-bold text-error shadow-sm hover:bg-error/20 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
          <div className="w-px h-6 bg-border" />
          <button
            onClick={() => setShowRosterDrawer(true)}
            className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Manage Roster
          </button>
          <button
            onClick={() => setShowPortfolioDrawer(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95"
          >
            Add Portfolio
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Team Stats & Members */}
        <div className="lg:col-span-2 space-y-6">
          {/* Team Vitality */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-md grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <UtilizationGauge label="Team Staffing" current={Math.round(staffingCapacity)} />
              <p className="text-[10px] text-muted-foreground font-bold uppercase">
                {members.length} of {idealCollectorsForLoad} ideal collectors
              </p>
            </div>
            <div className="space-y-1 md:border-l md:border-border md:pl-8">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Collections Today</span>
              <div className="text-2xl font-bold font-mono text-foreground">
                ${(teamStats.totalCollected / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase">
                {teamStats.totalContacts} contacts • {teamStats.accountsResolved} resolved
              </div>
            </div>
          </div>

          {/* Member Roster */}
          <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
            <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">Active Roster</h3>
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Filter team..." 
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-7 pr-3 py-1 text-[10px] rounded border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-ring" 
                />
              </div>
            </div>
            <div className="divide-y divide-border">
              {filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground italic">No members found.</div>
              ) : (
                filteredMembers.map((m: any) => {
                  const user = userMap.get(m.userId);
                  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '??';
                  const perf = performanceMap.get(m.userId);

                  return (
                  <div key={m.userId} className="p-4 flex items-center justify-between hover:bg-muted transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {initials}
                        </div>
                        {/* Placeholder status until we have real presence data */}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {user ? `${user.firstName} ${user.lastName}` : `User ${m.userId.substring(0, 8)}...`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {user?.email || 'No email'}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                          {m.isPrimary ? 'Primary' : 'Member'} • {m.roleOnTeam || 'Collector'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden md:block text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Today's Performance</p>
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-foreground">
                          <span className="text-success">${perf ? (perf.totalCollected / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</span>
                          <span className="text-muted-foreground">•</span>
                          <span>{perf?.totalContacts || 0} contacts</span>
                          <span className="text-muted-foreground">•</span>
                          <span>{perf?.accountsResolved || 0} resolved</span>
                        </div>
                      </div>
                      <div className="relative action-menu">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === m.userId ? null : m.userId)}
                          className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm p-1"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeMenuId === m.userId && (
                          <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <button
                              onClick={() => {
                                navigate({ to: `/staff/${m.userId}` });
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
                            >
                              <Eye size={14} />
                              View Profile
                            </button>
                            <button
                              onClick={() => {
                                // TODO: Open performance modal
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left border-t border-border"
                            >
                              <BarChart3 size={14} />
                              Performance
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Assigned Portfolios */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Authorized Portfolios</h3>
              <button onClick={() => setShowPortfolioDrawer(true)} className="text-primary hover:text-primary-hover transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"><Plus size={16} /></button>
            </div>

            <div className="space-y-3">
              {isLoadingAssignments || isLoadingPortfolios ? (
                <div className="py-4 text-center">
                  <Loader2 size={20} className="animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : assignedPortfolios.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-border rounded-lg bg-muted/30">
                  <Package size={24} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground mb-1">No Portfolios Assigned</p>
                  <p className="text-[10px] text-muted-foreground px-4">
                    Use the + button to authorize this team to work on specific portfolios.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedPortfolios.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/50 transition-colors group">
                      <div className="h-8 w-8 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <Briefcase size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.source}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-success">Active</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Strategic Logic</h4>
            <p className="text-xs leading-relaxed text-muted-foreground italic border-l-2 border-primary/30 pl-4">
              Team configuration determines routing priority for automated dialer campaigns.
            </p>
          </div>
        </div>
      </div>

      {/* Drawers */}
      <RosterManagerDrawer
        isOpen={showRosterDrawer}
        onClose={() => setShowRosterDrawer(false)}
        teamName={team.name}
        teamId={teamId}
        currentMemberIds={members.map((m: any) => m.userId)}
      />
      <PortfolioSelectorDrawer
        isOpen={showPortfolioDrawer}
        onClose={() => setShowPortfolioDrawer(false)}
        teamName={team.name}
        teamId={teamId}
      />
      <EditTeamModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        teamId={teamId}
        initialData={{
          name: team.name,
          description: team.description,
        }}
      />
    </div>
  );
};
