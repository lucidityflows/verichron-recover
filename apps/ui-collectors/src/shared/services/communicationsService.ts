import { communicationsApiClient } from './apiClient';
import { getCurrentOrganizationId } from '../utils/auth';
import type { AxiosRequestConfig } from '@verichron/api-client';

// Import DTOs (request body/param types)
import type {
  OptInDto,
  OptOutDto,
  UpdatePreferenceDto,
  CreateTemplateDto,
  PreviewTemplateDto,
  UpdateTemplateDto,
  TwilioWebhookDto,
  LogsControllerFindAllParams,
  TemplatesControllerFindAllParams,
  InternalAnalyticsControllerGetCollectorStatsParams,
  InternalAnalyticsControllerGetOrganizationStatsParams,
  InternalAnalyticsControllerGetCollectorDashboardMetricsParams,
} from '../../api/generated/communications_models';

// Import Response DTOs from their specific endpoint files
import type {
  appControllerGetHelloResponse,
  appControllerGetHealthResponse,
} from '../../api/generated/communications/endpoints/app/app';
import type {
  logsControllerFindAllResponse,
  logsControllerFindOneResponse,
} from '../../api/generated/communications/endpoints/communication-logs/communication-logs';
import type {
  preferencesControllerFindByDebtorResponse,
  preferencesControllerUpdateResponse,
  preferencesControllerOptOutResponse,
  preferencesControllerOptInResponse,
} from '../../api/generated/communications/endpoints/communication-preferences/communication-preferences';
import type {
  templatesControllerCreateResponse,
  templatesControllerFindAllResponse,
  templatesControllerFindOneResponse,
  templatesControllerUpdateResponse,
  templatesControllerRemoveResponse,
  templatesControllerPreviewResponse,
} from '../../api/generated/communications/endpoints/communication-templates/communication-templates';
import type { dispatchControllerDispatchResponse } from '../../api/generated/communications/endpoints/dispatch/dispatch';
import type {
  internalAnalyticsControllerGetDebtorCommunicationsResponse,
  internalAnalyticsControllerGetCollectorStatsResponse,
  internalAnalyticsControllerGetOrganizationStatsResponse,
  internalAnalyticsControllerGetCollectorDashboardMetricsResponse,
} from '../../api/generated/communications/endpoints/internal-analytics/internal-analytics';
import type {
  sendGridWebhookControllerHandleWebhookResponse,
  twilioWebhookControllerHandleWebhookResponse,
} from '../../api/generated/communications/endpoints/webhooks/webhooks';

/**
 * Service for Communications API operations.
 * Provides methods to interact with communication logs, preferences, templates, and analytics.
 */
