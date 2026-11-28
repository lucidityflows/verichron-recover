/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import { collectorsApiClient } from './apiClient';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type {
  GoalResponseDto,
  CreateGoalDto,
  UpdateGoalDto,
  GoalProgressResponseDto,
  GoalsControllerListGoalsParams,
} from '../../api/generated/collectors_models';
import { GoalScope, GoalType, GoalPeriod } from '../../api/generated/collectors_models';

export {
  GoalType,
  GoalPeriod,
  GoalScope,
};

export type {
  GoalResponseDto as Goal,
  CreateGoalDto,
};

/**
 * Service for Goals API operations.
 * 
 * Handles performance target management for collectors and teams.
 * Utilizes the high-performance accumulator pattern implemented in api-collectors.
 */
export const goalsService = {
  /**
   * Get all goals for the organization with optional filtering
   */
  listGoals: async (
    orgId: string,
    params?: GoalsControllerListGoalsParams,
    config?: AxiosRequestConfig
  ): Promise<GoalResponseDto[]> => {
    const response = await collectorsApiClient.get<GoalResponseDto[]>(
      `/organizations/${orgId}/goals`,
      { params, ...config }
    );
    return response.data;
  },

  /**
   * Get goals for a specific collector
   */
  getCollectorGoals: async (
    orgId: string,
    collectorId: string,
    config?: AxiosRequestConfig
  ): Promise<GoalResponseDto[]> => {
    const response = await collectorsApiClient.get<GoalResponseDto[]>(
      `/organizations/${orgId}/goals`,
      { params: { collectorUserId: collectorId }, ...config }
    );
    return response.data;
  },

  /**
   * Create a new goal
   */
  createGoal: async (
    orgId: string,
    dto: CreateGoalDto,
    config?: AxiosRequestConfig
  ): Promise<GoalResponseDto> => {
    const response = await collectorsApiClient.post<GoalResponseDto>(
      `/organizations/${orgId}/goals`,
      dto,
      config
    );
    return response.data;
  },

  /**
   * Update an existing goal
   */
  updateGoal: async (
    orgId: string,
    goalId: string,
    dto: UpdateGoalDto,
    config?: AxiosRequestConfig
  ): Promise<GoalResponseDto> => {
    const response = await collectorsApiClient.patch<GoalResponseDto>(
      `/organizations/${orgId}/goals/${goalId}`,
      dto,
      config
    );
    return response.data;
  },

  /**
   * Delete a goal (soft delete)
   */
  deleteGoal: async (
    orgId: string,
    goalId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    await collectorsApiClient.delete(
      `/organizations/${orgId}/goals/${goalId}`,
      config
    );
  },

  /**
   * Get real-time goal progress from the high-performance accumulator
   */
  getGoalProgress: async (
    orgId: string,
    goalId: string,
    config?: AxiosRequestConfig
  ): Promise<GoalProgressResponseDto> => {
    const response = await collectorsApiClient.get<GoalProgressResponseDto>(
      `/organizations/${orgId}/goals/${goalId}/progress`,
      config
    );
    return response.data;
  },

  /**
   * Apply a predefined template to create multiple goals
   */
  applyTemplate: async (
    orgId: string,
    templateId: string,
    scope: GoalScope,
    targetId?: string, // teamId or collectorUserId depending on scope
    config?: AxiosRequestConfig
  ): Promise<GoalResponseDto[]> => {
    const template = GOAL_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const goals: GoalResponseDto[] = [];
    for (const goalDef of template.goals) {
      const dto: CreateGoalDto = {
        scope,
        type: goalDef.type as GoalType,
        period: goalDef.period as GoalPeriod,
        targetValue: goalDef.target,
        unit: goalDef.unit as any,
        name: `${template.name}: ${goalDef.type}`,
        description: goalDef.description,
        startDate: new Date().toISOString().split('T')[0], // Default to today
        // Attribute based on scope
        ...(scope === GoalScope.TEAM ? { teamId: targetId } : { collectorUserId: targetId }),
      };

      const goal = await goalsService.createGoal(orgId, dto, config);
      goals.push(goal);
    }

    return goals;
  },
};

/**
 * Predefined goal templates for quick creation
 */
export const GOAL_TEMPLATES = [
  {
    id: 'aggressive',
    name: 'Aggressive Collection',
    description: 'High-volume contact strategy with strong collection targets',
    goals: [
      {
        type: GoalType.CONTACTS,
        period: GoalPeriod.DAILY,
        target: 50,
        unit: 'count',
        description: 'Make 50 contact attempts per day',
      },
      {
        type: GoalType.PROMISES,
        period: GoalPeriod.WEEKLY,
        target: 15,
        unit: 'count',
        description: 'Secure 15 payment promises per week',
      },
      {
        type: GoalType.COLLECTIONS,
        period: GoalPeriod.MONTHLY,
        target: 10000,
        unit: 'dollars',
        description: 'Collect $10,000 per month',
      },
    ],
  },
  {
    id: 'balanced',
    name: 'Balanced Approach',
    description: 'Moderate volume with focus on quality interactions',
    goals: [
      {
        type: GoalType.CONTACTS,
        period: GoalPeriod.DAILY,
        target: 30,
        unit: 'count',
        description: 'Make 30 contact attempts per day',
      },
      {
        type: GoalType.PROMISES,
        period: GoalPeriod.WEEKLY,
        target: 10,
        unit: 'count',
        description: 'Secure 10 payment promises per week',
      },
      {
        type: GoalType.COLLECTIONS,
        period: GoalPeriod.MONTHLY,
        target: 6000,
        unit: 'dollars',
        description: 'Collect $6,000 per month',
      },
    ],
  },
];