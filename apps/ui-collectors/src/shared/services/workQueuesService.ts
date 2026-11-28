import { collectorsApiClient } from './apiClient';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type {
  WorkQueueResponseDto,
  WorkQueueControllerGetWorkQueueParams,
  WorkQueueItemDto,
} from '../../api/generated/work-queues_models';

// Export types for easier usage in components
export type { WorkQueueItemDto, WorkQueueResponseDto };

// Extend WorkQueueQueryParams to explicitly include teamId
export interface WorkQueueQueryParams extends WorkQueueControllerGetWorkQueueParams {
  teamId?: string;
}

/**
 * Service for managing work queue operations
 * Provides methods for collectors and managers to interact with work queues
 */
export const workQueuesService = {
  /**
   * Get work queue items with filtering, sorting, and pagination
   * 
   * Behavior:
   * - Collectors see only items assigned to them or unassigned items
   * - Managers can filter by assignedToUserId to view specific collector queues
   * - Returns summary statistics for the filtered queue
   * 
   * @param orgId - Organization ID
   * @param query - Optional filters and pagination parameters, including teamId
   * @param config - Optional Axios request configuration
   * @returns Promise with paginated work queue items and summary statistics
   */
  getWorkQueue: async (
    orgId: string,
    query?: WorkQueueQueryParams, // Use extended type
    config?: AxiosRequestConfig
  ): Promise<WorkQueueResponseDto> => {
    const response = await collectorsApiClient.get<WorkQueueResponseDto>(
      `/organizations/${orgId}/work-queues`,
      { params: query, ...config }
    );
    return response.data;
  },

  /**
   * Get work queue summary statistics
   * Useful for dashboard widgets showing queue metrics
   * 
   * @param orgId - Organization ID
   * @param query - Optional filters to apply to statistics, including teamId
   * @param config - Optional Axios request configuration
   * @returns Promise with summary statistics only
   */
  getQueueSummary: async (
    orgId: string,
    query?: WorkQueueQueryParams, // Use extended type
    config?: AxiosRequestConfig
  ): Promise<WorkQueueResponseDto['summary']> => {
    const response = await collectorsApiClient.get<WorkQueueResponseDto>(
      `/organizations/${orgId}/work-queues`,
      { params: query, ...config }
    );
    return response.data.summary;
  },

  /**
   * Get aggregate statistics for the work queue (alias for getQueueSummary)
   * Used by CollectorDashboard
   * 
   * @param orgId - Organization ID
   * @param query - Optional filters to apply, including teamId
   * @param config - Optional Axios request configuration
   * @returns Promise with queue statistics
   */
  getQueueStats: async (
    orgId: string,
    query?: WorkQueueQueryParams, // Add query parameter here
    config?: AxiosRequestConfig
  ): Promise<WorkQueueResponseDto['summary']> => {
    return workQueuesService.getQueueSummary(orgId, query, config); // Pass query through
  },

  /**
   * Update the status of a work queue item
   * 
   * @param orgId - Organization ID
   * @param itemId - Work queue item ID
   * @param status - New status
   * @param config - Optional Axios request configuration
   * @returns Promise with updated item
   */
  updateItemStatus: async (
    orgId: string,
    itemId: string,
    status: 'pending' | 'in_progress' | 'completed',
    config?: AxiosRequestConfig
  ): Promise<WorkQueueItemDto> => {
    const response = await collectorsApiClient.patch<WorkQueueItemDto>(
      `/organizations/${orgId}/work-queues/${itemId}/status`,
      { status },
      config
    );
    return response.data;
  },

  /**
   * Perform bulk action on multiple work queue items
   * 
   * @param orgId - Organization ID
   * @param data - Bulk action data
   * @param config - Optional Axios request configuration
   * @returns Promise with bulk action result
   */
  bulkAction: async (
    orgId: string,
    data: {
      itemIds: string[];
      actionType: 'assign' | 'reassign' | 'complete' | 'defer';
      assignData?: { assignTo: string };
      deferData?: { deferUntil: Date; reason?: string };
    },
    config?: AxiosRequestConfig
  ): Promise<{ success: boolean; updatedCount: number }> => {
    const response = await collectorsApiClient.post<{ success: boolean; updatedCount: number }>(
      `/organizations/${orgId}/work-queues/bulk-action`,
      data,
      config
    );
    return response.data;
  },
};