import { useQuery } from '@tanstack/react-query';
import { teamsControllerGetTeams } from '@/api/generated/organizations/endpoints/teams/teams';

export const useTeams = (organizationId?: string | null) => {
  return useQuery({
    queryKey: ['teams', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');
      const response = await teamsControllerGetTeams(organizationId);
      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
};