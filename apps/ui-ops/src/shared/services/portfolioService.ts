import {
  CreatePortfolioDto,
  UpdatePortfolioDto,
  PortfolioResponseDto,
  PaginatedPortfolioResponseDto,
  PortfoliosControllerFindAllParams,
  AssignUserDto,
  PortfolioUserAccessDto,
  TransferPortfolioDto,
} from '../../api/generated/debts_models/index.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
import { debtsApiClient } from './apiClient.js';

export const portfolioService = {
  createPortfolio: async (orgId: string, dto: CreatePortfolioDto, config?: AxiosRequestConfig): Promise<PortfolioResponseDto> => {
    const response = await debtsApiClient.post<PortfolioResponseDto>(`/v1/debts/portfolios/orgs/${orgId}`, dto, config);
    return response.data;
  },
  listPortfolios: async (orgId: string, query?: PortfoliosControllerFindAllParams, config?: AxiosRequestConfig): Promise<PaginatedPortfolioResponseDto> => {
    const response = await debtsApiClient.get<PaginatedPortfolioResponseDto>(`/v1/debts/portfolios/orgs/${orgId}`, { params: query, ...config });
    return response.data;
  },
  getPortfolioById: async (orgId: string, portfolioId: string, config?: AxiosRequestConfig): Promise<PortfolioResponseDto> => {
    const response = await debtsApiClient.get<PortfolioResponseDto>(`/v1/debts/portfolios/orgs/${orgId}/${portfolioId}`, config);
    return response.data;
  },
  updatePortfolio: async (orgId: string, portfolioId: string, dto: UpdatePortfolioDto, config?: AxiosRequestConfig): Promise<PortfolioResponseDto> => {
    const response = await debtsApiClient.patch<PortfolioResponseDto>(`/v1/debts/portfolios/orgs/${orgId}/${portfolioId}`, dto, config);
    return response.data;
  },
  deletePortfolio: async (orgId: string, portfolioId: string, config?: AxiosRequestConfig): Promise<void> => {
    await debtsApiClient.delete(`/v1/debts/portfolios/orgs/${orgId}/${portfolioId}`, config);
  },
  assignUser: async (orgId: string, portfolioId: string, dto: AssignUserDto, config?: AxiosRequestConfig): Promise<PortfolioUserAccessDto> => {
    const response = await debtsApiClient.post<PortfolioUserAccessDto>(`/v1/debts/portfolios/orgs/${orgId}/${portfolioId}/users`, dto, config);
    return response.data;
  },
  listUsers: async (orgId: string, portfolioId: string, config?: AxiosRequestConfig): Promise<PortfolioUserAccessDto[]> => {
    const response = await debtsApiClient.get<PortfolioUserAccessDto[]>(`/v1/debts/portfolios/orgs/${orgId}/${portfolioId}/users`, config);
    return response.data;
  },
  revokeUser: async (orgId: string, portfolioId: string, userId: string, config?: AxiosRequestConfig): Promise<void> => {
    await debtsApiClient.delete(`/v1/debts/portfolios/orgs/${orgId}/${portfolioId}/users/${userId}`, config);
  },
  transferPortfolio: async (orgId: string, portfolioId: string, dto: TransferPortfolioDto, config?: AxiosRequestConfig): Promise<PortfolioResponseDto> => {
    const response = await debtsApiClient.post<PortfolioResponseDto>(`/v1/debts/portfolios/orgs/${orgId}/${portfolioId}/transfer`, dto, config);
    return response.data;
  },
};
