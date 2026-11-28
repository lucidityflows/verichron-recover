import React, { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Users2,
  ChevronRight,
  Search,
  Filter,
  ArrowLeftRight,
  Package,
  GripVertical,
  Plus
} from 'lucide-react';
import { TeamCard } from './components/TeamCard.js';
import { CreateTeamModal } from './components/CreateTeamModal.js';
import { cn } from '@/shared/utils/cn';
import { useUser } from '../../shared/store/userStore.js';
import {
  useTeamsControllerGetTeams,
  useTeamsControllerAssignPortfolioToTeam,
  teamsControllerGetPortfoliosForTeam
} from '../../api/generated/organizations/endpoints/teams/teams.js';
import { usePortfolios } from '../inventory/hooks/usePortfolios.js';
import { type PortfolioResponseDto } from '../../api/generated/debts_models/index.js';
import { useToast } from '@/shared/hooks';
import { useQueries } from '@tanstack/react-query';

/**
 * ResourceOptimizer
 * Primary container for the Roster domain.
 * Bridges Human Capital (Teams) with Tactical Workload (Portfolios).
 */
export const ResourceOptimizer: React.FC = () => {
  const { organizationId } = useUser();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Drag and drop state
  const [draggingPortfolio, setDraggingPortfolio] = useState<{ id: string, name: string, impact: number } | null>(null);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);

  // 1. Fetch Teams
  const { data: teamsResponse, isLoading: isLoadingTeams } = useTeamsControllerGetTeams(organizationId!);
  const teams = teamsResponse?.data || [];

  // 2. Fetch Portfolios (all available)
  const { data: portfoliosData, isLoading: isLoadingPortfolios } = usePortfolios({ pageSize: 100 });
  const allPortfolios = portfoliosData?.data || [];

  // 3. Fetch assigned portfolios for each team
  const teamAssignmentQueries = useQueries({
    queries: teams.map(team => ({
      queryKey: ['team-portfolios', organizationId, team.id],
      queryFn: () => teamsControllerGetPortfoliosForTeam(organizationId!, team.id),
      enabled: !!organizationId && !!team.id,
    }))
  });

  // 4. Build team utilization map
  const teamUtilizationMap = useMemo(() => {
    const map = new Map<string, { utilization: number, assignedDebts: number }>();

    teams.forEach((team, index) => {
      const assignmentsData = teamAssignmentQueries[index]?.data;
      const assignments = assignmentsData?.data || [];

      // Get portfolio details and sum debt counts
      const assignedDebts = assignments.reduce((sum, assignment) => {
        const portfolio = allPortfolios.find(p => p.id === assignment.portfolioId);
        return sum + (portfolio?.debtCount || 0);
      }, 0);

      // Calculate utilization: (total debts / (members × 75)) × 100
      const idealCapacity = team.memberCount * 75;
      const utilization = idealCapacity > 0 ? Math.round((assignedDebts / idealCapacity) * 100) : 0;

      map.set(team.id, { utilization, assignedDebts });
    });

    return map;
  }, [teams, teamAssignmentQueries, allPortfolios]);

  // 5. Filter portfolios that are not yet assigned to any team
  const assignedPortfolioIds = useMemo(() => {
    const ids = new Set<string>();
    teamAssignmentQueries.forEach(query => {
      const assignments = query.data?.data || [];
      assignments.forEach(a => ids.add(a.portfolioId));
    });
    return ids;
  }, [teamAssignmentQueries]);

  const unassignedPortfolios = allPortfolios.filter(p => !assignedPortfolioIds.has(p.id));

  // 6. Assignment Mutation
  const assignMutation = useTeamsControllerAssignPortfolioToTeam();

  if (isLoadingTeams || isLoadingPortfolios) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-medium">Loading resources...</div>
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
            <span className="text-muted-foreground">Resource Optimizer</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Team Allocation</h1>
          <p className="text-sm font-medium text-muted-foreground">Balance team capacity with portfolio volume in real-time.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus size={16} />
            Create Team
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Team Grid */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users2 size={16} className="text-primary" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Active Teams</h3>
                <p className="text-[10px] text-muted-foreground font-medium">{teams.length} team{teams.length !== 1 ? 's' : ''} configured</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.length === 0 ? (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-xl bg-muted/30">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Users2 size={24} className="text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">No Teams Yet</p>
                    <p className="text-xs text-muted-foreground">Click "Create Team" to get started.</p>
                  </div>
                </div>
              </div>
            ) : (
              teams.map((team) => {
                const teamStats = teamUtilizationMap.get(team.id) || { utilization: 0, assignedDebts: 0 };
                const currentUtilization = teamStats.utilization;

                // Calculate projected utilization when dragging
                let projectedUtilization: number | undefined;
                if (hoveredTeamId === team.id && draggingPortfolio) {
                  const projectedDebts = teamStats.assignedDebts + draggingPortfolio.impact;
                  const idealCapacity = team.memberCount * 75;
                  projectedUtilization = idealCapacity > 0 ? Math.round((projectedDebts / idealCapacity) * 100) : 0;
                }

                return (
                <div
                  key={team.id}
                  onClick={() => navigate({ to: '/roster/teams/$teamId', params: { teamId: team.id } })}
                  className="cursor-pointer"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoveredTeamId(team.id);
                  }}
                  onDragLeave={() => setHoveredTeamId(null)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    if (draggingPortfolio && organizationId) {
                      setHoveredTeamId(null);
                      try {
                        await assignMutation.mutateAsync({
                          organizationId,
                          teamId: team.id,
                          portfolioId: draggingPortfolio.id
                        });
                        success('Assignment Successful', `${draggingPortfolio.name} has been assigned to ${team.name}`);
                      } catch (err: any) {
                        toastError('Assignment Failed', err.message || 'Failed to assign portfolio to team.');
                      }
                      setDraggingPortfolio(null);
                    }
                  }}
                >
                  <TeamCard
                    id={team.id}
                    name={team.name}
                    memberCount={team.memberCount}
                    utilization={currentUtilization}
                    projectedUtilization={projectedUtilization}
                    isHovered={hoveredTeamId === team.id}
                  />
                </div>
              );
              })
            )}
          </div>
        </div>

        {/* Right Column: Sources */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-md">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Package size={14} className="text-warning" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Available Portfolios</h3>
              </div>
              <div className="pl-9 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Drag portfolios onto team cards to assign workload.
                </p>
                <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/10">
                  <div className="mt-0.5">
                    <ArrowLeftRight size={12} className="text-primary" />
                  </div>
                  <p className="text-[10px] text-primary font-medium">
                    Capacity gauges update in real-time as you drag
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {unassignedPortfolios.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Package size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      {allPortfolios.length === 0 ? 'No portfolios found.' : 'All portfolios are assigned.'}
                    </p>
                  </div>
                </div>
              ) : (
                unassignedPortfolios.map((port: PortfolioResponseDto) => {
                  // Calculate impact percentage based on average team size
                  const avgTeamSize = teams.length > 0
                    ? teams.reduce((sum, t) => sum + t.memberCount, 0) / teams.length
                    : 5;
                  const avgCapacity = avgTeamSize * 75;
                  const impactPercentage = avgCapacity > 0
                    ? Math.round((port.debtCount / avgCapacity) * 100)
                    : 0;

                  return (
                  <div
                    key={port.id}
                    draggable
                    onDragStart={() => setDraggingPortfolio({
                      id: port.id,
                      name: port.name,
                      impact: port.debtCount
                    })}
                    onDragEnd={() => setDraggingPortfolio(null)}
                    className="group relative cursor-grab active:cursor-grabbing rounded-lg border border-border bg-card p-4 shadow-sm hover:border-primary hover:shadow-lg hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                        <GripVertical size={16} />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{port.name}</div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                          <span className="px-1.5 py-0.5 rounded bg-success/10 text-success font-bold">
                            ${Number(port.totalCurrentBalance).toLocaleString()}
                          </span>
                          <span className="text-border">•</span>
                          <span className="font-medium">{port.debtCount} Accounts</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md ring-1 ring-primary/20">
                          +{impactPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};