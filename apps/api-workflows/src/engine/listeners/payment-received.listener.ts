import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { EngineService } from '../engine.service';
import { PaymentReceivedDto } from '../../events/event-dto';

@Injectable()
export class PaymentReceivedListener extends AbstractBaseListener<PaymentReceivedDto> {
  constructor(private readonly engineService: EngineService) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_PAYMENT_RECEIVED,
    dto: PaymentReceivedDto,
  })
  async handlePaymentReceivedEvent(data: PaymentReceivedDto, envelope: EventEnvelope<PaymentReceivedDto>) {
    this.logger.debug(`Received PaymentReceivedEvent: ${JSON.stringify(data)}`);

    const { organizationId, debtId } = data;
    if (!organizationId || !debtId) {
      this.logger.error('PaymentReceivedEvent payload missing organizationId or debtId.');
      return;
    }

    // Trigger workflow evaluation for this debt (e.g., to pause dunning workflow)
    // Create an eventPayload object to pass to the engineService
    const eventPayloadForEngine = {
      ...data, // Include all original event data
      eventType: envelope.eventType,
      eventSource: envelope.eventSource, // Add event source from envelope
      eventId: envelope.eventId, // Add event ID from envelope
      timestamp: envelope.timestamp, // Add timestamp from envelope
      correlationId: envelope.correlationId, // Add correlationId from envelope
      triggeredBy: 'system', // Or a more specific trigger
      targetEntityId: debtId,
      targetEntityType: 'DEBT', // Assuming debt is the primary target for this event
    };

    await this.engineService.processWorkflowTrigger(
      organizationId,
      eventPayloadForEngine,
    );
  }
}
