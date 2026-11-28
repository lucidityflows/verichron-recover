import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, OrchestrationEventEnvelope } from '@verichron/events';
import {
  WorkQueueDataRequestedDto,
  WorkQueueDataResponseDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Work Queue Data Orchestrator (Internal)
 * ========================================================================
 *
 * PURPOSE:
 * Provides internal work queue data endpoints for the automation system.
 * Used exclusively by api-automations for auto-assignment execution.
 * 
 * REFACTORED:
 * Extends BaseOrchestrator for standardization.
 */
@Injectable()
export class WorkQueueDataOrchestrator extends BaseOrchestrator<
  WorkQueueDataRequestedDto,
  WorkQueueDataResponseDto
> {
  protected readonly logger = new Logger(WorkQueueDataOrchestrator.name);
  protected readonly requestDtoClass = WorkQueueDataRequestedDto;
  protected readonly responseDtoClass = WorkQueueDataResponseDto;
  protected readonly serviceName = this.config.serviceName;
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
    subscriptionName: 'orchestrator-work-queue-data-requested-sub',
    eventType: EVENT_TYPES.AUTOMATIONS_WORK_QUEUE_DATA_REQUESTED,
    dto: WorkQueueDataRequestedDto,
  })
  async handleWorkQueueDataRequested(
    envelope: OrchestrationEventEnvelope<WorkQueueDataRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.AUTOMATIONS_WORK_QUEUE_DATA_REQUESTED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: WorkQueueDataRequestedDto,
  ): Promise<WorkQueueDataResponseDto> {
    const { organizationId, action, filters, limit, correlationId } = payload;
    const apiCollectorsUrl = this.config.serviceEndpoints['api-collectors'];
    
    if (!apiCollectorsUrl) {
      throw new Error('api-collectors service endpoint not configured');
    }

    let endpoint: string;
    let responsePayload: any;

    switch (action) {
      case 'getUnassignedItems':
        endpoint = '/internal/work-queue/unassigned';
        const body = { organizationId, filters, limit };
        const unassignedResponse = await this.fetchInternal<{ items: any[] }>(
          apiCollectorsUrl,
          endpoint,
          'POST',
          body
        );
        responsePayload = { unassignedItems: unassignedResponse.items };
        break;

      default:
        throw new Error(`Unknown work queue data action: ${action}`);
    }

    return {
      organizationId,
      correlationId,
      payload: responsePayload,
    };
  }
}