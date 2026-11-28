import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { OrganizationStatus } from '@verichron/enums';
import { AuditLogWriterService } from '../../storage/services/audit-log-writer.service';
import { OrganizationStatusUpdatedDto } from '../event-dto/organizations/organization-status-updated.dto';

@Injectable()
export class OrganizationStatusChangedListener extends AbstractBaseListener<OrganizationStatusUpdatedDto> {
  constructor(
    private readonly auditLogWriterService: AuditLogWriterService,
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
    const { organizationId, previousStatus, newStatus, reason, actor, statusChangedAt } = data;

    const action =
      newStatus === OrganizationStatus.ACTIVE
        ? 'ORGANIZATION.ACTIVATED'
        : 'ORGANIZATION.STATUS_CHANGE';

    const targetType = 'ORGANIZATION';
    const targetId = organizationId;

    await this.auditLogWriterService.writeAuditLog({
      organizationId,
      eventId: envelope.eventId,
      actorSnapshot: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      },
      action,
      targetType,
      targetId,
      changes: {
        status: { old: previousStatus, new: newStatus },
      },
      metadata: {
        reason,
        correlationId: envelope.correlationId,
      },
      createdAt: new Date(statusChangedAt),
    });

    this.logger.log(
      `Audit Log recorded: ${action} for Org ${organizationId}`,
    );
  }
}
