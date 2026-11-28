import { useQuery } from '@tanstack/react-query';
import { dashboardService, type ManagerDashboard } from '../../../shared/services/dashboardService.js';

export const useManagerDashboard = (orgId?: string | null, teamId?: string) => {
  return useQuery<ManagerDashboard>({
    queryKey: ['managerDashboard', orgId, teamId],
    queryFn: () => dashboardService.getManagerDashboard(orgId!, { teamId }),
    enabled: !!orgId,
    // Refresh every 30 seconds for "Live" feel
    refetchInterval: 30000, 
  });
};
