// src/profiles/listeners/organization-suspended.listener.ts
import { Injectable } from '@nestjs/common';
import { ProfilesService } from '../profiles.service';
import { EVENT_TYPES, EVENT_TOPICS, type EventEnvelope } from '@verichron/events';
import { UserStatus } from '@verichron/enums';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { OrganizationSuspendedDto } from '../../events/event-dto';

@Injectable()
export class OrganizationSuspendedListener extends AbstractBaseListener<OrganizationSuspendedDto> {
  constructor(private readonly profilesService: ProfilesService) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SUSPENDED,
    dto: OrganizationSuspendedDto,
  })
  async onMessage(data: OrganizationSuspendedDto, envelope: EventEnvelope<OrganizationSuspendedDto>): Promise<void> {
    this.logger.warn(`Suspending all users for org: ${data.organizationId}`);

    // Get all users in this organization
    const memberships = await this.profilesService.findMembershipsByOrganization(
      data.organizationId,
    );

    // Suspend each user
    for (const membership of memberships) {
      await this.profilesService.updateUserStatus(
        membership.userId,
        UserStatus.SUSPENDED,
      );
    }

    this.logger.log(`Suspended ${memberships.length} users`);
  }
}
