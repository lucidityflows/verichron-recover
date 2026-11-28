import { collectorsApiClient } from './apiClient.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type {
  DebtorFocusResponseDto,
  LogDebtorActionDto,
  DebtorActionResponseDto,
  CollectorDashboardSummaryDto,
  PerformanceControllerGetDashboardSummaryParams // Correct name after feature realignment
} from '../../api/generated/collectors_models/index.js'


/**
 * Service for collector operations
 * Provides methods for collectors to interact with debtors and log actions
 */
export const collectorService = {
  /**
   * Get comprehensive debtor focus view (360-degree view)
   * 
   * Retrieves a complete view of a debtor aggregated from all services:
   * - Debtor profile and contact information
   * - All debts associated with this debtor
   * - Payment history and active payment plans
   * - Communication history
   * - Timeline of all interactions
   * - Available collector actions
   * - FDCPA compliance flags
   * 
   * This endpoint triggers an event orchestration that fans out to multiple
   * services and aggregates the results.
   * 
   * @param organizationId - The organization ID
   * @param debtorProfileId - The debtor profile ID
   * @param config - Optional Axios request configuration
   * @returns Promise with comprehensive debtor information
   */
  getDebtorFocus: async (
    organizationId: string,
    debtorProfileId: string,
    config?: AxiosRequestConfig
  ): Promise<DebtorFocusResponseDto> => {
    const response = await collectorsApiClient.get<DebtorFocusResponseDto>(
      `/v1/collectors/workstation/orgs/${organizationId}/debtors/${debtorProfileId}/focus`,
      config
    );
    return response.data;
  },

  /**
   * Log a collector action on a debtor
   * 
   * Logs a collector action such as:
   * - Phone calls (with outcome and notes)
   - Emails sent
   * - SMS messages sent
   * - Notes added
   * - Payments received
   * - Disputes logged
   * - Scheduled follow-ups
   * - Tag assignments
   * - Work item assignments
   * 
   * The action is added to the debtor's timeline and events are published
   * for downstream processing (e.g., updating work queue priority).
   * 
   * @param organizationId - The organization ID
   * @param debtorProfileId - The debtor profile ID
   * @param actionData - The action details to log
   * @param config - Optional Axios request configuration
   * @returns Promise with action logging result
   */
  logDebtorAction: async (
    organizationId: string,
    debtorProfileId: string,
    actionData: LogDebtorActionDto,
    config?: AxiosRequestConfig
  ): Promise<DebtorActionResponseDto> => {
    const response = await collectorsApiClient.post<DebtorActionResponseDto>(
      `/v1/collectors/workstation/orgs/${organizationId}/debtors/${debtorProfileId}/actions`,
      actionData,
      config
    );
    return response.data;
  },

  /**
   * Log a phone call action
   * Helper method to log phone call attempts with outcome
   * 
   * @param organizationId - The organization ID
   * @param debtorProfileId - The debtor profile ID
   * @param callData - Call details including outcome and notes
   * @param config - Optional Axios request configuration
   * @returns Promise with action logging result
   */
  logPhoneCall: async (
    organizationId: string,
    debtorProfileId: string,
    callData: {
      outcome: LogDebtorActionDto['outcome'];
      content: string;
      debtIds?: string[];
      scheduledFollowUp?: LogDebtorActionDto['scheduledFollowUp'];
      metadata?: LogDebtorActionDto['metadata'];
    },
    config?: AxiosRequestConfig
  ): Promise<DebtorActionResponseDto> => {
    const actionData: LogDebtorActionDto = {
      actionType: 'CALL',
      ...callData,
    };
    return collectorService.logDebtorAction(
      organizationId,
      debtorProfileId,
      actionData,
      config
    );
  },

  /**
   * Log a payment received
   * Helper method to log payment transactions
   * 
   * @param organizationId - The organization ID
   * @param debtorProfileId - The debtor profile ID
   * @param paymentData - Payment details
   * @param config - Optional Axios request configuration
   * @returns Promise with action logging result
   */
  logPayment: async (
    organizationId: string,
    debtorProfileId: string,
    paymentData: {
      content: string;
      paymentDetails: LogDebtorActionDto['paymentDetails'];
      debtIds?: string[];
      metadata?: LogDebtorActionDto['metadata'];
    },
    config?: AxiosRequestConfig
  ): Promise<DebtorActionResponseDto> => {
    const actionData: LogDebtorActionDto = {
      actionType: 'PAYMENT',
      ...paymentData,
    };
    return collectorService.logDebtorAction(
      organizationId,
      debtorProfileId,
      actionData,
      config
    );
  },

  /**
   * Log a note
   * Helper method to add notes to a debtor's timeline
   * 
   * @param organizationId - The organization ID
   * @param debtorProfileId - The debtor profile ID
   * @param noteData - Note content and related debt IDs
   * @param config - Optional Axios request configuration
   * @returns Promise with action logging result
   */
  logNote: async (
    organizationId: string,
    debtorProfileId: string,
    noteData: {
      content: string;
      debtIds?: string[];
      metadata?: LogDebtorActionDto['metadata'];
    },
    config?: AxiosRequestConfig
  ): Promise<DebtorActionResponseDto> => {
    const actionData: LogDebtorActionDto = {
      actionType: 'NOTE',
      ...noteData,
    };
    return collectorService.logDebtorAction(
      organizationId,
      debtorProfileId,
      actionData,
      config
    );
  },

  /**
   * Schedule a follow-up action
   * Helper method to schedule future collector actions
   * 
   * @param organizationId - The organization ID
   * @param debtorProfileId - The debtor profile ID
   * @param followUpData - Follow-up details and scheduling
   * @param config - Optional Axios request configuration
   * @returns Promise with action logging result
   */
  scheduleFollowUp: async (
    organizationId: string,
    debtorProfileId: string,
    followUpData: {
      content: string;
      scheduledFollowUp: LogDebtorActionDto['scheduledFollowUp'];
      debtIds?: string[];
      metadata?: LogDebtorActionDto['metadata'];
    },
    config?: AxiosRequestConfig
  ): Promise<DebtorActionResponseDto> => {
    const actionData: LogDebtorActionDto = {
      actionType: 'FOLLOW_UP',
      ...followUpData,
    };
    return collectorService.logDebtorAction(
      organizationId,
      debtorProfileId,
      actionData,
      config
    );
  },

  /**
   * Log an email sent
   * Helper method to log email communications
   * 
   * @param organizationId - The organization ID
   * @param debtorProfileId - The debtor profile ID
   * @param emailData - Email details
   * @param config - Optional Axios request configuration
   * @returns Promise with action logging result
   */
  logEmail: async (
    organizationId: string,
    debtorProfileId: string,
    emailData: {
      content: string;
      debtIds?: string[];
      metadata?: LogDebtorActionDto['metadata'];
    },
    config?: AxiosRequestConfig
  ): Promise<DebtorActionResponseDto> => {
    const actionData: LogDebtorActionDto = {
      actionType: 'EMAIL',
      ...emailData,
    };
    return collectorService.logDebtorAction(
      organizationId,
      debtorProfileId,
      actionData,
      config
    );
  },

  /**
   * Log an SMS sent
   * Helper method to log SMS communications
   * 
   * @param organizationId - The organization ID
   * @param debtorProfileId - The debtor profile ID
   * @param smsData - SMS details
   * @param config - Optional Axios request configuration
   * @returns Promise with action logging result
   */
  logSMS: async (
    organizationId: string,
    debtorProfileId: string,
    smsData: {
      content: string;
      debtIds?: string[];
      metadata?: LogDebtorActionDto['metadata'];
    },
    config?: AxiosRequestConfig
  ): Promise<DebtorActionResponseDto> => {
    const actionData: LogDebtorActionDto = {
      actionType: 'SMS',
      ...smsData,
    };
    return collectorService.logDebtorAction(
      organizationId,
      debtorProfileId,
      actionData,
      config
    );
  },

  /**
   * Log a dispute filed
   * Helper method to log debt disputes
   * 
   * @param organizationId - The organization ID
   * @param debtorProfileId - The debtor profile ID
   * @param disputeData - Dispute details
   * @param config - Optional Axios request configuration
   * @returns Promise with action logging result
   */
  logDispute: async (
    organizationId: string,
    debtorProfileId: string,
    disputeData: {
      content: string;
      debtIds?: string[];
      metadata?: LogDebtorActionDto['metadata'];
    },
    config?: AxiosRequestConfig
  ): Promise<DebtorActionResponseDto> => {
    const actionData: LogDebtorActionDto = {
      actionType: 'DISPUTE_FILED',
      ...disputeData,
    };
    return collectorService.logDebtorAction(
      organizationId,
      debtorProfileId,
      actionData,
      config
    );
  },

  /**
   * Get complete collector dashboard summary
   *
   * Retrieves all dashboard metrics in a single optimized request:
   * - Today's performance stats (calls, emails, contacts, collections)
   * - This week's performance stats (total calls, accounts resolved, collections, recovery rate)
   * - Team leaderboard for current month
   *
   * This consolidated endpoint reduces network overhead by combining
   * multiple data sources into a single response.
   *
   * @param organizationId - The organization ID
   * @param params - Optional query parameters, including teamId
   * @param config - Optional Axios request configuration
   * @returns Promise with complete dashboard summary
   */
  getDashboardSummary: async (
    organizationId: string,
    params?: PerformanceControllerGetDashboardSummaryParams,
    config?: AxiosRequestConfig
  ): Promise<CollectorDashboardSummaryDto> => {
    const response = await collectorsApiClient.get<CollectorDashboardSummaryDto>(
      `/v1/collectors/performance/orgs/${organizationId}/dashboard-summary`,
      { params: params, ...config }
    );
    return response.data;
  },
};