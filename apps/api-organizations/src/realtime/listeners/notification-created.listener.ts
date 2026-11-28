import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { REALTIME_EVENT_TYPES } from '@verichron/events';
import { RealtimeGateway } from '../realtime.gateway';
import { NotificationCreatedDto } from '../../events/event-dto/collectors/notification-created.dto';

/**
 * NotificationCreatedListener (Realtime Bridge)
 *
 * Subscribes to NotificationCreated events from api-collectors and
 * forwards them to the connected UI clients via WebSockets.
 *
 * **Purpose:**
 * This provides the "Instant Pulse" feel. When a notification is created
 * in the background (like the Welcome message), it appears in the user's
 * inbox without a page refresh.
 *
 * **Trigger:** `COLLECTORS.NOTIFICATION.CREATED`
 * **Action:** WebSocket Broadcast to specific User room.
 */
@Injectable()
export class NotificationCreatedListener extends AbstractBaseListener<NotificationCreatedDto> {
  constructor(private readonly realtimeGateway: RealtimeGateway) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    eventType: EVENT_TYPES.COLLECTORS_NOTIFICATION_CREATED,
    dto: NotificationCreatedDto,
  })
  async onMessage(
    data: NotificationCreatedDto,
    envelope: EventEnvelope<NotificationCreatedDto>,
  ): Promise<void> {
    const { userId, organizationId } = data;

    this.logger.log(`Forwarding notification ${data.notificationId} to user ${userId} via WebSockets`);

    // Forward to the specific user's socket room
    // Using SYSTEM_NOTIFICATION as the generic event for external notifications
    this.realtimeGateway.sendToUser(
      userId, 
      REALTIME_EVENT_TYPES.SYSTEM_NOTIFICATION, 
      data
    );
    
    // Also invalidate any generic notification queries if needed
    // In the UI, the RealtimeContext should listen for SYSTEM_NOTIFICATION
  }
}
