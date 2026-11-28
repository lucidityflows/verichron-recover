import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DispatchService } from '../../dispatch/dispatch.service';
import { DispatchMethod } from '@verichron/enums';
import { DebtStatusChangedDto } from '../../events/event-dto';

/**
 * Listens for the DEBTS_DEBT_STATUS_CHANGED event from api-debts.
 */
@Injectable()
export class DebtStatusChangedListener extends AbstractBaseListener<DebtStatusChangedDto> {
  constructor(
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_STATUS_CHANGED,
    dto: DebtStatusChangedDto,
  })
  async onMessage(data: DebtStatusChangedDto, envelope: EventEnvelope<DebtStatusChangedDto>): Promise<void> {
    this.logger.log(`📨 Received DEBTS_DEBT_STATUS_CHANGED for debt ${data.debtId} to status ${data.newStatus}`);

    const templateMap = {
      'PAID_IN_FULL': 'debt-paid-off',
      'SETTLED': 'debt-settled',
      'DISPUTED': 'debt-dispute-acknowledged',
    };

    const templateName = templateMap[data.newStatus as keyof typeof templateMap];

    if (!templateName) {
      this.logger.log(`No communication configured for status change to '${data.newStatus}'. Skipping.`);
      return;
    }

    await this.dispatchService.dispatch({
      organizationId: data.organizationId,
      debtorId: data.debtorId,
      debtId: data.debtId,
      communicationType: DispatchMethod.EMAIL,
      templateName,
      context: { ...data },
    });

    this.logger.log(`✅ Dispatched notification for debt ${data.debtId} status change to ${data.newStatus}`);
  }
}