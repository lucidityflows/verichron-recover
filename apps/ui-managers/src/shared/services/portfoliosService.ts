import { debtsApiClient } from './apiClient.js';
import { getCurrentOrganizationId } from '../utils/auth.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type {
  PortfolioResponseDto,
  PaginatedPortfolioResponseDto,
  PortfoliosControllerFindAllParams,
  CreatePortfolioDto,
  UpdatePortfolioDto,
} from '../../api/generated/debts_models/index.js';

export const portfoliosService = {
  listPortfolios: async (
    query?: PortfoliosControllerFindAllParams,
    config?: AxiosRequestConfig
  ): Promise<PaginatedPortfolioResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtsApiClient.get<PaginatedPortfolioResponseDto>(
      `/v1/debts/portfolios/orgs/${orgId}`,
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
      `/v1/debts/portfolios/orgs/${orgId}/${portfolioId}`,
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
      `/v1/debts/portfolios/orgs/${orgId}`,
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
      `/v1/debts/portfolios/orgs/${orgId}/${portfolioId}`,
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
    await debtsApiClient.delete(`/v1/debts/portfolios/orgs/${orgId}/${portfolioId}`, config);
  },
};
