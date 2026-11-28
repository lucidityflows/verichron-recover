import { organizationsApiClient } from './apiClient';
import type {
  DashboardSummaryResponseDto,
  RecoveryTrendsResponseDto,
  PortfolioPerformanceResponseDto,
  FlowAnalyticsResponseDto,
  GeographicDebtAgeAnalyticsDto,
  GeographicCreditorAnalyticsDto,
  GeographicDebtorAnalyticsDto,
  GeographicDefaultRiskAnalyticsDto,
  GeographicLikelihoodToPayAnalyticsDto,
  GeographicPaymentPlanAnalyticsDto,
  GeographicResponsivenessAnalyticsDto,
  TeamOverviewResponseDto,
  ActivityFeedResponseDto,
  AnalyticsControllerGetRecoveryTrendsParams,
  AnalyticsControllerGetFlowAnalyticsParams,
  AnalyticsControllerGetDebtAgeGeographicParams,
  AnalyticsControllerGetCreditorGeographicParams,
  AnalyticsControllerGetDebtorGeographicParams,
  AnalyticsControllerGetDefaultRiskGeographicParams,
  AnalyticsControllerGetLikelihoodToPayGeographicParams,
  AnalyticsControllerGetPaymentPlanGeographicParams,
  AnalyticsControllerGetResponsivenessGeographicParams,
  AnalyticsControllerGetPortfolioPerformanceParams,
  AnalyticsControllerGetTeamOverviewParams,
  AnalyticsControllerGetActivityFeedParams,
} from '../../api/generated/organizations_models';
import type { AxiosRequestConfig } from '@verichron/api-client';

// Extend params types to include optional teamId
interface TeamAwareAnalyticsParams {
  teamId?: string;
}

export const analyticsService = {
  getDashboardSummary: async (
    orgId: string,
    params?: { teamId?: string }, // Add teamId here if backend supports it
    config?: AxiosRequestConfig
  ): Promise<DashboardSummaryResponseDto> => {
    const response = await organizationsApiClient.get<DashboardSummaryResponseDto>(
      `/organizations/${orgId}/dashboard-summary`,
      { params: params, ...config }
    );
    console.log('[analyticsService] Raw response data:', response.data);
    return response.data;
  },

  getTeamOverview: async (
    orgId: string,
    params?: AnalyticsControllerGetTeamOverviewParams,
    config?: AxiosRequestConfig
  ): Promise<TeamOverviewResponseDto> => {
    const response = await organizationsApiClient.get<TeamOverviewResponseDto>(
      `/organizations/${orgId}/analytics/team-overview`,
      { params, ...config }
    );
    return response.data;
  },

  getActivityFeed: async (
    orgId: string,
    params?: AnalyticsControllerGetActivityFeedParams,
    config?: AxiosRequestConfig
  ): Promise<ActivityFeedResponseDto> => {
    const response = await organizationsApiClient.get<ActivityFeedResponseDto>(
      `/organizations/${orgId}/analytics/activity-feed`,
      { params, ...config }
    );
    return response.data;
  },

  getRecoveryTrends: async (
    orgId: string,
    query?: AnalyticsControllerGetRecoveryTrendsParams & TeamAwareAnalyticsParams, // Extend params
    config?: AxiosRequestConfig
  ): Promise<RecoveryTrendsResponseDto> => {
    const response = await organizationsApiClient.get<RecoveryTrendsResponseDto>(
      `/organizations/${orgId}/analytics/recovery-trends`,
      { params: query, ...config }
    );
    return response.data;
  },

  getPortfolioPerformance: async (
    orgId: string,
    query?: AnalyticsControllerGetPortfolioPerformanceParams & TeamAwareAnalyticsParams, // Extend params
    config?: AxiosRequestConfig
  ): Promise<PortfolioPerformanceResponseDto> => {
    const response = await organizationsApiClient.get<PortfolioPerformanceResponseDto>(
      `/organizations/${orgId}/analytics/portfolio-performance`,
      { params: query, ...config }
    );
    return response.data;
  },

  getFlowAnalytics: async (
    orgId: string,
    query: AnalyticsControllerGetFlowAnalyticsParams & TeamAwareAnalyticsParams, // Extend params
    config?: AxiosRequestConfig
  ): Promise<FlowAnalyticsResponseDto> => {
    const response = await organizationsApiClient.get<FlowAnalyticsResponseDto>(
      `/organizations/${orgId}/analytics/flow`,
      { params: query, ...config }
    );
    return response.data;
  },

  getDebtAgeGeographic: async (
    orgId: string,
    query?: AnalyticsControllerGetDebtAgeGeographicParams & TeamAwareAnalyticsParams, // Extend params
    config?: AxiosRequestConfig
  ): Promise<GeographicDebtAgeAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicDebtAgeAnalyticsDto>(
      `/organizations/${orgId}/analytics/geographic/debt-age`,
      { params: query, ...config }
    );
    return response.data;
  },

  getCreditorGeographic: async (
    orgId: string,
    query?: AnalyticsControllerGetCreditorGeographicParams & TeamAwareAnalyticsParams, // Extend params
    config?: AxiosRequestConfig
  ): Promise<GeographicCreditorAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicCreditorAnalyticsDto>(
      `/organizations/${orgId}/analytics/geographic/creditors`,
      { params: query, ...config }
    );
    return response.data;
  },

  getDebtorGeographic: async (
    orgId: string,
    query?: AnalyticsControllerGetDebtorGeographicParams & TeamAwareAnalyticsParams, // Extend params
    config?: AxiosRequestConfig
  ): Promise<GeographicDebtorAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicDebtorAnalyticsDto>(
      `/organizations/${orgId}/analytics/geographic/debtors`,
      { params: query, ...config }
    );
    return response.data;
  },

  getDefaultRiskGeographic: async (
    orgId: string,
    query?: AnalyticsControllerGetDefaultRiskGeographicParams & TeamAwareAnalyticsParams, // Extend params
    config?: AxiosRequestConfig
  ): Promise<GeographicDefaultRiskAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicDefaultRiskAnalyticsDto>(
      `/organizations/${orgId}/analytics/geographic/default-risk`,
      { params: query, ...config }
    );
    return response.data;
  },

  getLikelihoodToPayGeographic: async (
    orgId: string,
    query?: AnalyticsControllerGetLikelihoodToPayGeographicParams & TeamAwareAnalyticsParams, // Extend params
    config?: AxiosRequestConfig
  ): Promise<GeographicLikelihoodToPayAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicLikelihoodToPayAnalyticsDto>(
      `/organizations/${orgId}/analytics/geographic/likelihood-to-pay`,
      { params: query, ...config }
    );
    return response.data;
  },

  getPaymentPlanGeographic: async (
    orgId: string,
    query?: AnalyticsControllerGetPaymentPlanGeographicParams & TeamAwareAnalyticsParams, // Extend params
    config?: AxiosRequestConfig
  ): Promise<GeographicPaymentPlanAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicPaymentPlanAnalyticsDto>(
      `/organizations/${orgId}/analytics/geographic/payment-plans`,
      { params: query, ...config }
    );
    return response.data;
  },

  getResponsivenessGeographic: async (
    orgId: string,
    query?: AnalyticsControllerGetResponsivenessGeographicParams & TeamAwareAnalyticsParams, // Extend params
    config?: AxiosRequestConfig
  ): Promise<GeographicResponsivenessAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicResponsivenessAnalyticsDto>(
      `/organizations/${orgId}/analytics/geographic/responsiveness`,
      { params: query, ...config }
    );
    return response.data;
  },
};
