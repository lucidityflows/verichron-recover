import { workflowsApiClient } from './apiClient.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type {
  AutoAssignmentConfigResponseDto,
  CreateAutoAssignmentDto,
  UpdateAutoAssignmentDto,
  CreateEscalationRuleDto,
  UpdateEscalationRuleDto,
  EscalationRuleResponseDto,
  CreateWorkflowRuleDto,
  UpdateWorkflowRuleDto,
  WorkflowRuleResponseDto,
  WorkflowExecutionResponseDto,
  WorkflowExecutionsControllerFindAllParams,
  WorkflowAnalyticsResponseDto,
  WorkflowAnalyticsControllerGetAnalyticsParams,
  WorkflowTemplateResponseDto,
  WorkflowTemplatesControllerFindAllParams,
} from '../../api/generated/workflows_models/index.js';

/**
 * Service for Workflow Automation API operations.
 *
 * Handles automated task assignment, escalation rules, and workflow triggers
 * for manager efficiency and consistent team processes.
 */
export const workflowsService = {
  // ==================== AUTO-ASSIGNMENT ====================

  /**
   * Get all auto-assignment configurations for an organization
   */
  getAutoAssignmentConfigs: async (
    orgId: string,
    config?: AxiosRequestConfig
  ): Promise<AutoAssignmentConfigResponseDto[]> => {
    const response = await workflowsApiClient.get<AutoAssignmentConfigResponseDto[]>(
      `/v1/workflows/auto-assignment/orgs/${orgId}`,
      config
    );
    return response.data;
  },

  /**
   * Create a new auto-assignment configuration
   */
  createAutoAssignment: async (
    orgId: string,
    dto: CreateAutoAssignmentDto,
    config?: AxiosRequestConfig
  ): Promise<AutoAssignmentConfigResponseDto> => {
    const response = await workflowsApiClient.post<AutoAssignmentConfigResponseDto>(
      `/v1/workflows/auto-assignment/orgs/${orgId}`,
      dto,
      config
    );
    return response.data;
  },

  /**
   * Get a specific auto-assignment configuration by ID
   */
  getAutoAssignment: async (
    orgId: string,
    configId: string,
    config?: AxiosRequestConfig
  ): Promise<AutoAssignmentConfigResponseDto> => {
    const response = await workflowsApiClient.get<AutoAssignmentConfigResponseDto>(
      `/v1/workflows/auto-assignment/orgs/${orgId}/${configId}`,
      config
    );
    return response.data;
  },

  /**
   * Update an existing auto-assignment configuration
   */
  updateAutoAssignment: async (
    orgId: string,
    configId: string,
    dto: UpdateAutoAssignmentDto,
    config?: AxiosRequestConfig
  ): Promise<AutoAssignmentConfigResponseDto> => {
    const response = await workflowsApiClient.patch<AutoAssignmentConfigResponseDto>(
      `/v1/workflows/auto-assignment/orgs/${orgId}/${configId}`,
      dto,
      config
    );
    return response.data;
  },

  /**
   * Delete an auto-assignment configuration
   */
  deleteAutoAssignment: async (
    orgId: string,
    configId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    await workflowsApiClient.delete(`/v1/workflows/auto-assignment/orgs/${orgId}/${configId}`, config);
  },

  /**
   * Toggle enable/disable status of an auto-assignment configuration
   */
  toggleAutoAssignment: async (
    orgId: string,
    configId: string,
    config?: AxiosRequestConfig
  ): Promise<AutoAssignmentConfigResponseDto> => {
    const response = await workflowsApiClient.patch<AutoAssignmentConfigResponseDto>(
      `/v1/workflows/auto-assignment/orgs/${orgId}/${configId}/toggle`,
      {},
      config
    );
    return response.data;
  },

  // ==================== WORKFLOW RULES ====================

  /**
   * Get all workflow rules for an organization
   */
  getWorkflowRules: async (
    orgId: string,
    config?: AxiosRequestConfig
  ): Promise<WorkflowRuleResponseDto[]> => {
    const response = await workflowsApiClient.get<WorkflowRuleResponseDto[]>(
      `/v1/workflows/rules/orgs/${orgId}`,
      config
    );
    return response.data;
  },

  /**
   * Create a new workflow rule
   */
  createWorkflowRule: async (
    orgId: string,
    dto: CreateWorkflowRuleDto,
    config?: AxiosRequestConfig
  ): Promise<WorkflowRuleResponseDto> => {
    const response = await workflowsApiClient.post<WorkflowRuleResponseDto>(
      `/v1/workflows/rules/orgs/${orgId}`,
      dto,
      config
    );
    return response.data;
  },

  /**
   * Get a specific workflow rule by ID
   */
  getWorkflowRule: async (
    orgId: string,
    ruleId: string,
    config?: AxiosRequestConfig
  ): Promise<WorkflowRuleResponseDto> => {
    const response = await workflowsApiClient.get<WorkflowRuleResponseDto>(
      `/v1/workflows/rules/orgs/${orgId}/${ruleId}`,
      config
    );
    return response.data;
  },

  /**
   * Update an existing workflow rule
   */
  updateWorkflowRule: async (
    orgId: string,
    ruleId: string,
    dto: UpdateWorkflowRuleDto,
    config?: AxiosRequestConfig
  ): Promise<WorkflowRuleResponseDto> => {
    const response = await workflowsApiClient.patch<WorkflowRuleResponseDto>(
      `/v1/workflows/rules/orgs/${orgId}/${ruleId}`,
      dto,
      config
    );
    return response.data;
  },

  /**
   * Delete a workflow rule
   */
  deleteWorkflowRule: async (
    orgId: string,
    ruleId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    await workflowsApiClient.delete(`/v1/workflows/rules/orgs/${orgId}/${ruleId}`, config);
  },

  /**
   * Toggle enable/disable status of a workflow rule
   */
  toggleWorkflowRule: async (
    orgId: string,
    ruleId: string,
    config?: AxiosRequestConfig
  ): Promise<WorkflowRuleResponseDto> => {
    const response = await workflowsApiClient.patch<WorkflowRuleResponseDto>(
      `/v1/workflows/rules/orgs/${orgId}/${ruleId}/toggle`,
      {},
      config
    );
    return response.data;
  },

  // ==================== ESCALATION RULES ====================

  /**
   * Get all escalation rules for an organization
   */
  getEscalationRules: async (
    orgId: string,
    config?: AxiosRequestConfig
  ): Promise<EscalationRuleResponseDto[]> => {
    const response = await workflowsApiClient.get<EscalationRuleResponseDto[]>(
      `/v1/workflows/escalations/orgs/${orgId}`,
      config
    );
    return response.data;
  },

  /**
   * Create a new escalation rule
   */
  createEscalationRule: async (
    orgId: string,
    dto: CreateEscalationRuleDto,
    config?: AxiosRequestConfig
  ): Promise<EscalationRuleResponseDto> => {
    const response = await workflowsApiClient.post<EscalationRuleResponseDto>(
      `/v1/workflows/escalations/orgs/${orgId}`,
      dto,
      config
    );
    return response.data;
  },

  /**
   * Get a specific escalation rule by ID
   */
  getEscalationRule: async (
    orgId: string,
    ruleId: string,
    config?: AxiosRequestConfig
  ): Promise<EscalationRuleResponseDto> => {
    const response = await workflowsApiClient.get<EscalationRuleResponseDto>(
      `/v1/workflows/escalations/orgs/${orgId}/${ruleId}`,
      config
    );
    return response.data;
  },

  /**
   * Update an existing escalation rule
   */
  updateEscalationRule: async (
    orgId: string,
    ruleId: string,
    dto: UpdateEscalationRuleDto,
    config?: AxiosRequestConfig
  ): Promise<EscalationRuleResponseDto> => {
    const response = await workflowsApiClient.patch<EscalationRuleResponseDto>(
      `/v1/workflows/escalations/orgs/${orgId}/${ruleId}`,
      dto,
      config
    );
    return response.data;
  },

  /**
   * Delete an escalation rule
   */
  deleteEscalationRule: async (
    orgId: string,
    ruleId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    await workflowsApiClient.delete(`/v1/workflows/escalations/orgs/${orgId}/${ruleId}`, config);
  },

  // ==================== WORKFLOW EXECUTIONS ====================

  /**
   * Get workflow execution history with optional filtering
   */
  getExecutionHistory: async (
    orgId: string,
    params?: WorkflowExecutionsControllerFindAllParams,
    config?: AxiosRequestConfig
  ): Promise<WorkflowExecutionResponseDto[]> => {
    const response = await workflowsApiClient.get<WorkflowExecutionResponseDto[]>(
      `/v1/workflows/executions/orgs/${orgId}`,
      { params, ...config }
    );
    return response.data;
  },

  /**
   * Get detailed workflow execution record by ID
   */
  getExecution: async (
    orgId: string,
    executionId: string,
    config?: AxiosRequestConfig
  ): Promise<WorkflowExecutionResponseDto> => {
    const response = await workflowsApiClient.get<WorkflowExecutionResponseDto>(
      `/v1/workflows/executions/orgs/${orgId}/${executionId}`,
      config
    );
    return response.data;
  },

  // ==================== WORKFLOW ANALYTICS ====================

  /**
   * Get comprehensive workflow analytics for an organization
   */
  getWorkflowAnalytics: async (
    orgId: string,
    params?: WorkflowAnalyticsControllerGetAnalyticsParams,
    config?: AxiosRequestConfig
  ): Promise<WorkflowAnalyticsResponseDto> => {
    const response = await workflowsApiClient.get<WorkflowAnalyticsResponseDto>(
      `/v1/workflows/analytics/orgs/${orgId}`,
      { params, ...config }
    );
    return response.data;
  },

  // ==================== WORKFLOW TEMPLATES ====================

  /**
   * Get all system-defined workflow templates
   */
  getWorkflowTemplates: async (
    orgId: string,
    params?: WorkflowTemplatesControllerFindAllParams,
    config?: AxiosRequestConfig
  ): Promise<WorkflowTemplateResponseDto[]> => {
    const response = await workflowsApiClient.get<WorkflowTemplateResponseDto[]>(
      `/v1/workflows/templates/orgs/${orgId}`,
      { params, ...config }
    );
    return response.data;
  },

  /**
   * Get a specific system-defined workflow template by ID
   */
  getWorkflowTemplate: async (
    orgId: string,
    templateId: string,
    config?: AxiosRequestConfig
  ): Promise<WorkflowTemplateResponseDto> => {
    const response = await workflowsApiClient.get<WorkflowTemplateResponseDto>(
      `/v1/workflows/templates/orgs/${orgId}/${templateId}`,
      config
    );
    return response.data;
  },
};
