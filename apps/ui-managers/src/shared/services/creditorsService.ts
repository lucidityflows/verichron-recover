import { debtsApiClient } from './apiClient.js';
import { getCurrentOrganizationId } from '../utils/auth.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type {
  CreditorResponseDto,
  CreditorsControllerFindAllParams,
  CreateCreditorDto,
  UpdateCreditorDto,
  MergeCreditorDto,
} from '../../api/generated/debts_models/index.js';

/**
 * Creditors Service
 *
 * Handles CRUD operations and merging for creditor master data.
 * All requests automatically include the current organization ID.
 */
export const creditorsService = {
  /**
   * List all creditors for the current organization
   */
  listCreditors: async (
    params?: CreditorsControllerFindAllParams,
    config?: AxiosRequestConfig
  ): Promise<{ creditors: CreditorResponseDto[]; total: number }> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');

    const response = await debtsApiClient.get<{ creditors: CreditorResponseDto[]; total: number }>(
      `/v1/debts/creditors/orgs/${orgId}`,
      { params, ...config }
    );
    return response.data;
  },

  /**
   * Get a single creditor by ID
   */
  getCreditorById: async (
    creditorId: string,
    config?: AxiosRequestConfig
  ): Promise<CreditorResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');

    const response = await debtsApiClient.get<CreditorResponseDto>(
      `/v1/debts/creditors/orgs/${orgId}/${creditorId}`,
      config
    );
    return response.data;
  },

  /**
   * Create a new creditor
   */
  createCreditor: async (
    dto: CreateCreditorDto,
    config?: AxiosRequestConfig
  ): Promise<CreditorResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');

    const response = await debtsApiClient.post<CreditorResponseDto>(
      `/v1/debts/creditors/orgs/${orgId}`,
      dto,
      config
    );
    return response.data;
  },

  /**
   * Update a creditor
   */
  updateCreditor: async (
    creditorId: string,
    dto: UpdateCreditorDto,
    config?: AxiosRequestConfig
  ): Promise<CreditorResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');

    const response = await debtsApiClient.patch<CreditorResponseDto>(
      `/v1/debts/creditors/orgs/${orgId}/${creditorId}`,
      dto,
      config
    );
    return response.data;
  },

  /**
   * Soft delete a creditor
   */
  deleteCreditor: async (
    creditorId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');

    await debtsApiClient.delete(
      `/v1/debts/creditors/orgs/${orgId}/${creditorId}`,
      config
    );
  },

  /**
   * Merge duplicate creditor into master
   */
  mergeCreditor: async (
    duplicateCreditorId: string,
    dto: MergeCreditorDto,
    config?: AxiosRequestConfig
  ): Promise<CreditorResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');

    const response = await debtsApiClient.post<CreditorResponseDto>(
      `/v1/debts/creditors/orgs/${orgId}/${duplicateCreditorId}/merge`,
      dto,
      config
    );
    return response.data;
  },
};
