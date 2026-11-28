import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DispatchService } from '../../dispatch/dispatch.service';
import { DispatchMethod } from '@verichron/enums';
import { TransactionSucceededDto } from '../../events/event-dto';

/**
 * Listens for the TRANSACTIONS_TRANSACTION_SUCCEEDED event from api-transactions.
 */
@Injectable()
export class TransactionSucceededListener extends AbstractBaseListener<TransactionSucceededDto> {
  constructor(
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_TRANSACTION_SUCCEEDED,
    dto: TransactionSucceededDto,
  })
  async onMessage(data: TransactionSucceededDto, envelope: EventEnvelope<TransactionSucceededDto>): Promise<void> {
    this.logger.log(`📨 Received TRANSACTIONS_TRANSACTION_SUCCEEDED for debtor ${data.debtorId}`);

    await this.dispatchService.dispatch({
      organizationId: data.organizationId,
      debtorId: data.debtorId,
      communicationType: DispatchMethod.EMAIL,
      templateName: 'payment-receipt',
      context: {
        debtorId: data.debtorId,
        organizationId: data.organizationId,
        payment: {
          amount: data.amount,
          transactionId: data.transactionId,
          date: data.transactionDate,
        },
      },
    });

    this.logger.log(`✅ Dispatched payment receipt for debtor ${data.debtorId}`);
  }
}