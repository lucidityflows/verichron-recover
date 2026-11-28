import { useUser } from '@/shared/store/userStore';
import { usePerformanceControllerGetTodayStats, usePerformanceControllerGetDashboardSummary } from '@/api/generated/collectors/endpoints/collector-performance/collector-performance';
import { useGoalsControllerListGoals } from '@/api/generated/collectors/endpoints/goals/goals';

/**
 * useCollectorStats
 * Fetches real-time performance metrics for the logged-in collector
 *
 * Returns:
 * - Today's stats (collected, calls made, PTPs, etc.)
 * - Dashboard summary (week/month trends)
 * - Active goals with progress
 *
 * Auto-refreshes every 60 seconds for live updates
 */
export const useCollectorStats = () => {
  const { organizationId, userId } = useUser();

  const todayStatsQuery = usePerformanceControllerGetTodayStats(
    organizationId!,
    {
      query: {
        enabled: !!organizationId && !!userId,
        refetchInterval: 60000, // Refresh every 60 seconds
        staleTime: 30000, // Consider fresh for 30 seconds
      },
    }
  );

  const dashboardQuery = usePerformanceControllerGetDashboardSummary(
    organizationId!,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    {} as any, // Don't pass teamId to let backend use user context
    {
      query: {
        enabled: !!organizationId && !!userId,
        refetchInterval: 60000,
      },
    }
  );

  const goalsQuery = useGoalsControllerListGoals(
    organizationId!,
    { isActive: true },
    {
      query: {
        enabled: !!organizationId && !!userId,
        refetchInterval: 60000,
      },
    }
  );

  return {
    today: todayStatsQuery.data,
    dashboard: dashboardQuery.data,
    goals: goalsQuery.data?.data ?? [],
    isLoading: todayStatsQuery.isLoading || dashboardQuery.isLoading || goalsQuery.isLoading,
    isError: todayStatsQuery.isError || dashboardQuery.isError || goalsQuery.isError,
    error: todayStatsQuery.error ?? dashboardQuery.error ?? goalsQuery.error,
  };
};
