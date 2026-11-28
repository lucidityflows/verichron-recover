import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../../shared/services/analyticsService.js';
import { type AnalyticsControllerGetPortfolioPerformanceParams } from '../../../api/generated/organizations_models/index.js';

export const usePortfolioPerformance = (orgId?: string | null, params?: AnalyticsControllerGetPortfolioPerformanceParams) => {
  return useQuery({
    queryKey: ['portfolioPerformance', orgId, params],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required');
      return analyticsService.getPortfolioPerformance(orgId, params);
    },
    enabled: !!orgId,
    staleTime: 60000,
    retry: 2, // Limit retries to prevent infinite loading
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });
};
