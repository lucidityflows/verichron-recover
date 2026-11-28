import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DispatchService } from '../../dispatch/dispatch.service';
import { DispatchMethod } from '@verichron/enums';
import { TransactionFailedDto } from '../../events/event-dto';

/**
 * Listens for the TRANSACTIONS_TRANSACTION_FAILED event from api-transactions.
 */
@Injectable()
export class TransactionFailedListener extends AbstractBaseListener<TransactionFailedDto> {
  constructor(
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_TRANSACTION_FAILED,
    dto: TransactionFailedDto,
  })
  async onMessage(data: TransactionFailedDto, envelope: EventEnvelope<TransactionFailedDto>): Promise<void> {
    this.logger.log(`📨 Received TRANSACTIONS_TRANSACTION_FAILED for debtor ${data.debtorId}`);
    
    await this.dispatchService.dispatch({
      organizationId: data.organizationId,
      debtorId: data.debtorId,
      communicationType: DispatchMethod.EMAIL,
      templateName: 'payment-failed',
      context: {
        debtorId: data.debtorId,
        organizationId: data.organizationId,
        payment: {
          amount: data.amount,
          failureReason: data.failureReason,
        },
      },
    });

    this.logger.log(`✅ Dispatched payment failure notification for debtor ${data.debtorId}`);
  }
}