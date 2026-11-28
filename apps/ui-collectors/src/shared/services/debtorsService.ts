import { debtorsApiClient } from './apiClient';
import { getCurrentOrganizationId } from '../utils/auth';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type {
  CreateDebtorDto,
  PartialUpdateDebtorDto,
  ProfilesControllerFindAllParams,
  PaginatedDebtorsDto,
  DebtorProfileEntity,
} from '../../api/generated/debtors_models';

export const debtorsService = {
  listDebtors: async (
    query?: ProfilesControllerFindAllParams,
    config?: AxiosRequestConfig
  ): Promise<PaginatedDebtorsDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtorsApiClient.get<PaginatedDebtorsDto>(
      `/organizations/${orgId}/debtors`,
      { params: query, ...config }
    );
    return response.data;
  },

  getDebtorById: async (
    debtorId: string,
    config?: AxiosRequestConfig
  ): Promise<DebtorProfileEntity> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtorsApiClient.get<DebtorProfileEntity>(
      `/organizations/${orgId}/debtors/${debtorId}`,
      config
    );
    return response.data;
  },

  createDebtor: async (
    dto: CreateDebtorDto,
    config?: AxiosRequestConfig
  ): Promise<DebtorProfileEntity> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtorsApiClient.post<DebtorProfileEntity>(
      `/organizations/${orgId}/debtors`,
      dto,
      config
    );
    return response.data;
  },

  updateDebtor: async (
    debtorId: string,
    dto: PartialUpdateDebtorDto,
    config?: AxiosRequestConfig
  ): Promise<DebtorProfileEntity> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtorsApiClient.patch<DebtorProfileEntity>(
      `/organizations/${orgId}/debtors/${debtorId}`,
      dto,
      config
    );
    return response.data;
  },

  deleteDebtor: async (
    debtorId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    await debtorsApiClient.delete(`/organizations/${orgId}/debtors/${debtorId}`, config);
  },

  /**
   * Search debtors by name, email, phone, or other criteria
   * Returns an array of debtor profiles matching the search term
   */
  searchDebtors: async (
    orgId: string,
    searchTerm: string,
    config?: AxiosRequestConfig
  ): Promise<DebtorProfileEntity[]> => {
    const response = await debtorsApiClient.get<PaginatedDebtorsDto>(
      `/organizations/${orgId}/debtors`,
      {
        params: {
          search: searchTerm,
          limit: 10,
        },
        ...config
      }
    );
    return response.data.data || [];
  },
};
