/**
 * DebtorUserCreatedBatchListener
 *
 * Subscribes to user creation batch events from api-users.
 * Links userId to debtor identities to enable debtor portal access.
 *
 * Flow:
 * 1. Receives USERS_DEBTOR_USER_CREATED_BATCH from api-users
 * 2. Standardized validation and logging (via AbstractBaseListener)
 * 3. For each userMapping, links userId to DebtorIdentity
 * 4. Publishes DEBTORS_USER_LINKED events (consumed by api-debts for Redis indexing)
 */
import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DebtorIdentityService } from '../identity.service';
import { DebtorUserCreatedBatchDto } from '../../events/event-dto/users/debtor-user-created-batch.dto';

@Injectable()
export class DebtorUserCreatedBatchListener extends AbstractBaseListener<DebtorUserCreatedBatchDto> {
  constructor(
    private readonly identityService: DebtorIdentityService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.USERS,
    eventType: EVENT_TYPES.USERS_DEBTOR_USER_CREATED_BATCH,
    dto: DebtorUserCreatedBatchDto,
  })
  async onMessage(data: DebtorUserCreatedBatchDto, envelope: EventEnvelope<DebtorUserCreatedBatchDto>) {
    // Link each userId to its debtor identity
    let linkedCount = 0;
    let skippedCount = 0;

    for (const mapping of data.userMappings) {
      try {
        await this.identityService.linkUserToIdentityWithProfile(
          mapping.debtorIdentityId,
          mapping.userId,
          data.organizationId,
        );
        linkedCount++;

        this.logger.log(
          `✅ Linked user ${mapping.userId} to identity ${mapping.debtorIdentityId} in org ${data.organizationId}`,
        );
      } catch (error: any) {
        // If already linked to the same user, that's OK (idempotency)
        if (error.message?.includes('already linked')) {
          this.logger.log(
            `⚠️ Identity ${mapping.debtorIdentityId} already linked to user ${mapping.userId} (idempotent)`,
          );
          skippedCount++;
        } else {
          // Other errors should fail the batch
          throw error;
        }
      }
    }

    this.logger.log(
      `✅ Successfully processed batch ${data.batchNumber}. Linked: ${linkedCount}, Skipped: ${skippedCount}`,
    );
  }
}