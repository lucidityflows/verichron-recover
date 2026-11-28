import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { EventEnvelope } from '@verichron/events';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class PubSubBridgeService extends AbstractBaseListener<any> {
  constructor(private readonly realtimeGateway: RealtimeGateway) {
    super();
  }

  // ==========================================================================
  // USERS & TEAMS
  // ==========================================================================

  @EventSubscription({
    topicName: EVENT_TOPICS.USERS,
    eventType: EVENT_TYPES.USERS_USER_STATUS_CHANGED,
    dto: Object as any,
  })
  async onMessageUserStatusChanged(data: any, envelope: EventEnvelope<any>) {
    const { organizationId, userId, status } = data;
    if (organizationId) {
      this.realtimeGateway.broadcastToOrg(organizationId, 'USER_STATUS_CHANGED', {
        userId,
        status,
      });
    }
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.TEAMS_MEMBER_ADDED,
    dto: Object as any,
  })
  async onMessageTeamMemberAdded(data: any, envelope: EventEnvelope<any>) {
    const { organizationId, teamId, userId } = data;
    this.realtimeGateway.broadcastToOrg(organizationId, 'TEAM_MEMBER_ADDED', {
      teamId,
      userId,
    });
  }

  // ==========================================================================
  // DEBTS & COLLECTIONS
  // ==========================================================================

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_STATUS_CHANGED,
    dto: Object as any,
  })
  async onMessageDebtStatusChanged(data: any, envelope: EventEnvelope<any>) {
    const { organizationId, debtId, status } = data;
    this.realtimeGateway.broadcastToOrg(organizationId, 'DEBT_STATUS_CHANGED', {
      debtId,
      status,
    });
  }

  // ==========================================================================
  // TRANSACTIONS
  // ==========================================================================

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_TRANSACTION_SUCCEEDED,
    dto: Object as any,
  })
  async onMessagePaymentSucceeded(data: any, envelope: EventEnvelope<any>) {
    const { organizationId, transactionId, amount, debtorId } = data;
    this.realtimeGateway.broadcastToOrg(organizationId, 'PAYMENT_RECEIVED', {
      transactionId,
      amount,
      debtorId,
    });
  }

  // ==========================================================================
  // COLLECTORS (WORK QUEUE)
  // ==========================================================================

  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    eventType: EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED,
    dto: Object as any,
  })
  async onMessageWorkItemAssigned(data: any, envelope: EventEnvelope<any>) {
    const { organizationId, itemId, collectorId, debtorId } = data;
    this.realtimeGateway.broadcastToOrg(organizationId, 'WORK_ITEM_ASSIGNED', {
      itemId,
      collectorId,
      debtorId,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    eventType: EVENT_TYPES.COLLECTORS_GOAL_PROGRESS_UPDATED,
    dto: Object as any,
  })
  async onMessageGoalProgressUpdated(data: any, envelope: EventEnvelope<any>) {
    const { organizationId, goalId, currentValue, progressPercentage, status } = data;
    this.realtimeGateway.broadcastToOrg(organizationId, 'GOAL_PROGRESS_UPDATED', {
      goalId,
      currentValue,
      progressPercentage,
      status,
    });
  }

  // ==========================================================================
  // EXCEPTIONS & ESCALATIONS
  // ==========================================================================

  @EventSubscription({
    topicName: EVENT_TOPICS.COMMUNICATIONS,
    eventType: EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_BLOCKED,
    dto: Object as any,
  })
  async onMessageComplianceBlocked(data: any, envelope: EventEnvelope<any>) {
    const { organizationId, debtorId, reason, timestamp } = data;
    this.realtimeGateway.broadcastToOrg(organizationId, 'COMPLIANCE_BLOCKED', {
      debtorId,
      reason,
      timestamp,
    });
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_SETTLEMENT_OFFER_CREATED,
    dto: Object as any,
  })
  async onMessageSettlementRequested(data: any, envelope: EventEnvelope<any>) {
    const { organizationId, debtId, amount, collectorId } = data;
    this.realtimeGateway.broadcastToOrg(organizationId, 'SETTLEMENT_REQUESTED', {
      debtId,
      amount,
      collectorId,
    });
  }
}
