import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { GoalsService } from '../goals.service';
import { GoalType, ActionType } from '@verichron/enums';
import { DebtorActionLoggedDto } from '../../events/event-dto/debtor-action-logged.dto';

/**
 * DebtorActionLoggedListener
 *
 * Listens for collector actions logged in the workstation and updates
 * matching CONTACT or PROMISE goals in real-time.
 */
@Injectable()
export class DebtorActionLoggedListener extends AbstractBaseListener<DebtorActionLoggedDto> {
  constructor(private readonly goalsService: GoalsService) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    eventType: EVENT_TYPES.COLLECTORS_DEBTOR_ACTION_LOGGED,
    dto: DebtorActionLoggedDto,
  })
  async onMessage(
    data: DebtorActionLoggedDto,
    envelope: EventEnvelope<DebtorActionLoggedDto>,
  ): Promise<void> {
    const { actionType, collectorUserId, organizationId, actionId } = data;

    this.logger.debug(
      `Received action.logged: ${actionType} from collector ${collectorUserId}`,
    );

    // Logic: Map ActionType to GoalType
    let goalType: GoalType | null = null;

    if (actionType === ActionType.CALL || actionType === ActionType.EMAIL || actionType === ActionType.SMS) {
      goalType = GoalType.CONTACTS;
    } else if (actionType === ActionType.PROMISE) {
      goalType = GoalType.PROMISES;
    }

    if (goalType) {
      await this.goalsService.incrementProgress(
        organizationId,
        collectorUserId,
        goalType,
        1, // Increment count by 1
      );
    }
  }
}
