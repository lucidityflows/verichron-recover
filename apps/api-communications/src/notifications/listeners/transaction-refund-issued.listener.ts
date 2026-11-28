import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DispatchService } from '../../dispatch/dispatch.service';
import { DispatchMethod } from '@verichron/enums';
import { TransactionRefundIssuedDto } from '../../events/event-dto';

/**
 * Listens for the TRANSACTIONS_REFUND_ISSUED event from api-transactions.
 */
@Injectable()
export class TransactionRefundIssuedListener extends AbstractBaseListener<TransactionRefundIssuedDto> {
  constructor(
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_REFUND_ISSUED,
    dto: TransactionRefundIssuedDto,
  })
  async onMessage(data: TransactionRefundIssuedDto, envelope: EventEnvelope<TransactionRefundIssuedDto>): Promise<void> {
    this.logger.log(`📨 Received TRANSACTIONS_REFUND_ISSUED for debtor ${data.debtorId}`);
    
    await this.dispatchService.dispatch({
      organizationId: data.organizationId,
      debtorId: data.debtorId,
      communicationType: DispatchMethod.EMAIL,
      templateName: 'refund-notification',
      context: {
        debtorId: data.debtorId,
        organizationId: data.organizationId,
        refund: {
          amount: data.amount,
          originalTransactionId: data.originalTransactionId,
        },
      },
    });
    
    this.logger.log(`✅ Dispatched refund notification for debtor ${data.debtorId}`);
  }
}