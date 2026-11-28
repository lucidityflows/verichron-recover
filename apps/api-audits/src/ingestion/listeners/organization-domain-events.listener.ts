import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { AuditLogWriterService } from '../../storage/services/audit-log-writer.service';
import {
  OrganizationCreatedDto,
  OrganizationUpdatedDto,
  OrganizationNameChangedDto,
  OrganizationSettingsUpdatedDto,
  TeamCreatedDto,
  TeamUpdatedDto,
  TeamDeletedDto,
  TeamMemberAddedDto,
  TeamMemberRemovedDto,
  PortfolioAssignedToTeamDto,
  PortfolioUnassignedFromTeamDto,
} from '../event-dto';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class OrganizationDomainEventsListener extends AbstractBaseListener<any> {
  constructor(
    private readonly auditLogWriterService: AuditLogWriterService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED,
    dto: OrganizationCreatedDto,
  })
  async onOrganizationCreated(
    data: OrganizationCreatedDto,
    envelope: EventEnvelope<OrganizationCreatedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'ORGANIZATION.CREATED',
      targetType: 'ORGANIZATION',
      targetId: data.organizationId,
      actorSource: data,
      changes: undefined,
      metadata: {
        organizationName: data.organizationName,
        organizationType: data.organizationType,
        adminUser: data.adminUser,
      },
      occurredAt: data.createdAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_UPDATED,
    dto: OrganizationUpdatedDto,
  })
  async onOrganizationUpdated(
    data: OrganizationUpdatedDto,
    envelope: EventEnvelope<OrganizationUpdatedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'ORGANIZATION.UPDATED',
      targetType: 'ORGANIZATION',
      targetId: data.organizationId,
      actorSource: data,
      changes: {
        updatedFields: { old: null, new: data.updatedFields },
      },
      metadata: {},
      occurredAt: data.updatedAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_NAME_CHANGED,
    dto: OrganizationNameChangedDto,
  })
  async onOrganizationNameChanged(
    data: OrganizationNameChangedDto,
    envelope: EventEnvelope<OrganizationNameChangedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'ORGANIZATION.NAME_CHANGED',
      targetType: 'ORGANIZATION',
      targetId: data.organizationId,
      actorSource: data,
      changes: {
        name: { old: data.previousName, new: data.newName },
      },
      metadata: {},
      occurredAt: data.changedAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SETTINGS_UPDATED,
    dto: OrganizationSettingsUpdatedDto,
  })
  async onOrganizationSettingsUpdated(
    data: OrganizationSettingsUpdatedDto,
    envelope: EventEnvelope<OrganizationSettingsUpdatedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'ORGANIZATION.SETTINGS_UPDATED',
      targetType: 'ORGANIZATION',
      targetId: data.organizationId,
      actorSource: data,
      changes: {
        updatedSettingKeys: { old: null, new: data.updatedSettingKeys },
      },
      metadata: {},
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.TEAMS_TEAM_CREATED,
    dto: TeamCreatedDto,
  })
  async onTeamCreated(
    data: TeamCreatedDto,
    envelope: EventEnvelope<TeamCreatedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'TEAM.CREATED',
      targetType: 'TEAM',
      targetId: data.teamId,
      actorSource: data,
      changes: undefined,
      metadata: {
        name: data.name,
        managerUserId: data.managerUserId ?? null,
      },
      occurredAt: data.createdAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.TEAMS_TEAM_UPDATED,
    dto: TeamUpdatedDto,
  })
  async onTeamUpdated(
    data: TeamUpdatedDto,
    envelope: EventEnvelope<TeamUpdatedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'TEAM.UPDATED',
      targetType: 'TEAM',
      targetId: data.teamId,
      actorSource: data,
      changes: {
        name: { old: null, new: data.name },
        managerUserId: { old: null, new: data.managerUserId ?? null },
      },
      metadata: {},
      occurredAt: data.updatedAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.TEAMS_TEAM_DELETED,
    dto: TeamDeletedDto,
  })
  async onTeamDeleted(
    data: TeamDeletedDto,
    envelope: EventEnvelope<TeamDeletedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'TEAM.DELETED',
      targetType: 'TEAM',
      targetId: data.teamId,
      actorSource: data,
      changes: undefined,
      metadata: {},
      occurredAt: data.deletedAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.TEAMS_MEMBER_ADDED,
    dto: TeamMemberAddedDto,
  })
  async onTeamMemberAdded(
    data: TeamMemberAddedDto,
    envelope: EventEnvelope<TeamMemberAddedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'TEAM.MEMBER_ADDED',
      targetType: 'TEAM',
      targetId: data.teamId,
      actorSource: data,
      changes: {
        member: { old: null, new: data.userId },
      },
      metadata: {
        roleOnTeam: data.roleOnTeam,
        isPrimary: data.isPrimary,
      },
      occurredAt: data.addedAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.TEAMS_MEMBER_REMOVED,
    dto: TeamMemberRemovedDto,
  })
  async onTeamMemberRemoved(
    data: TeamMemberRemovedDto,
    envelope: EventEnvelope<TeamMemberRemovedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'TEAM.MEMBER_REMOVED',
      targetType: 'TEAM',
      targetId: data.teamId,
      actorSource: data,
      changes: {
        member: { old: data.userId, new: null },
      },
      metadata: {},
      occurredAt: data.removedAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ORGANIZATIONS_PORTFOLIO_ASSIGNED_TO_TEAM,
    dto: PortfolioAssignedToTeamDto,
  })
  async onPortfolioAssignedToTeam(
    data: PortfolioAssignedToTeamDto,
    envelope: EventEnvelope<PortfolioAssignedToTeamDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'PORTFOLIO.ASSIGNED_TO_TEAM',
      targetType: 'PORTFOLIO',
      targetId: data.portfolioId,
      actorSource: data,
      changes: {
        teamId: { old: null, new: data.teamId },
      },
      metadata: {
        teamId: data.teamId,
      },
      occurredAt: data.assignedAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ORGANIZATIONS_PORTFOLIO_UNASSIGNED_FROM_TEAM,
    dto: PortfolioUnassignedFromTeamDto,
  })
  async onPortfolioUnassignedFromTeam(
    data: PortfolioUnassignedFromTeamDto,
    envelope: EventEnvelope<PortfolioUnassignedFromTeamDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'PORTFOLIO.UNASSIGNED_FROM_TEAM',
      targetType: 'PORTFOLIO',
      targetId: data.portfolioId,
      actorSource: data,
      changes: {
        teamId: { old: data.teamId, new: null },
      },
      metadata: {
        teamId: data.teamId,
      },
      occurredAt: data.unassignedAt,
    });
  }

  private extractActorSnapshot(data: unknown): {
    id: string;
    name: string;
    email: string;
    role: string;
  } {
    const payload = (data ?? {}) as Record<string, unknown>;
    const actor = payload.actor as
      | { id?: string; name?: string; email?: string; role?: string }
      | undefined;
    const updatedBy = typeof payload.updatedBy === 'string' ? payload.updatedBy : undefined;
    const createdBy = typeof payload.createdBy === 'string' ? payload.createdBy : undefined;
    const userId = typeof payload.userId === 'string' ? payload.userId : undefined;

    if (actor?.id) {
      return {
        id: actor.id,
        name: actor.name ?? 'Unknown Actor',
        email: actor.email ?? 'unknown@verichron.local',
        role: actor.role ?? 'ORG_USER',
      };
    }

    const fallbackId = updatedBy || createdBy || userId;
    if (fallbackId) {
      return {
        id: fallbackId,
        name: 'System Actor',
        email: 'system@verichron.local',
        role: 'SYSTEM',
      };
    }

    return {
      id: SYSTEM_ACTOR_ID,
      name: 'System Event',
      email: 'system@verichron.local',
      role: 'SYSTEM',
    };
  }

  private async recordAuditEvent(params: {
    envelope: EventEnvelope<any>;
    organizationId: string;
    action: string;
    targetType: string;
    targetId: string;
    actorSource: unknown;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
    occurredAt?: string;
  }): Promise<void> {
    const {
      envelope,
      organizationId,
      action,
      targetType,
      targetId,
      actorSource,
      changes,
      metadata,
      occurredAt,
    } = params;

    const createdAt = occurredAt ? new Date(occurredAt) : new Date(envelope.timestamp);
    await this.auditLogWriterService.writeAuditLog({
      organizationId,
      eventId: envelope.eventId,
      actorSnapshot: this.extractActorSnapshot(actorSource),
      action,
      targetType,
      targetId,
      changes,
      metadata: {
        ...metadata,
        eventType: envelope.eventType,
        eventSource: envelope.eventSource,
        correlationId: envelope.correlationId ?? null,
      },
      createdAt,
    });
    this.logger.log(`Audit Log recorded: ${action} (${targetType}:${targetId})`);
  }
}
