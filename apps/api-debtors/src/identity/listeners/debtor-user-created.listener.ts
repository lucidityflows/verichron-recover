/**
 * DebtorUserCreatedListener
 *
 * Subscribes to single user creation events from api-users.
 * Links userId to debtor identity to enable debtor portal access.
 *
 * Flow:
 * 1. Receives USERS_DEBTOR_USER_CREATED from api-users
 * 2. Standardized validation and logging (via AbstractBaseListener)
 * 3. Links userId to DebtorIdentity
 * 4. Publishes DEBTORS_USER_LINKED event (consumed by api-debts for Redis indexing)
 */
import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DebtorIdentityService } from '../identity.service';
import { DebtorUserCreatedDto } from '../../events/event-dto/users/debtor-user-created.dto';

@Injectable()
export class DebtorUserCreatedListener extends AbstractBaseListener<DebtorUserCreatedDto> {
  constructor(
    private readonly identityService: DebtorIdentityService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.USERS,
    eventType: EVENT_TYPES.USERS_DEBTOR_USER_CREATED,
    dto: DebtorUserCreatedDto,
  })
  async onMessage(data: DebtorUserCreatedDto, envelope: EventEnvelope<DebtorUserCreatedDto>) {
    // Get the debtor identity ID from the profile
    const debtorIdentityId = await this.getDebtorIdentityIdFromProfile(
      data.debtorProfileId,
    );

    if (!debtorIdentityId) {
      this.logger.error(
        `❌ Could not find debtor identity for profile ${data.debtorProfileId}`,
      );
      return; // Acknowledge message to avoid retry loop
    }

    // Link userId to debtor identity with organization context
    try {
      await this.identityService.linkUserToIdentityWithProfile(
        debtorIdentityId,
        data.userId,
        data.organizationId,
      );

      this.logger.log(
        `✅ Linked user ${data.userId} to identity ${debtorIdentityId} in org ${data.organizationId}`,
      );
    } catch (error: any) {
      // If already linked to the same user, that's OK (idempotency)
      if (error.message?.includes('already linked')) {
        this.logger.log(
          `⚠️ Identity ${debtorIdentityId} already linked to user ${data.userId} (idempotent)`,
        );
      } else {
        // Other errors should fail the event
        throw error;
      }
    }
  }

  /**
   * Helper method to get debtorIdentityId from debtorProfileId
   */
  private async getDebtorIdentityIdFromProfile(
    debtorProfileId: string,
  ): Promise<string | null> {
    // Access the profile repository from the identity service
    const profile = await this.identityService['profileRepository'].findOne({
      where: { id: debtorProfileId },
      select: ['debtorIdentityId'],
    });

    return profile?.debtorIdentityId || null;
  }
}