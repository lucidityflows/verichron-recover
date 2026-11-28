/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { debtsApiClient } from './apiClient';
import { getCurrentOrganizationId } from '../utils/auth';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type {
  DebtResponseDto,
  PaginatedDebtResponseDto,
  DebtsControllerFindAllParams,
  CreateDebtDto,
  UpdateDebtDto,
} from '../../api/generated/debts_models';

export const debtsService = {
  listDebts: async (
    query?: DebtsControllerFindAllParams,
    config?: AxiosRequestConfig
  ): Promise<PaginatedDebtResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtsApiClient.get<PaginatedDebtResponseDto>(
      `/organizations/${orgId}/debts`,
      { params: query, ...config }
    );
    return response.data;
  },

  getDebtById: async (
    debtId: string,
    config?: AxiosRequestConfig
  ): Promise<DebtResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtsApiClient.get<DebtResponseDto>(
      `/organizations/${orgId}/debts/${debtId}`,
      config
    );
    return response.data;
  },

  createDebt: async (
    dto: CreateDebtDto,
    config?: AxiosRequestConfig
  ): Promise<DebtResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtsApiClient.post<DebtResponseDto>(
      `/organizations/${orgId}/debts`,
      dto,
      config
    );
    return response.data;
  },

  updateDebt: async (
    debtId: string,
    dto: UpdateDebtDto,
    config?: AxiosRequestConfig
  ): Promise<DebtResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtsApiClient.patch<DebtResponseDto>(
      `/organizations/${orgId}/debts/${debtId}`,
      dto,
      config
    );
    return response.data;
  },

  deleteDebt: async (
    debtId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    await debtsApiClient.delete(`/organizations/${orgId}/debts/${debtId}`, config);
  },

  /**
   * Search debts by query parameters
   * Returns an array of debts matching the search criteria
   */
  searchDebts: async (
    orgId: string,
    params: { query: string; limit?: number },
    config?: AxiosRequestConfig
  ): Promise<DebtResponseDto[]> => {
    const response = await debtsApiClient.get<PaginatedDebtResponseDto>(
      `/organizations/${orgId}/debts`,
      {
        params: {
          search: params.query,
          limit: params.limit || 10,
        },
        ...config
      }
    );
    return response.data.data || [];
  },
};
