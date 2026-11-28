import {
  DashboardSummaryResponseDto,
  AnalyticsControllerGetRecoveryTrendsParams,
  RecoveryTrendsResponseDto,
  PortfolioPerformanceResponseDto,
  AnalyticsControllerGetDebtAgeGeographicParams,
  GeographicDebtAgeAnalyticsDto,
  GeographicCreditorAnalyticsDto,
  GeographicDebtorAnalyticsDto,
  GeographicDefaultRiskAnalyticsDto,
  GeographicLikelihoodToPayAnalyticsDto,
  GeographicPaymentPlanAnalyticsDto,
  GeographicResponsivenessAnalyticsDto,
  GeographicCombinedAnalyticsDto
} from '../../api/generated/organizations_models/index.js'; // Assuming generated types are here
import type { AxiosRequestConfig } from '@verichron/api-client';
import {
  organizationsApiClient,
} from './apiClient.js';

export const analyticsService = {
  getDashboardSummary: async (orgId: string, config?: AxiosRequestConfig): Promise<DashboardSummaryResponseDto> => {
    const response = await organizationsApiClient.get<DashboardSummaryResponseDto>(`/v1/organizations/analytics/orgs/${orgId}/dashboard-summary`, config);
    return response.data;
  },
  getRecoveryTrends: async (orgId: string, query?: AnalyticsControllerGetRecoveryTrendsParams, config?: AxiosRequestConfig): Promise<RecoveryTrendsResponseDto> => {
    const response = await organizationsApiClient.get<RecoveryTrendsResponseDto>(`/v1/organizations/analytics/orgs/${orgId}/recovery-trends`, { params: query, ...config });
    return response.data;
  },
  getPortfolioPerformance: async (orgId: string, config?: AxiosRequestConfig): Promise<PortfolioPerformanceResponseDto> => {
    const response = await organizationsApiClient.get<PortfolioPerformanceResponseDto>(`/v1/organizations/analytics/orgs/${orgId}/portfolio-performance`, config);
    return response.data;
  },
  getDebtAgeGeographic: async (orgId: string, query?: AnalyticsControllerGetDebtAgeGeographicParams, config?: AxiosRequestConfig): Promise<GeographicDebtAgeAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicDebtAgeAnalyticsDto>(`/v1/organizations/analytics/orgs/${orgId}/geographic/debt-age`, { params: query, ...config });
    return response.data;
  },
  getCreditorGeographic: async (orgId: string, query?: AnalyticsControllerGetDebtAgeGeographicParams, config?: AxiosRequestConfig): Promise<GeographicCreditorAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicCreditorAnalyticsDto>(`/v1/organizations/analytics/orgs/${orgId}/geographic/creditors`, { params: query, ...config });
    return response.data;
  },
  getDebtorGeographic: async (orgId: string, query?: AnalyticsControllerGetDebtAgeGeographicParams, config?: AxiosRequestConfig): Promise<GeographicDebtorAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicDebtorAnalyticsDto>(`/v1/organizations/analytics/orgs/${orgId}/geographic/debtors`, { params: query, ...config });
    return response.data;
  },
  getDefaultRiskGeographic: async (orgId: string, query?: AnalyticsControllerGetDebtAgeGeographicParams, config?: AxiosRequestConfig): Promise<GeographicDefaultRiskAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicDefaultRiskAnalyticsDto>(`/v1/organizations/analytics/orgs/${orgId}/geographic/default-risk`, { params: query, ...config });
    return response.data;
  },
  getLikelihoodToPayGeographic: async (orgId: string, query?: AnalyticsControllerGetDebtAgeGeographicParams, config?: AxiosRequestConfig): Promise<GeographicLikelihoodToPayAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicLikelihoodToPayAnalyticsDto>(`/v1/organizations/analytics/orgs/${orgId}/geographic/likelihood-to-pay`, { params: query, ...config });
    return response.data;
  },
  getPaymentPlanGeographic: async (orgId: string, query?: AnalyticsControllerGetDebtAgeGeographicParams, config?: AxiosRequestConfig): Promise<GeographicPaymentPlanAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicPaymentPlanAnalyticsDto>(`/v1/organizations/analytics/orgs/${orgId}/geographic/payment-plans`, { params: query, ...config });
    return response.data;
  },
  getResponsivenessGeographic: async (orgId: string, query?: AnalyticsControllerGetDebtAgeGeographicParams, config?: AxiosRequestConfig): Promise<GeographicResponsivenessAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicResponsivenessAnalyticsDto>(`/v1/organizations/analytics/orgs/${orgId}/geographic/responsiveness`, { params: query, ...config });
    return response.data;
  },
  getCombinedGeographic: async (orgId: string, query?: AnalyticsControllerGetDebtAgeGeographicParams, config?: AxiosRequestConfig): Promise<GeographicCombinedAnalyticsDto> => {
    const response = await organizationsApiClient.get<GeographicCombinedAnalyticsDto>(`/v1/organizations/analytics/orgs/${orgId}/geographic/combined`, { params: query, ...config });
    return response.data;
  },
};
