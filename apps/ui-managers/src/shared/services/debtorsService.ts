import { debtorsApiClient } from './apiClient.js';
import { getCurrentOrganizationId } from '../utils/auth.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type {
  CreateDebtorDto,
  PartialUpdateDebtorDto,
  ProfilesControllerFindAllParams,
  PaginatedDebtorsDto,
  DebtorProfileEntity,
} from '../../api/generated/debtors_models/index.js';

export const debtorsService = {
  listDebtors: async (
    query?: ProfilesControllerFindAllParams,
    config?: AxiosRequestConfig
  ): Promise<PaginatedDebtorsDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await debtorsApiClient.get<PaginatedDebtorsDto>(
      `/v1/debtors/profiles/orgs/${orgId}`,
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
      `/v1/debtors/profiles/orgs/${orgId}/${debtorId}`,
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
      `/v1/debtors/profiles/orgs/${orgId}`,
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
      `/v1/debtors/profiles/orgs/${orgId}/${debtorId}`,
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
    await debtorsApiClient.delete(`/v1/debtors/profiles/orgs/${orgId}/${debtorId}`, config);
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
      `/v1/debtors/profiles/orgs/${orgId}`,
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
