import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../profiles/entities';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DebtorProfileCreatedDto } from '../../events/event-dto/debtors/debtor-profile-created.dto';

/**
 * Debtor Profile Created Event Listener
 *
 * Subscribes to DebtorProfileCreated events from api-debtors to maintain
 * awareness of debtor profiles within each organization.
 *
 * **Purpose:**
 * When api-debtors creates a new debtor profile for an organization (e.g.,
 * during portfolio import or manual debtor creation), this listener enables
 * api-organizations to:
 * - Track debtor profile count per organization
 * - Maintain organization-level debtor analytics
 * - Support future org-level debtor features
 *
 * **Workflow:**
 * 1. Receive DebtorProfileCreated event from api-debtors
 * 2. Log the creation for audit and monitoring
 * 3. (Future) Update organization analytics/counters
 * 4. (Future) Trigger organization-level workflows if needed
 *
 * **Event Source:** api-debtors
 * **Event Type:** debtors.profile.created
 * **Subscription:** api-organizations.debtor-profile-created.analytics.sub
 *
 * **Use Cases:**
 * - Organization dashboard: Show total debtor count
 * - Analytics: Track debtor growth over time
 * - Billing: Debtor-based pricing tiers
 * - Compliance: Audit trail of debtor onboarding
 *
 * **Performance:**
 * - Lightweight logging-only implementation (MVP)
 * - Future: Increment cached counters in Redis
 * - Future: Aggregate statistics for dashboards
 *
 * **Error Handling:**
 * - Missing organizations logged as warnings
 * - Retries on fatal errors via Pub/Sub
 * - Non-blocking for core debtor creation flow
 */
@Injectable()
export class DebtorProfileCreatedListener extends AbstractBaseListener<DebtorProfileCreatedDto> {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {
    super();
  }

  /**
   * Handle DebtorProfileCreated event.
   *
   * Process:
   * 1. Extract profile and organization details from event
   * 2. Log the creation for monitoring
   * 3. (Future) Update organization analytics
   *
   * Error Handling:
   * - Logs warning if organization not found (shouldn't happen)
   * - Throws error on processing failures to trigger retry
   *
   * @param event - DebtorProfileCreated event envelope
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTORS,
    eventType: EVENT_TYPES.DEBTORS_PROFILE_CREATED,
    dto: DebtorProfileCreatedDto,
  })
  async onMessage(
    data: DebtorProfileCreatedDto,
    envelope: EventEnvelope<DebtorProfileCreatedDto>,
  ): Promise<void> {
    const { profileId, identityId, organizationId, createdAt } = data;

    this.logger.log(
      `Debtor profile created for organization ${organizationId}`,
      {
        eventId: envelope.eventId,
        profileId,
        identityId,
        organizationId,
        createdAt,
      },
    );

    // Verify organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      select: ['id', 'name'],
    });

    if (!organization) {
      this.logger.warn(
        `Organization ${organizationId} not found for debtor profile ${profileId}`,
        {
          eventId: envelope.eventId,
          profileId,
          organizationId,
        },
      );
      // Don't throw - this is an analytics listener, not critical
      return;
    }

    this.logger.debug(
      `Tracked debtor profile creation for ${organization.name}`,
      {
        eventId: envelope.eventId,
        profileId,
        identityId,
        organizationId,
        organizationName: organization.name,
      },
    );

    // TODO (Future Enhancement): Update organization analytics
    // Example future implementations:
    // - Increment debtorProfileCount in organization record
    // - Update Redis counter: debtor:org:{orgId}:count
    // - Publish to analytics pipeline for dashboards
    // - Check for tier limits and send alerts if approaching cap
    //
    // For MVP: Logging is sufficient for audit trail and monitoring.
    // Organization-level analytics can be queried from api-debtors
    // when needed via cross-service queries or event orchestrator.
  }
}
