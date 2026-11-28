/* eslint-disable @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import {
  EventOrchestratorClient,
  CollectorsDataRequestedDto,
  CollectorsDataResponseDto,
} from '@verichron/event-orchestrator';
import { EventPublisher } from '@verichron/event-publisher';
import {  AssignmentTarget, AssignmentResult, AutoAssignmentFilters } from '@verichron/contracts';
import { AutoAssignmentStrategy } from '@verichron/enums';
import { EVENT_TOPICS, EVENT_TYPES, ExecuteAutoAssignmentPayload } from '@verichron/events';
import { WorkQueueItemAssignedDto } from '../events/event-dto';
import { format } from 'date-fns';
import { AssignmentRefinementService } from './assignment-refinement.service';

@Injectable()
export class AutoAssignmentExecutorService {
  private readonly logger = new Logger(AutoAssignmentExecutorService.name);

  constructor(
    private readonly orchestrator: EventOrchestratorClient,
    private readonly eventPublisher: EventPublisher,
    private readonly refinementService: AssignmentRefinementService,
  ) {}

  /**
   * Main method to execute an assignment for a target entity
   *
   * @param payload - Command payload from api-workflows
   * @returns AssignmentResult indicating success or failure
   */
  async executeAssignment(payload: ExecuteAutoAssignmentPayload): Promise<AssignmentResult> {
    const targetEntity: AssignmentTarget = {
      id: payload.targetEntityId,
      type: payload.targetEntityType as any,
      ...payload.targetEntityData,
    };

    this.logger.debug(
      `Executing hierarchical assignment for ${targetEntity.type} ${targetEntity.id} (Config: "${payload.configName}")`
    );

    try {
      // TIER 1: RELATIONSHIP LAYER (Sticky Assignment)
      // Check if this debtor already has a primary collector assigned (from first contact)
      if (targetEntity.type === 'DEBTOR' || targetEntity.type === 'DEBT') {
        const debtorId = targetEntity.id;
        const stickyCollectorId = await this.refinementService.getStickyCollector(debtorId);
        
        if (stickyCollectorId) {
          this.logger.log(`Found sticky collector ${stickyCollectorId} for debtor ${debtorId}. Bypassing strategy.`);
          
          await this.publishAssignmentCommand(
            payload.organizationId,
            stickyCollectorId,
            targetEntity,
            payload.correlationId,
          );

          return {
            success: true,
            collectorId: stickyCollectorId,
            configId: payload.configId,
            targetEntityId: targetEntity.id,
            reason: 'Sticky assignment (relationship continuity)',
          };
        }
      }

      // TIER 2: STRATEGIC LAYER (Portfolio-Team Bridge)
      // If no sticky owner, we must determine the valid pool of collectors.
      // A portfolio can be worked by multiple teams.
      let dynamicPool = payload.collectorPool;
      if (targetEntity.portfolioId) {
        const authorizedTeamIds = await this.refinementService.getAuthorizedTeamsForPortfolio(
          payload.organizationId,
          targetEntity.portfolioId
        );

        if (authorizedTeamIds.length > 0) {
          this.logger.debug(`Portfolio ${targetEntity.portfolioId} authorized for teams: ${authorizedTeamIds.join(',')}`);
          const authorizedCollectors = await this.refinementService.getCollectorsForTeams(
            payload.organizationId,
            authorizedTeamIds
          );
          
          if (authorizedCollectors.length > 0) {
            // Intersect the authorized collectors with the config's pool
            dynamicPool = authorizedCollectors.filter(id => payload.collectorPool.includes(id));
            this.logger.debug(`Filtered pool to ${dynamicPool.length} authorized collectors`);
          }
        }
      }

      // TIER 3: TACTICAL LAYER (Execution Strategy)
      const availableCollectors = await this.getAvailableCollectors({
        ...payload,
        collectorPool: dynamicPool
      });

      if (availableCollectors.length === 0) {
        this.logger.warn(`No available collectors in pool for config "${payload.configName}"`);
        return {
          success: false,
          configId: payload.configId,
          targetEntityId: targetEntity.id,
          reason: 'No available collectors in authorized pool',
        };
      }

      // Select collector based on strategy
      let selectedCollectorId: string;

      switch (payload.strategy) {
        case AutoAssignmentStrategy.ROUND_ROBIN:
          selectedCollectorId = this.selectCollectorRoundRobin(payload, availableCollectors);
          break;

        case AutoAssignmentStrategy.LEAST_WORKLOAD:
          selectedCollectorId = await this.selectCollectorLeastWorkload(payload, availableCollectors);
          break;

        case AutoAssignmentStrategy.SKILL_BASED:
          selectedCollectorId = await this.selectCollectorSkillBased(
            payload,
            availableCollectors,
            targetEntity,
          );
          break;

        case AutoAssignmentStrategy.GEOGRAPHIC:
          selectedCollectorId = await this.selectCollectorGeographic(
            payload,
            availableCollectors,
            targetEntity,
          );
          break;

        default:
          this.logger.warn(`Unknown strategy: ${payload.strategy}, using round-robin`);
          selectedCollectorId = this.selectCollectorRoundRobin(payload, availableCollectors);
      }

      // Step 3: Publish assignment command to api-collectors
      await this.publishAssignmentCommand(
        payload.organizationId,
        selectedCollectorId,
        targetEntity,
        payload.correlationId,
      );

      this.logger.log(
        `Successfully assigned ${targetEntity.type} ${targetEntity.id} to collector ${selectedCollectorId}`
      );

      return {
        success: true,
        collectorId: selectedCollectorId,
        configId: payload.configId,
        targetEntityId: targetEntity.id,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error executing hierarchical assignment for ${targetEntity.type} ${targetEntity.id}: ${errorMessage}`
      );

      return {
        success: false,
        configId: payload.configId,
        targetEntityId: targetEntity.id,
        error: errorMessage,
      };
    }
  }

  /**
   * Get list of available collectors from the pool
   * Filters out excluded collectors and those over daily limit
   */
  private async getAvailableCollectors(payload: ExecuteAutoAssignmentPayload): Promise<string[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const availableCollectors: string[] = [];

    for (const collectorId of payload.collectorPool) {
      // Skip excluded collectors
      if (payload.excludeCollectors?.includes(collectorId)) {
        this.logger.debug(`Collector ${collectorId} is excluded`);
        continue;
      }

      // Check daily assignment limit
      if (payload.maxAssignmentsPerDay && payload.dailyAssignmentCounts) {
        const todayCount = payload.dailyAssignmentCounts?.[collectorId]?.[today] || 0;
        if (todayCount >= payload.maxAssignmentsPerDay) {
          this.logger.debug(
            `Collector ${collectorId} has reached daily limit (${todayCount}/${payload.maxAssignmentsPerDay})`
          );
          continue;
        }
      }

      // Check workload threshold using orchestrator
      if (payload.workloadThreshold) {
        try {
          const workloadResponse = await this.orchestrator.request<CollectorsDataResponseDto, CollectorsDataRequestedDto>(
            EVENT_TOPICS.AUTOMATIONS,
            EVENT_TYPES.AUTOMATIONS_COLLECTORS_DATA_REQUESTED,
            {
              organizationId: payload.organizationId,
              action: 'getCollectorWorkload',
              collectorIds: [collectorId],
            },
            CollectorsDataRequestedDto,
            2000,
          );

          if (workloadResponse && workloadResponse.payload) {
            const workload = workloadResponse.payload.workload?.[collectorId] || 0;
            if (workload >= payload.workloadThreshold) {
              this.logger.debug(
                `Collector ${collectorId} over workload threshold (${workload}/${payload.workloadThreshold})`
              );
              continue;
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to check workload for collector ${collectorId}, including anyway`);
        }
      }

      availableCollectors.push(collectorId);
    }

    return availableCollectors;
  }

  /**
   * Round Robin Strategy
   * Selects the next collector in sequence after the last assigned
   */
  private selectCollectorRoundRobin(
    payload: ExecuteAutoAssignmentPayload,
    availableCollectors: string[],
  ): string {
    // If no previous assignment, start at beginning
    if (!payload.lastAssignedCollectorId) {
      return availableCollectors[0];
    }

    // Find index of last assigned collector
    const lastIndex = availableCollectors.indexOf(payload.lastAssignedCollectorId);

    // If last assigned is not in available list, start at beginning
    if (lastIndex === -1) {
      return availableCollectors[0];
    }

    // Get next collector (wrap around to beginning if at end)
    const nextIndex = (lastIndex + 1) % availableCollectors.length;
    return availableCollectors[nextIndex];
  }

  /**
   * Least Workload Strategy
   * Selects the collector with the fewest active assignments
   */
  private async selectCollectorLeastWorkload(
    payload: ExecuteAutoAssignmentPayload,
    availableCollectors: string[],
  ): Promise<string> {
    try {
      // Query collector workload via orchestrator
      const response = await this.orchestrator.request<CollectorsDataResponseDto, CollectorsDataRequestedDto>(
        EVENT_TOPICS.AUTOMATIONS,
        EVENT_TYPES.AUTOMATIONS_COLLECTORS_DATA_REQUESTED,
        {
          organizationId: payload.organizationId,
          action: 'getCollectorWorkload',
          collectorIds: availableCollectors,
        },
        CollectorsDataRequestedDto,
        3000,
      );

      if (!response?.payload) {
        this.logger.warn('No workload data received, falling back to round-robin');
        return this.selectCollectorRoundRobin(payload, availableCollectors);
      }

      // Aggregate response
      const workloadMap = new Map<string, number>();
      const workload = response.payload.workload || {};
      for (const [collectorId, count] of Object.entries(workload)) {
        if (availableCollectors.includes(collectorId)) {
          workloadMap.set(collectorId, count);
        }
      }

      // Find collector with least workload
      let minWorkload = Infinity;
      let selectedCollector = availableCollectors[0];

      for (const collectorId of availableCollectors) {
        const workload = workloadMap.get(collectorId) || 0;
        if (workload < minWorkload) {
          minWorkload = workload;
          selectedCollector = collectorId;
        }
      }

      this.logger.debug(
        `Selected collector ${selectedCollector} with workload ${minWorkload}`
      );

      return selectedCollector;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in least-workload strategy: ${errorMessage}, falling back to round-robin`);
      return this.selectCollectorRoundRobin(payload, availableCollectors);
    }
  }

  /**
   * Skill-Based Strategy
   * Matches target entity requirements with collector skills
   */
  private async selectCollectorSkillBased(
    payload: ExecuteAutoAssignmentPayload,
    availableCollectors: string[],
    targetEntity: AssignmentTarget,
  ): Promise<string> {
    try {
      // Query collector skills via orchestrator
      const response = await this.orchestrator.request<CollectorsDataResponseDto, CollectorsDataRequestedDto>(
        EVENT_TOPICS.AUTOMATIONS,
        EVENT_TYPES.AUTOMATIONS_COLLECTORS_DATA_REQUESTED,
        {
          organizationId: payload.organizationId,
          action: 'getCollectorSkills',
          collectorIds: availableCollectors,
        },
        CollectorsDataRequestedDto,
        3000,
      );

      if (!response?.payload) {
        this.logger.warn('No skills data received, falling back to round-robin');
        return this.selectCollectorRoundRobin(payload, availableCollectors);
      }

      // Aggregate skills data
      const skillsMap = new Map<string, string[]>();
      const skills = response.payload.skills || {};
      for (const [collectorId, collectorSkills] of Object.entries(skills)) {
        if (availableCollectors.includes(collectorId)) {
          skillsMap.set(collectorId, collectorSkills);
        }
      }

      // Match entity category to collector skills
      const entityCategory = targetEntity.category;
      if (entityCategory) {
        for (const collectorId of availableCollectors) {
          const skills = skillsMap.get(collectorId) || [];
          if (skills.includes(entityCategory)) {
            this.logger.debug(
              `Matched collector ${collectorId} with skill ${entityCategory}`
            );
            return collectorId;
          }
        }
      }

      // No skill match found, fall back to round-robin
      this.logger.debug('No skill match found, using round-robin');
      return this.selectCollectorRoundRobin(payload, availableCollectors);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in skill-based strategy: ${errorMessage}, falling back to round-robin`);
      return this.selectCollectorRoundRobin(payload, availableCollectors);
    }
  }

  /**
   * Geographic Strategy
   * Matches target entity location with collector territories
   */
  private async selectCollectorGeographic(
    payload: ExecuteAutoAssignmentPayload,
    availableCollectors: string[],
    targetEntity: AssignmentTarget,
  ): Promise<string> {
    try {
      // Query collector territories via orchestrator
      const response = await this.orchestrator.request<CollectorsDataResponseDto, CollectorsDataRequestedDto>(
        EVENT_TOPICS.AUTOMATIONS,
        EVENT_TYPES.AUTOMATIONS_COLLECTORS_DATA_REQUESTED,
        {
          organizationId: payload.organizationId,
          action: 'getCollectorTerritories',
          collectorIds: availableCollectors,
        },
        CollectorsDataRequestedDto,
        3000,
      );

      if (!response?.payload) {
        this.logger.warn('No territory data received, falling back to round-robin');
        return this.selectCollectorRoundRobin(payload, availableCollectors);
      }

      // Aggregate territories data
      const territoriesMap = new Map<string, { states?: string[]; zipcodes?: string[] }>();
      const territories = response.payload.territories || {};
      for (const [collectorId, territory] of Object.entries(territories)) {
        if (availableCollectors.includes(collectorId)) {
          territoriesMap.set(collectorId, territory as any);
        }
      }

      // Match entity location to collector territory
      const entityState = targetEntity.location?.state;
      const entityZip = targetEntity.location?.zipCode;

      if (entityState || entityZip) {
        for (const collectorId of availableCollectors) {
          const territory = territoriesMap.get(collectorId);
          if (!territory) continue;

          // Check state match
          if (entityState && territory.states?.includes(entityState)) {
            this.logger.debug(
              `Matched collector ${collectorId} with state ${entityState}`
            );
            return collectorId;
          }

          // Check zip code match
          if (entityZip && territory.zipcodes?.includes(entityZip)) {
            this.logger.debug(
              `Matched collector ${collectorId} with zip ${entityZip}`
            );
            return collectorId;
          }
        }
      }

      // No geographic match found, fall back to round-robin
      this.logger.debug('No geographic match found, using round-robin');
      return this.selectCollectorRoundRobin(payload, availableCollectors);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in geographic strategy: ${errorMessage}, falling back to round-robin`);
      return this.selectCollectorRoundRobin(payload, availableCollectors);
    }
  }

  /**
   * Publish assignment command to the event bus
   * This is sent to api-collectors to actually perform the assignment
   */
  private async publishAssignmentCommand(
    organizationId: string,
    collectorId: string,
    targetEntity: AssignmentTarget,
    correlationId?: string,
  ): Promise<void> {
    await this.eventPublisher.publish(
      EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED,
      {
        organizationId,
        collectorId,
        targetEntityId: targetEntity.id,
        targetEntityType: targetEntity.type,
        assignedBy: 'auto-assignment',
        assignmentReason: 'Automated assignment via workflow rule',
      },
      WorkQueueItemAssignedDto,
      { correlationId },
    );
  }

  /**
   * Helper method to check if a target entity matches the config filters
   * This is used to validate if an entity is eligible for auto-assignment
   */
  matchesFilters(targetEntity: AssignmentTarget, filters?: AutoAssignmentFilters): boolean {
    if (!filters) return true;

    // Check portfolio IDs
    if (filters.portfolioIds && filters.portfolioIds.length > 0) {
      if (!targetEntity.portfolioId || !filters.portfolioIds.includes(targetEntity.portfolioId)) {
        return false;
      }
    }

    // Check balance range
    if (filters.balanceRange && targetEntity.balance !== undefined) {
      const [min, max] = filters.balanceRange;
      if (targetEntity.balance < min || targetEntity.balance > max) {
        return false;
      }
    }

    // Check account age range
    if (filters.accountAgeRange && targetEntity.accountAge !== undefined) {
      const [min, max] = filters.accountAgeRange;
      if (targetEntity.accountAge < min || targetEntity.accountAge > max) {
        return false;
      }
    }

    // Check priority
    if (filters.priority && filters.priority.length > 0) {
      if (!targetEntity.priority || !filters.priority.includes(targetEntity.priority)) {
        return false;
      }
    }

    // All filters passed
    return true;
  }
}
