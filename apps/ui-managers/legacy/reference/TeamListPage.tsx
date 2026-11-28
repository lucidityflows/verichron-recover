import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from '@tanstack/react-router';
import { Plus, Edit, Trash2, Users, LayoutDashboard } from 'lucide-react';
import { getCurrentOrganizationId } from '@/shared/utils/auth';
import {
  useTeamsControllerGetTeams,
  useTeamsControllerDeleteTeam,
  getTeamsControllerGetTeamsQueryKey,
} from '@/api/generated/organizations/endpoints/teams/teams';
import {
  TeamResponseDto,
  TeamMemberRole,
} from '@/api/generated/organizations_models';
import {
  LoadingSpinner,
  ErrorState,
  DataTable,
  Column,
  Button,
  EmptyState,
} from '@/shared/components';
import { useToastContext } from '@/shared/contexts/ToastContext';
import { useUser } from '@/shared/store/userStore'; // For role-based access

export function TeamListPage() {
  const navigate = useNavigate();
  const orgId = getCurrentOrganizationId();
  const { hasRole } = useUser();
  const queryClient = useQueryClient();
  const toast = useToastContext();

  const canManageTeams = hasRole(['Organization Admin', 'Organization Manager']);

  const {
    data: teamsData,
    isLoading,
    error,
  } = useTeamsControllerGetTeams(orgId!, {
    query: { enabled: !!orgId },
  });

  const deleteTeamMutation = useTeamsControllerDeleteTeam({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getTeamsControllerGetTeamsQueryKey(orgId!) });
        toast.success('Team Deleted', 'Team removed successfully.');
      },
      onError: (err: any) => {
        const message = Array.isArray(err.message) 
          ? err.message.join(', ') 
          : err.message || 'Could not delete team.';
        toast.error('Delete Failed', message);
      },
    },
  });

  const handleDeleteTeam = (teamId: string, teamName: string) => {
    if (confirm(`Are you sure you want to delete the team "${teamName}"? This action cannot be undone.`)) {
      deleteTeamMutation.mutate({ organizationId: orgId!, teamId });
    }
  };

  const columns: Column<TeamResponseDto>[] = React.useMemo(
    () => [
      {
        key: 'name',
        header: 'Team Name',
        render: (team) => (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold">
              {team.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-[var(--color-foreground)]">{team.name}</p>
              <p className="text-sm text-muted-foreground">ID: {team.id.substring(0, 8)}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'memberCount',
        header: 'Members',
        render: (team) => (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-[var(--color-foreground)]">{team.memberCount}</span>
          </div>
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'description',
        header: 'Description',
        render: (team) => (
          <p className="text-sm text-[var(--color-foreground)] max-w-xs truncate">
            {team.description || 'No description provided.'}
          </p>
        ),
      },
      {
        key: 'manager',
        header: 'Manager',
        render: (team) => (
          <p className="text-sm text-[var(--color-foreground)]">
            {team.managerUserId ? `User ID: ${team.managerUserId.substring(0, 8)}...` : 'N/A'}
          </p>
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (team) => (
          <div className="flex items-center gap-2">
            {canManageTeams && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Edit}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click
                    navigate({ to: '/teams/$teamId', params: { teamId: team.id } });
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click
                    handleDeleteTeam(team.id, team.name);
                  }}
                  disabled={deleteTeamMutation.isPending || team.name === 'All Collectors'} // Prevent deleting default team
                >
                  Delete
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                // TODO: Navigate to team members page or open modal
                alert(`Manage members for ${team.name}`);
              }}
            >
              Manage Members
            </Button>
          </div>
        ),
        className: 'whitespace-nowrap',
      },
    ],
    [navigate, orgId, canManageTeams, deleteTeamMutation.isPending, handleDeleteTeam]
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading teams..." />;
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return <ErrorState title="Failed to load teams" message={errorMessage} />;
  }

  const teams = teamsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-down">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-foreground)]">Teams</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization's collection teams and members.
          </p>
        </div>
        {canManageTeams && (
          <Button
            icon={Plus}
            onClick={() => navigate({ to: '/teams/new' })}
          >
            Create New Team
          </Button>
        )}
      </div>

      {/* Teams Table */}
      <div className="animate-fade-in-up animation-delay-100">
        <DataTable
          columns={columns}
          data={teams}
          isLoading={isLoading}
          title="All Teams"
          emptyState={
            canManageTeams
              ? {
                  icon: LayoutDashboard,
                  title: 'No teams found',
                  description: 'Create your first team to start organizing collectors.',
                  action: {
                    label: 'Create Team',
                    onClick: () => navigate({ to: '/teams/new' }),
                  },
                }
              : {
                  icon: LayoutDashboard,
                  title: 'No teams found',
                  description: 'Your organization has no teams set up yet.',
                }
          }
          getRowKey={(team) => team.id}
          onRowClick={(team) => navigate({ to: '/teams/$teamId', params: { teamId: team.id } })}
          loadingMessage="Loading teams..."
        />
      </div>
    </div>
  );
}
