import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DispatchService } from '../../dispatch/dispatch.service';
import { DispatchMethod } from '@verichron/enums';
import { DebtCreatedDto } from '../../events/event-dto';

/**
 * Listens for the DEBTS_DEBT_CREATED event from api-debts.
 */
@Injectable()
export class DebtCreatedListener extends AbstractBaseListener<DebtCreatedDto> {
  constructor(
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_CREATED,
    dto: DebtCreatedDto,
  })
  async onMessage(data: DebtCreatedDto, envelope: EventEnvelope<DebtCreatedDto>): Promise<void> {
    this.logger.log(`📨 Received DEBTS_DEBT_CREATED for debtor ${data.debtorId}`);

    await this.dispatchService.dispatch({
      organizationId: data.organizationId,
      debtorId: data.debtorId,
      debtId: data.debtId,
      communicationType: DispatchMethod.EMAIL, // Or LETTER, depending on compliance rules
      templateName: 'initial-debt-notification',
      context: { ...data },
    });

    this.logger.log(`✅ Dispatched initial debt notification for debt ${data.debtId}`);
  }
}