import { Injectable } from '@nestjs/common';
import { PLATFORM_ORG_ID } from '@verichron/contracts';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { AuditLogWriterService } from '../../storage/services/audit-log-writer.service';
import {
  DebtCreatedDto,
  DebtUpdatedDto,
  DebtStatusChangedDto,
  TransactionSucceededDto,
  TransactionFailedDto,
  UserCreatedDto,
  UserStatusChangedDto,
} from '../event-dto';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class DomainEventsListener extends AbstractBaseListener<any> {
  constructor(
    private readonly auditLogWriterService: AuditLogWriterService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_CREATED,
    dto: DebtCreatedDto,
  })
  async onDebtCreated(
    data: DebtCreatedDto,
    envelope: EventEnvelope<DebtCreatedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'DEBT.CREATED',
      targetType: 'DEBT',
      targetId: data.debtId,
      actorSource: data,
      metadata: {
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        debtorProfileId: data.debtorProfileId,
        debtorIdentityId: data.debtorIdentityId ?? null,
      },
      occurredAt: data.createdAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_UPDATED,
    dto: DebtUpdatedDto,
  })
  async onDebtUpdated(
    data: DebtUpdatedDto,
    envelope: EventEnvelope<DebtUpdatedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'DEBT.UPDATED',
      targetType: 'DEBT',
      targetId: data.debtId,
      actorSource: data,
      changes: {
        interestAmount: { old: null, new: data.interestAmount ?? null },
        feesAmount: { old: null, new: data.feesAmount ?? null },
        notes: { old: null, new: data.notes ?? null },
        status: { old: null, new: data.status ?? null },
      },
      metadata: {
        portfolioId: data.portfolioId,
      },
      occurredAt: data.updatedAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_STATUS_CHANGED,
    dto: DebtStatusChangedDto,
  })
  async onDebtStatusChanged(
    data: DebtStatusChangedDto,
    envelope: EventEnvelope<DebtStatusChangedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'DEBT.STATUS_CHANGED',
      targetType: 'DEBT',
      targetId: data.debtId,
      actorSource: data,
      changes: {
        status: { old: data.oldStatus, new: data.newStatus },
      },
      metadata: {
        portfolioId: data.portfolioId,
        reason: data.reason ?? null,
      },
      occurredAt: data.updatedAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_TRANSACTION_SUCCEEDED,
    dto: TransactionSucceededDto,
  })
  async onTransactionSucceeded(
    data: TransactionSucceededDto,
    envelope: EventEnvelope<TransactionSucceededDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'TRANSACTION.SUCCEEDED',
      targetType: 'TRANSACTION',
      targetId: data.transactionId,
      actorSource: data,
      changes: {
        status: { old: 'PENDING', new: 'SUCCEEDED' },
      },
      metadata: {
        amount: data.amount,
        debtId: data.debtId,
        debtorId: data.debtorId,
        paymentPlanId: data.paymentPlanId,
        gatewayTransactionId: data.gatewayTransactionId,
      },
      occurredAt: data.succeededAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_TRANSACTION_FAILED,
    dto: TransactionFailedDto,
  })
  async onTransactionFailed(
    data: TransactionFailedDto,
    envelope: EventEnvelope<TransactionFailedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId,
      action: 'TRANSACTION.FAILED',
      targetType: 'TRANSACTION',
      targetId: data.transactionId,
      actorSource: data,
      changes: {
        status: { old: 'PENDING', new: 'FAILED' },
      },
      metadata: {
        amount: data.amount,
        debtId: data.debtId,
        debtorId: data.debtorId,
        paymentPlanId: data.paymentPlanId,
        failureReason: data.failureReason,
      },
      occurredAt: data.failedAt,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.USERS,
    eventType: EVENT_TYPES.USERS_USER_CREATED,
    dto: UserCreatedDto,
  })
  async onUserCreated(
    data: UserCreatedDto,
    envelope: EventEnvelope<UserCreatedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId ?? PLATFORM_ORG_ID,
      action: 'USER.CREATED',
      targetType: 'USER',
      targetId: data.userId,
      actorSource: data,
      metadata: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        roleId: data.roleId,
        invitationExpiresAt: data.invitationExpiresAt,
      },
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.USERS,
    eventType: EVENT_TYPES.USERS_USER_STATUS_CHANGED,
    dto: UserStatusChangedDto,
  })
  async onUserStatusChanged(
    data: UserStatusChangedDto,
    envelope: EventEnvelope<UserStatusChangedDto>,
  ): Promise<void> {
    await this.recordAuditEvent({
      envelope,
      organizationId: data.organizationId ?? PLATFORM_ORG_ID,
      action: 'USER.STATUS_CHANGED',
      targetType: 'USER',
      targetId: data.userId,
      actorSource: data,
      changes: {
        status: { old: data.oldStatus, new: data.newStatus },
      },
      metadata: {
        reason: data.reason ?? null,
      },
      occurredAt: data.statusChangedAt,
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
    const changedBy = typeof payload.changedBy === 'string' ? payload.changedBy : undefined;
    const userId = typeof payload.userId === 'string' ? payload.userId : undefined;

    if (actor?.id) {
      return {
        id: actor.id,
        name: actor.name ?? 'Unknown Actor',
        email: actor.email ?? 'unknown@verichron.local',
        role: actor.role ?? 'ORG_USER',
      };
    }

    const fallbackId = updatedBy || createdBy || changedBy || userId;
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
