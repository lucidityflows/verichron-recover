/**
 * ============================================================================
 * OrganizationCreatedListener - DISABLED FOR MVP
 * ============================================================================
 *
 * STATUS: Commented out in ProfilesModule (not active)
 *
 * PURPOSE:
 * This listener provisions admin users asynchronously via fire-and-forget events.
 *
 * MVP APPROACH (Current):
 * - Using synchronous orchestration via event-orchestrator
 * - Orchestrator calls api-users via HTTP: POST /users/internal/provision-initial-admin
 * - Platform Admin gets immediate feedback (adminUserId/adminEmail in response)
 * - White-glove onboarding for alpha/beta customers
 *
 * FUTURE USE CASE (Self-Service Trials):
 * When we implement public self-service registration (Option 4):
 * - Re-enable this listener
 * - Prospects register → OrganizationCreated event published
 * - This listener provisions trial admin user asynchronously
 * - No orchestrator needed for simple trial provisioning
 * - Scales better for high-volume signups
 *
 * TO RE-ENABLE:
 * 1. Uncomment OrganizationCreatedListener in ProfilesModule providers
 * 2. Uncomment import in ProfilesModule
 * 3. Test idempotency with orchestrator (both paths should work)
 * 4. Update ONBOARDING_PROTOCOLS.md
 *
 * See: ./ONBOARDING_PROTOCOLS.md
 * ============================================================================
 */
import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope
} from '@verichron/events';
import { ProfilesService } from '../profiles.service';
import { OrganizationCreatedDto } from '../../events/event-dto';

@Injectable()
export class OrganizationCreatedListener extends AbstractBaseListener<OrganizationCreatedDto> {
  constructor(
    private readonly profilesService: ProfilesService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED,
    dto: OrganizationCreatedDto,
  })
  async onMessage(data: OrganizationCreatedDto, envelope: EventEnvelope<OrganizationCreatedDto>) {
    this.logger.log(
      `[OrganizationCreatedListener] 📨 Processing OrganizationCreated event for org: ${data.organizationId}.`
    );

    await this.profilesService.provisionInitialAdmin({
      organizationId: data.organizationId,
      organizationName: data.organizationName,
      email: data.adminUser.email,
      firstName: data.adminUser.firstName,
      lastName: data.adminUser.lastName,
    });

    this.logger.log(
      `[OrganizationCreatedListener] ✅ Successfully provisioned admin for org: ${data.organizationId}`
    );
  }
}
