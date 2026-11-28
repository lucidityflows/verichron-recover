import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { EventEnvelope } from '@verichron/events';
import { ProfilesService } from '../profiles.service';
import { DebtorActionLoggedDto } from '../../events/event-dto';

/**
 * StickyAssignmentListener
 * 
 * Implements the "Relationship Layer" of the assignment strategy.
 * Listens for collector engagement events and "anchors" the collector to the debtor profile
 * as the primary (sticky) owner for that organization relationship.
 */
@Injectable()
export class StickyAssignmentListener extends AbstractBaseListener<DebtorActionLoggedDto> {
  constructor(private readonly profilesService: ProfilesService) {
    super();
  }

  /**
   * Listen for any action logged by a collector on a debtor.
   * The first successful engagement makes that collector "sticky".
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    eventType: EVENT_TYPES.COLLECTORS_DEBTOR_ACTION_LOGGED,
    dto: DebtorActionLoggedDto,
  })
  async onMessage(data: DebtorActionLoggedDto, envelope: EventEnvelope<DebtorActionLoggedDto>): Promise<void> {
    this.logger.log(`Processing engagement for debtor ${data.debtorId} by collector ${data.collectorUserId}`);
    
    // Update the profile with the sticky collector ID
    // The service method should handle the "only update if null" logic to preserve first-contact
    await this.profilesService.setStickyCollector(data.organizationId, data.debtorId, data.collectorUserId);
  }
}