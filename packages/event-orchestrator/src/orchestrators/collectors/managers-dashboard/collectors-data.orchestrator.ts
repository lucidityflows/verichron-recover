import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, OrchestrationEventEnvelope } from '@verichron/events';
import {
  CollectorsDataRequestedDto,
  CollectorsDataResponseDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Collectors Data Orchestrator (Internal)
 * ========================================================================
 *
 * PURPOSE:
 * Provides internal collector data endpoints for the automation system.
 * Used exclusively by api-automations for auto-assignment strategy execution.
 * 
 * REFACTORED:
 * Extends BaseOrchestrator for standardization.
 */
@Injectable()
export class CollectorsDataOrchestrator extends BaseOrchestrator<
  CollectorsDataRequestedDto,
  CollectorsDataResponseDto
> {
  protected readonly logger = new Logger(CollectorsDataOrchestrator.name);
  protected readonly requestDtoClass = CollectorsDataRequestedDto;
  protected readonly responseDtoClass = CollectorsDataResponseDto;
  protected readonly serviceName = this.config.serviceName; // Dynamic based on config
  // serviceKeyEnvVar is tricky here because it depends on serviceName logic in original constructor.
  // Original: `SERVICE_KEY_${this.serviceName.replace('api-', '').toUpperCase()}`
  // BaseOrchestrator expects a static string or I need to override the getter?
  // I'll override the getter or just set it in constructor? 
  // BaseOrchestrator uses `serviceKeyEnvVar` property. 
  // I can just set it in constructor.
  protected readonly serviceKeyEnvVar: string;

  constructor(
    @Inject('EVENT_ORCHESTRATOR_CONFIG')
    config: EventOrchestratorConfig,
    httpService: HttpService,
    eventPublisher: EventPublisher,
  ) {
    super(config, httpService, eventPublisher);
    this.serviceKeyEnvVar = `SERVICE_KEY_${this.config.serviceName.replace('api-', '').toUpperCase()}`;
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    subscriptionName: 'orchestrator-collectors-data-requested-sub',
    eventType: EVENT_TYPES.AUTOMATIONS_COLLECTORS_DATA_REQUESTED,
    dto: CollectorsDataRequestedDto,
  })
  async handleCollectorsDataRequested(
    envelope: OrchestrationEventEnvelope<CollectorsDataRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.AUTOMATIONS_COLLECTORS_DATA_REQUESTED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: CollectorsDataRequestedDto,
  ): Promise<CollectorsDataResponseDto> {
    const { organizationId, action, collectorIds, correlationId } = payload;
    const apiCollectorsUrl = this.config.serviceEndpoints['api-collectors'];
    
    if (!apiCollectorsUrl) {
      throw new Error('api-collectors service endpoint not configured');
    }

    let endpoint: string;
    let responsePayload: any;

    switch (action) {
      case 'getCollectorWorkload':
        endpoint = '/internal/collectors/workload';
        const workloadBody = { organizationId, collectorIds };
        const workloadResponse = await this.fetchInternal<{ workload: Record<string, number> }>(
          apiCollectorsUrl,
          endpoint,
          'POST',
          workloadBody
        );
        responsePayload = { workload: workloadResponse.workload };
        break;

      case 'getCollectorSkills':
        endpoint = '/internal/collectors/skills';
        const skillsBody = { organizationId, collectorIds };
        const skillsResponse = await this.fetchInternal<{ skills: Record<string, string[]> }>(
          apiCollectorsUrl,
          endpoint,
          'POST',
          skillsBody
        );
        responsePayload = { skills: skillsResponse.skills };
        break;

      case 'getCollectorTerritories':
        endpoint = '/internal/collectors/territories';
        const territoriesBody = { organizationId, collectorIds };
        const territoriesResponse = await this.fetchInternal<{
            territories: Record<string, { states?: string[]; zipcodes?: string[] }>;
          }>(
          apiCollectorsUrl,
          endpoint,
          'POST',
          territoriesBody
        );
        responsePayload = { territories: territoriesResponse.territories };
        break;

      default:
        throw new Error(`Unknown collectors data action: ${action}`);
    }

    return {
      organizationId,
      correlationId,
      payload: responsePayload,
    };
  }
}