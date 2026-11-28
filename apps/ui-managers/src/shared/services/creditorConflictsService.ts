import { debtsApiClient } from './apiClient.js';
import { getCurrentOrganizationId } from '../utils/auth.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type {
  ConflictResponseDto,
  CreditorConflictsControllerFindPendingParams,
  ResolveConflictDto,
} from '../../api/generated/debts_models/index.js';

/**
 * Creditor Conflicts Service
 *
 * Handles the manual review queue for creditor entity resolution conflicts.
 * Powers the CreditorResolver UI workflow.
 */
export const creditorConflictsService = {
  /**
   * List pending conflicts with pagination and filtering
   */
  listConflicts: async (
    params?: CreditorConflictsControllerFindPendingParams,
    config?: AxiosRequestConfig
  ): Promise<{ conflicts: ConflictResponseDto[]; total: number }> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');

    const response = await debtsApiClient.get<{
      conflicts: ConflictResponseDto[];
      total: number;
    }>(`/v1/debts/creditor-conflicts/orgs/${orgId}`, { params, ...config });
    return response.data;
  },

  /**
   * Get a single conflict by ID with detailed match suggestions
   */
  getConflictById: async (
    conflictId: string,
    config?: AxiosRequestConfig
  ): Promise<ConflictResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');

    const response = await debtsApiClient.get<ConflictResponseDto>(
      `/v1/debts/creditor-conflicts/orgs/${orgId}/${conflictId}`,
      config
    );
    return response.data;
  },

  /**
   * Resolve a conflict via merge, create new, or dismiss
   */
  resolveConflict: async (
    conflictId: string,
    dto: ResolveConflictDto,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');

    await debtsApiClient.post(
      `/v1/debts/creditor-conflicts/orgs/${orgId}/${conflictId}/resolve`,
      dto,
      config
    );
  },
};