export const communicationsService = {
  /**
   * Get a simple 'Hello' message from the Communications API.
   * @param config - Optional Axios request configuration.
   * @returns Promise with a 'Hello' response.
   */
  getHello: async (config?: AxiosRequestConfig): Promise<appControllerGetHelloResponse> => {
    const response = await communicationsApiClient.get<appControllerGetHelloResponse>('/', config);
    return response.data;
  },

  /**
   * Get the health status of the Communications API.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the health status response.
   */
  getHealth: async (config?: AxiosRequestConfig): Promise<appControllerGetHealthResponse> => {
    const response = await communicationsApiClient.get<appControllerGetHealthResponse>('/health', config);
    return response.data;
  },

  /**
   * Query communication logs for an organization.
   * @param params - Parameters for filtering communication logs.
   * @param config - Optional Axios request configuration.
   * @returns Promise with a list of communication logs.
   */
  getLogs: async (
    params?: LogsControllerFindAllParams,
    config?: AxiosRequestConfig,
  ): Promise<logsControllerFindAllResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.get<logsControllerFindAllResponse>(`/organizations/${orgId}/communications/logs`, { params, ...config });
    return response.data;
  },

  /**
   * Get a specific communication log by ID.
   * @param id - The ID of the communication log.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the communication log details.
   */
  getLogById: async (
    id: string,
    config?: AxiosRequestConfig,
  ): Promise<logsControllerFindOneResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.get<logsControllerFindOneResponse>(`/organizations/${orgId}/communications/logs/${id}`, config);
    return response.data;
  },

  /**
   * Get a debtor's communication preferences.
   * @param debtorId - The ID of the debtor.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the debtor's communication preferences.
   */
  getPreferencesByDebtorId: async (
    debtorId: string,
    config?: AxiosRequestConfig,
  ): Promise<preferencesControllerFindByDebtorResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.get<preferencesControllerFindByDebtorResponse>(`/organizations/${orgId}/communications/preferences/${debtorId}`, config);
    return response.data;
  },

  /**
   * Update a debtor's communication preferences.
   * @param debtorId - The ID of the debtor.
   * @param updatePreferenceDto - Data to update the preferences.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the updated preferences.
   */
  updatePreferences: async (
    debtorId: string,
    updatePreferenceDto: UpdatePreferenceDto,
    config?: AxiosRequestConfig,
  ): Promise<preferencesControllerUpdateResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.put<preferencesControllerUpdateResponse>(`/organizations/${orgId}/communications/preferences/${debtorId}`, updatePreferenceDto, config);
    return response.data;
  },

  /**
   * Opt a debtor out of a communication channel.
   * @param debtorId - The ID of the debtor.
   * @param optOutDto - Data for opting out.
   * @param config - Optional Axios request configuration.
   * @returns Promise indicating success or failure.
   */
  optOut: async (
    debtorId: string,
    optOutDto: OptOutDto,
    config?: AxiosRequestConfig,
  ): Promise<preferencesControllerOptOutResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.post<preferencesControllerOptOutResponse>(`/organizations/${orgId}/communications/preferences/${debtorId}/opt-out`, optOutDto, config);
    return response.data;
  },

  /**
   * Opt a debtor back into a communication channel.
   * @param debtorId - The ID of the debtor.
   * @param optInDto - Data for opting in.
   * @param config - Optional Axios request configuration.
   * @returns Promise indicating success or failure.
   */
  optIn: async (
    debtorId: string,
    optInDto: OptInDto,
    config?: AxiosRequestConfig,
  ): Promise<preferencesControllerOptInResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.post<preferencesControllerOptInResponse>(`/organizations/${orgId}/communications/preferences/${debtorId}/opt-in`, optInDto, config);
    return response.data;
  },

  /**
   * Create a new communication template.
   * @param createTemplateDto - Data for the new template.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the created template response.
   */
  createTemplate: async (
    createTemplateDto: CreateTemplateDto,
    config?: AxiosRequestConfig,
  ): Promise<templatesControllerCreateResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.post<templatesControllerCreateResponse>(`/organizations/${orgId}/communications/templates`, createTemplateDto, config);
    return response.data;
  },

  /**
   * List all communication templates for an organization.
   * @param params - Parameters for filtering templates.
   * @param config - Optional Axios request configuration.
   * @returns Promise with a list of templates.
   */
  getAllTemplates: async (
    params?: TemplatesControllerFindAllParams,
    config?: AxiosRequestConfig,
  ): Promise<templatesControllerFindAllResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.get<templatesControllerFindAllResponse>(`/organizations/${orgId}/communications/templates`, { params, ...config });
    return response.data;
  },

  /**
   * Get a single template by ID.
   * @param id - The ID of the template.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the template details.
   */
  getTemplateById: async (
    id: string,
    config?: AxiosRequestConfig,
  ): Promise<templatesControllerFindOneResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.get<templatesControllerFindOneResponse>(`/organizations/${orgId}/communications/templates/${id}`, config);
    return response.data;
  },

  /**
   * Update a template. This creates a new, active version of the template.
   * @param id - The ID of the template to update.
   * @param updateTemplateDto - Data to update the template.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the updated template response.
   */
  updateTemplate: async (
    id: string,
    updateTemplateDto: UpdateTemplateDto,
    config?: AxiosRequestConfig,
  ): Promise<templatesControllerUpdateResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.put<templatesControllerUpdateResponse>(`/organizations/${orgId}/communications/templates/${id}`, updateTemplateDto, config);
    return response.data;
  },

  /**
   * Deactivate a template.
   * @param id - The ID of the template to deactivate.
   * @param config - Optional Axios request configuration.
   * @returns Promise indicating success or failure.
   */
  removeTemplate: async (
    id: string,
    config?: AxiosRequestConfig,
  ): Promise<templatesControllerRemoveResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.delete<templatesControllerRemoveResponse>(`/organizations/${orgId}/communications/templates/${id}`, config);
    return response.data;
  },

  /**
   * Preview a rendered template.
   * @param id - The ID of the template to preview.
   * @param previewTemplateDto - Data for rendering the preview.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the rendered template preview.
   */
  previewTemplate: async (
    id: string,
    previewTemplateDto: PreviewTemplateDto,
    config?: AxiosRequestConfig,
  ): Promise<templatesControllerPreviewResponse> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await communicationsApiClient.post<templatesControllerPreviewResponse>(`/organizations/${orgId}/communications/templates/${id}/preview`, previewTemplateDto, config);
    return response.data;
  },

  /**
   * Manually dispatch a communication.
   * @param config - Optional Axios request configuration.
   * @returns Promise indicating success or failure of dispatch.
   */
  dispatchCommunication: async (config?: AxiosRequestConfig): Promise<dispatchControllerDispatchResponse> => {
    const response = await communicationsApiClient.post<dispatchControllerDispatchResponse>('/dispatch', {}, config);
    return response.data;
  },

  /**
   * Get communication history for a debtor (internal only).
   * Note: This is an internal endpoint, typically called by event orchestrators.
   * @param organizationId - The organization ID.
   * @param debtorProfileId - The debtor profile ID.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the debtor's communication history.
   */
  getDebtorCommunications: async (
    organizationId: string,
    debtorProfileId: string,
    config?: AxiosRequestConfig,
  ): Promise<internalAnalyticsControllerGetDebtorCommunicationsResponse> => {
    const response = await communicationsApiClient.get<internalAnalyticsControllerGetDebtorCommunicationsResponse>(`/internal/analytics/debtor-focus/${organizationId}/${debtorProfileId}`, config);
    return response.data;
  },

  /**
   * Get communication statistics for a collector (internal only).
   * Note: This is an internal endpoint, typically called by api-collectors.
   * @param organizationId - The organization ID.
   * @param collectorUserId - The collector user ID.
   * @param params - Parameters for filtering collector stats.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the collector's communication statistics.
   */
  getCollectorStats: async (
    organizationId: string,
    collectorUserId: string,
    params: InternalAnalyticsControllerGetCollectorStatsParams,
    config?: AxiosRequestConfig,
  ): Promise<internalAnalyticsControllerGetCollectorStatsResponse> => {
    const queryParams = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    const response = await communicationsApiClient.get<internalAnalyticsControllerGetCollectorStatsResponse>(`/internal/analytics/collector-stats/${organizationId}/${collectorUserId}${queryParams}`, config);
    return response.data;
  },

  /**
   * Get communication statistics for all collectors in an organization (internal only).
   * Note: This is an internal endpoint, typically called by api-collectors.
   * @param organizationId - The organization ID.
   * @param params - Parameters for filtering organization stats.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the organization's communication statistics.
   */
  getOrganizationStats: async (
    organizationId: string,
    params: InternalAnalyticsControllerGetOrganizationStatsParams,
    config?: AxiosRequestConfig,
  ): Promise<internalAnalyticsControllerGetOrganizationStatsResponse> => {
    const queryParams = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    const response = await communicationsApiClient.get<internalAnalyticsControllerGetOrganizationStatsResponse>(`/internal/analytics/organization-stats/${organizationId}${queryParams}`, config);
    return response.data;
  },

  /**
   * Get collector dashboard metrics (period + today in single call) (internal only).
   * Note: This is an internal endpoint, typically called by api-collectors.
   * @param collectorUserId - The collector user ID.
   * @param params - Parameters for filtering dashboard metrics.
   * @param config - Optional Axios request configuration.
   * @returns Promise with the collector's dashboard metrics.
   */
  getCollectorDashboardMetrics: async (
    collectorUserId: string,
    params: InternalAnalyticsControllerGetCollectorDashboardMetricsParams,
    config?: AxiosRequestConfig,
  ): Promise<internalAnalyticsControllerGetCollectorDashboardMetricsResponse> => {
    const queryParams = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    const response = await communicationsApiClient.get<internalAnalyticsControllerGetCollectorDashboardMetricsResponse>(`/internal/analytics/collectors/${collectorUserId}/dashboard-metrics${queryParams}`, config);
    return response.data;
  },

  /**
   * Handle SendGrid webhook events.
   * Note: This endpoint is typically called by SendGrid and not directly from the UI.
   * @param body - The webhook event data.
   * @param config - Optional Axios request configuration.
   * @returns Promise indicating success or failure.
   */
  handleSendGridWebhook: async (
    body: string[],
    config?: AxiosRequestConfig,
  ): Promise<sendGridWebhookControllerHandleWebhookResponse> => {
    const response = await communicationsApiClient.post<sendGridWebhookControllerHandleWebhookResponse>('/webhooks/sendgrid', body, config);
    return response.data;
  },

  /**
   * Handle Twilio SMS status callback.
   * Note: This endpoint is typically called by Twilio and not directly from the UI.
   * @param twilioWebhookDto - The Twilio webhook data.
   * @param config - Optional Axios request configuration.
   * @returns Promise indicating success or failure.
   */
  handleTwilioWebhook: async (
    twilioWebhookDto: TwilioWebhookDto,
    config?: AxiosRequestConfig,
  ): Promise<twilioWebhookControllerHandleWebhookResponse> => {
    const response = await communicationsApiClient.post<twilioWebhookControllerHandleWebhookResponse>('/webhooks/twilio', twilioWebhookDto, config);
    return response.data;
  },
};
