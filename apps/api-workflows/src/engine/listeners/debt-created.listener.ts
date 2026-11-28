import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EngineService } from '../engine.service';
import { EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { EVENT_TOPICS } from '@verichron/events';
import { DebtCreatedDto } from '../../events/event-dto/debts/debt-created.dto';

@Injectable()
export class DebtCreatedListener extends AbstractBaseListener<DebtCreatedDto> {
  constructor(private readonly engineService: EngineService) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_CREATED,
    dto: DebtCreatedDto,
  })
  async onMessage(data: DebtCreatedDto, envelope: EventEnvelope<DebtCreatedDto>) {
    this.logger.debug(`Received DebtCreatedEvent: ${JSON.stringify(data)}`);

    const { organizationId, debtId, debtorProfileId } = data;
    
    if (!organizationId) {
      this.logger.error('DebtCreatedEvent payload missing organizationId.');
      return;
    }

    // Create enriched payload for workflow engine
    const eventPayload = {
      ...data,
      eventType: EVENT_TYPES.DEBTS_DEBT_CREATED,
      eventSource: envelope.eventSource,
      eventId: envelope.eventId,
      timestamp: envelope.timestamp,
      correlationId: envelope.correlationId,
      triggeredBy: 'system',
      // Ensure these fields are available for target entity
      targetEntityId: debtId || debtorProfileId,
      targetEntityType: debtId ? 'DEBT' : 'DEBTOR',
    };

    // Process workflow trigger
    await this.engineService.processWorkflowTrigger(organizationId, eventPayload);
  }
}