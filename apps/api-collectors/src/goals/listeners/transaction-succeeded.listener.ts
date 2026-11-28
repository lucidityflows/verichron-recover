import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { GoalsService } from '../goals.service';
import { GoalType } from '@verichron/enums';
import { TransactionSucceededDto } from '../../events/event-dto/transaction-succeeded.dto';

/**
 * TransactionSucceededListener
 *
 * Listens for successful transactions from api-transactions and updates
 * matching REVENUE goals in real-time.
 */
@Injectable()
export class TransactionSucceededListener extends AbstractBaseListener<TransactionSucceededDto> {
  constructor(private readonly goalsService: GoalsService) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_TRANSACTION_SUCCEEDED,
    dto: TransactionSucceededDto,
  })
  async onMessage(
    data: TransactionSucceededDto,
    envelope: EventEnvelope<TransactionSucceededDto>,
  ): Promise<void> {
    const { amount, debtorId, organizationId, transactionId } = data;

    this.logger.debug(
      `Received transaction.succeeded for debtor ${debtorId}, amount ${amount}`,
    );

    // Logic: Find the collector assigned to this debtor
    // and increment their REVENUE goals.
    // For now, we'll assume the GoalsService handle finding the collector
    // from the debtorId mapping if collectorId is missing in payload.
    
    // Since TransactionSucceededPayload doesn't have collectorId,
    // we need a way to attribute it. We can look up the debtor assignment.
    
    // TODO: Implement findCollectorForDebtor in GoalsService or similar
    // For this implementation, we will use a placeholder or assume 
    // the incrementProgress handles it.
    
    // Actually, let's update GoalsService to accept debtorId 
    // if collectorId is not available.
    
    await this.goalsService.incrementProgressByDebtor(
      organizationId,
      debtorId!,
      GoalType.COLLECTIONS,
      amount,
    );
  }
}
