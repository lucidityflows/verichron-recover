import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { getCurrentOrganizationId } from '@/shared/utils/auth';
import { useUser } from '@/shared/store/userStore';
import { useTeamsControllerGetUserTeams } from '@/api/generated/organizations/endpoints/teams/teams';
import type { TeamResponseDto } from '@/api/generated/organizations_models';

interface TeamContextType {
  selectedTeamId: string | null;
  setSelectedTeamId: (teamId: string | null) => void;
  currentUserTeams: TeamResponseDto[] | undefined;
  isLoadingUserTeams: boolean;
  isErrorUserTeams: boolean;
  errorUserTeams: Error | null;
  selectedTeam: TeamResponseDto | undefined;
  isTeamLead: boolean;
  canManageTeams: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const orgId = getCurrentOrganizationId();
  const { userId, hasPermission } = useUser();

  // Fetch teams the current user belongs to
  const {
    data: userTeamsData,
    isLoading: isLoadingUserTeams,
    isError: isErrorUserTeams,
    error: errorUserTeams,
  } = useTeamsControllerGetUserTeams(
    orgId!,
    userId!,
    { query: { enabled: !!orgId && !!userId } }
  );

  const currentUserTeams = userTeamsData?.data;

  // State for the currently selected team ID
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Determine the initially selected team
  useEffect(() => {
    if (currentUserTeams && currentUserTeams.length > 0 && selectedTeamId === null) {
      // Find the team where user is manager or default to the first one
      const managedTeam = currentUserTeams.find(team => team.managerUserId === userId);
      setSelectedTeamId(managedTeam?.id || currentUserTeams[0].id);
    } else if (!currentUserTeams || currentUserTeams.length === 0) {
      setSelectedTeamId(null);
    }
  }, [currentUserTeams, selectedTeamId, userId]);

  // Derive context properties
  const selectedTeam = useMemo(() => {
    return currentUserTeams?.find(team => team.id === selectedTeamId);
  }, [currentUserTeams, selectedTeamId]);

  const isTeamLead = useMemo(() => {
    return selectedTeam?.managerUserId === userId;
  }, [selectedTeam, userId]);

  const canManageTeams = useMemo(() => {
    return hasPermission('teams:manage');
  }, [hasPermission]);

  const value = useMemo(
    () => ({
      selectedTeamId,
      setSelectedTeamId,
      currentUserTeams,
      isLoadingUserTeams,
      isErrorUserTeams,
      errorUserTeams: errorUserTeams as Error | null,
      selectedTeam,
      isTeamLead,
      canManageTeams,
    }),
    [
      selectedTeamId,
      setSelectedTeamId,
      currentUserTeams,
      isLoadingUserTeams,
      isErrorUserTeams,
      errorUserTeams,
      selectedTeam,
      isTeamLead,
      canManageTeams,
    ]
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
