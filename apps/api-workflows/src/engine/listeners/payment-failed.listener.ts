import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { EngineService } from '../engine.service';
import { PaymentFailedDto } from '../../events/event-dto/transactions/payment-failed.dto';

@Injectable()
export class PaymentFailedListener extends AbstractBaseListener<PaymentFailedDto> {
  constructor(private readonly engineService: EngineService) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_TRANSACTION_FAILED,
    dto: PaymentFailedDto,
  })
  async handlePaymentFailedEvent(data: PaymentFailedDto, envelope: EventEnvelope<PaymentFailedDto>) {
    this.logger.debug(`Received PaymentFailedEvent: ${JSON.stringify(data)}`);

    const { organizationId, debtId, debtorId } = data;
    if (!organizationId || (!debtId && !debtorId)) {
      this.logger.error('PaymentFailedEvent payload missing organizationId, debtId, or debtorId.');
      return;
    }

    // Trigger workflow evaluation for this failure
    const eventPayloadForEngine = {
      ...data,
      eventType: envelope.eventType,
      eventSource: envelope.eventSource,
      eventId: envelope.eventId,
      timestamp: envelope.timestamp,
      correlationId: envelope.correlationId,
      triggeredBy: 'system',
      targetEntityId: debtId || debtorId,
      targetEntityType: debtId ? 'DEBT' : 'DEBTOR',
    };

    await this.engineService.processWorkflowTrigger(
      organizationId,
      eventPayloadForEngine,
    );
  }
}
