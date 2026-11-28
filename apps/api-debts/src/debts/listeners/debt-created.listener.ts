import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { DebtIndexService } from '../redis-read-model/debt-index.service';
import { DebtCreatedDto } from '../../events/event-dto/debts/debt-created.dto';

/**
 * DebtCreated Event Listener
 *
 * Subscribes to DebtCreated events and updates the Redis read model
 * to include the new debt in the debtor's index.
 *
 * **Purpose:**
 * When a new debt is created, add it to the Redis index for the associated
 * debtor user so it appears in their /my-debts query immediately.
 *
 * **Workflow:**
 * 1. Receive DebtCreated event with debt details
 * 2. Look up userId for the debtorId from Redis mapping
 * 3. Add debt to Redis sorted set for the organization
 * 4. Create Redis hash for debt summary
 *
 * **Event Source:** api-debts (local event)
 * **Event Type:** debts.debt.created
 * **Subscription:** api-debts.debt-created.redis-index.sub
 *
 * **Redis Structure Updated:**
 * - Sorted Sets: `debtor:${userId}:org:${organizationId}:debts` (add debtId)
 * - Hashes: `debt:${debtId}:summary` (create summary)
 *
 * **Performance:**
 * - Redis lookup: ~1-2ms
 * - Redis write: ~2-5ms
 * - Total: <10ms per debt creation
 *
 * **Edge Cases:**
 * - If userId not found for debtorId, log warning and skip (debtor not linked to user yet)
 * - This is expected for debtors created before user linking was implemented
 * - Index will be built when DebtorUserLinked event is received
 */
@Injectable()
export class DebtCreatedListener extends AbstractBaseListener<DebtCreatedDto> {
  constructor(private readonly debtIndexService: DebtIndexService) {
    super();
  }

  /**
   * Handle DebtCreated event.
   *
   * Process:
   * 1. Extract debt details from event
   * 2. Look up userId for the debtorId
   * 3. If userId found, add debt to Redis index
   * 4. Log completion for monitoring
   *
   * Error Handling:
   * - If userId not found, log warning and skip (not an error)
   * - Throws error on Redis failures to trigger retry via GCP Pub/Sub
   *
   * @param event - DebtCreated event envelope
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_CREATED,
    dto: DebtCreatedDto,
  })
  async onMessage(data: DebtCreatedDto, envelope: EventEnvelope<DebtCreatedDto>): Promise<void> {
    const { debtId, debtorIdentityId, debtorProfileId, organizationId, amount, currency, status, createdAt } = data;

    // If no debtorIdentityId, skip Redis indexing (manual debt creation case)
    if (!debtorIdentityId) {
      this.logger.warn(`No debtorIdentityId for debt ${debtId} - skipping Redis index update`, {
        eventId: envelope.eventId,
        debtId,
        debtorProfileId,
        organizationId,
      });
      return;
    }

    // Look up userId for this debtorId
    const userId = await this.debtIndexService.getUserIdForIdentity(debtorIdentityId);

    if (!userId) {
      // This is expected for debtors that haven't been linked to users yet
      // The index will be built when DebtorUserLinked event is received
      this.logger.warn(`No userId found for identity ${debtorIdentityId} - skipping Redis index update`, {
              eventId: envelope.eventId,
              debtId,
              debtorIdentityId,
              debtorProfileId,
              organizationId,
            },
      );
      return;
    }

    // Add debt to Redis index
    await this.debtIndexService.addDebtToIndex(userId, {
      id: debtId,
      debtorProfileId, // Use debtorProfileId
      organizationId,
      amount,
      currency,
      status,
      createdAt,
    });

    this.logger.log(`Successfully added debt ${debtId} to Redis index for user ${userId} (identity ${debtorIdentityId}, profile ${debtorProfileId})`);
  }
}
