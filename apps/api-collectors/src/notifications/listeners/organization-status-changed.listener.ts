import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { OrganizationStatus, NotificationType } from '@verichron/enums';
import { EventPublisher } from '@verichron/event-publisher';
import { NotificationService } from '../notifications.service';
import { OrganizationStatusUpdatedDto } from '../../events/event-dto/organizations/organization-status-updated.dto';
import { NotificationCreatedDto } from '../../events/event-dto/collectors/notification-created.dto';

/**
 * OrganizationStatusChanged Event Listener
 *
 * Subscribes to OrganizationStatusChanged events to trigger initial setup notifications.
 *
 * **Purpose:**
 * When an organization transitions from PROVISIONING to ACTIVE, it means the initial
 * admin user has been fully provisioned and the system is ready. We generate a 
 * real "Welcome" notification to guide the admin to import their first portfolio.
 *
 * **Trigger:** `ORGANIZATIONS.ORGANIZATION.STATUS_CHANGED`
 * **Condition:** `previousStatus === PROVISIONING` && `newStatus === ACTIVE`
 * **Action:** Create Notification & Publish `COLLECTORS.NOTIFICATION.CREATED`
 */
@Injectable()
export class OrganizationStatusChangedListener extends AbstractBaseListener<OrganizationStatusUpdatedDto> {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly eventPublisher: EventPublisher,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_STATUS_CHANGED,
    dto: OrganizationStatusUpdatedDto,
  })
  async onMessage(
    data: OrganizationStatusUpdatedDto,
    envelope: EventEnvelope<OrganizationStatusUpdatedDto>,
  ): Promise<void> {
    const { organizationId, previousStatus, newStatus, updatedBy } = data;

    // We only care about the PROVISIONING -> ACTIVE transition (Completion of Onboarding)
    if (previousStatus === OrganizationStatus.PROVISIONING && newStatus === OrganizationStatus.ACTIVE) {
      this.logger.log(
        `Organization ${organizationId} activated. Generating welcome notification for admin ${updatedBy}.`
      );

      // 1. Create the persistent notification record in collectors_db
      const notification = await this.notificationService.createNotification({
        organizationId,
        userId: updatedBy,
        type: NotificationType.HIGH_PRIORITY_ITEM,
        title: 'Verichron Setup Required',
        message: 'Welcome to your new workspace. Please complete the initial portfolio import to activate analytics.',
        actionLink: '/inventory/ingestion',
        metadata: {
          isSystemWelcome: true,
          triggeredByEvent: envelope.eventId,
        },
      });

      // 2. Publish Fact event for the Realtime Bridge (api-organizations)
      const notificationEvent: NotificationCreatedDto = {
        notificationId: notification.id,
        organizationId: notification.organizationId,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        actionLink: notification.actionLink,
        metadata: notification.metadata,
        createdAt: new Date(notification.createdAt),
      };

      await this.eventPublisher.publish(
        EVENT_TYPES.COLLECTORS_NOTIFICATION_CREATED,
        notificationEvent,
        NotificationCreatedDto
      );

      this.logger.log(`Successfully generated and published notification ${notification.id} for user ${updatedBy}`);
    }
  }
}
