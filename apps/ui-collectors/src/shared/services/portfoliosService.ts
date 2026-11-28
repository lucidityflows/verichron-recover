import { debtsApiClient } from './apiClient';
import { getCurrentOrganizationId } from '../utils/auth';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type {
  PortfolioResponseDto,
  PaginatedPortfolioResponseDto,
  PortfoliosControllerFindAllParams,
  CreatePortfolioDto,
  UpdatePortfolioDto,
} from '../../api/generated/debts_models';

export const portfoliosService = {
  listPortfolios: async (
    query?: PortfoliosControllerFindAllParams,
    config?: AxiosRequestConfig
  ): Promise<PaginatedPortfolioResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtsApiClient.get<PaginatedPortfolioResponseDto>(
      `/organizations/${orgId}/portfolios`,
      { params: query, ...config }
    );
    return response.data;
  },

  getPortfolioById: async (
    portfolioId: string,
    config?: AxiosRequestConfig
  ): Promise<PortfolioResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtsApiClient.get<PortfolioResponseDto>(
      `/organizations/${orgId}/portfolios/${portfolioId}`,
      config
    );
    return response.data;
  },

  createPortfolio: async (
    dto: CreatePortfolioDto,
    config?: AxiosRequestConfig
  ): Promise<PortfolioResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtsApiClient.post<PortfolioResponseDto>(
      `/organizations/${orgId}/portfolios`,
      dto,
      config
    );
    return response.data;
  },

  updatePortfolio: async (
    portfolioId: string,
    dto: UpdatePortfolioDto,
    config?: AxiosRequestConfig
  ): Promise<PortfolioResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtsApiClient.patch<PortfolioResponseDto>(
      `/organizations/${orgId}/portfolios/${portfolioId}`,
      dto,
      config
    );
    return response.data;
  },

  deletePortfolio: async (
    portfolioId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    await debtsApiClient.delete(`/organizations/${orgId}/portfolios/${portfolioId}`, config);
  },
};
