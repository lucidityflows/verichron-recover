// src/profiles/listeners/organization-name-changed.listener.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMembershipEntity } from '../entities';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { OrganizationNameChangedDto } from '../../events/event-dto';

@Injectable()
export class OrganizationNameChangedListener extends AbstractBaseListener<OrganizationNameChangedDto> {
  constructor(
    @InjectRepository(UserMembershipEntity)
    private readonly membershipRepository: Repository<UserMembershipEntity>,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_NAME_CHANGED,
    dto: OrganizationNameChangedDto,
  })
  async onMessage(data: OrganizationNameChangedDto, envelope: EventEnvelope<OrganizationNameChangedDto>): Promise<void> {
    this.logger.log(
      `Updating org name for ${data.organizationId}: ${data.previousName} → ${data.newName}`,
    );

    await this.membershipRepository.update(
      { organizationId: data.organizationId },
      { organizationName: data.newName },
    );

    this.logger.log(`Successfully updated org name for ${data.organizationId}`);
  }
}