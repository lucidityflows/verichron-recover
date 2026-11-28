import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { EngineService } from '../engine.service';
import { PromiseBrokenDto } from '../../events/event-dto';

@Injectable()
export class PromiseBrokenListener extends AbstractBaseListener<PromiseBrokenDto> {
  constructor(private readonly engineService: EngineService) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_PROMISE_BROKEN, 
    dto: PromiseBrokenDto,
  })
  async handlePromiseBrokenEvent(data: PromiseBrokenDto, envelope: EventEnvelope<PromiseBrokenDto>) {
    this.logger.debug(`Received PromiseBrokenEvent: ${JSON.stringify(data)}`);

    const { organizationId, debtId, promiseDate } = data;
    
    if (!organizationId) {
      this.logger.error('PromiseBrokenEvent payload missing organizationId.');
      return;
    }

    // Create enriched payload for workflow engine
    const eventPayload = {
      ...data,
      eventType: EVENT_TYPES.TRANSACTIONS_PROMISE_BROKEN, 
      eventSource: envelope.eventSource,
      eventId: envelope.eventId,
      timestamp: envelope.timestamp,
      correlationId: envelope.correlationId,
      triggeredBy: 'system',
      // Ensure these fields are available for target entity
      targetEntityId: debtId,
      targetEntityType: 'DEBT',
      promiseDate,
    };

    // Process workflow trigger (e.g., to escalate)
    await this.engineService.processWorkflowTrigger(organizationId, eventPayload);
  }
}