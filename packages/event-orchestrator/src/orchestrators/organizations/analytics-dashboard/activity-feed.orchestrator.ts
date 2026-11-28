import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  OrchestrationEventEnvelope,
} from '@verichron/events';
import { IActivityFeedItem } from '@verichron/contracts';
import { ActivityFeedType, ActivitySeverity } from '@verichron/enums';
import {
  AnalyticsActivityFeedRequestedDto,
  AnalyticsActivityFeedCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Activity Feed Orchestrator
 * ========================================================================
 *
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class ActivityFeedOrchestrator extends BaseOrchestrator<
  AnalyticsActivityFeedRequestedDto,
  AnalyticsActivityFeedCompletedDto
> {
  protected readonly logger = new Logger(ActivityFeedOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsActivityFeedRequestedDto;
  protected readonly responseDtoClass = AnalyticsActivityFeedCompletedDto;
  protected readonly serviceName = this.config.serviceName;
  protected readonly serviceKeyEnvVar: string;

  constructor(
    @Inject('EVENT_ORCHESTRATOR_CONFIG')
    config: EventOrchestratorConfig,
    httpService: HttpService,
    eventPublisher: EventPublisher,
  ) {
    super(config, httpService, eventPublisher);
    this.serviceKeyEnvVar = `SERVICE_KEY_${this.config.serviceName.replace('api-', '').toUpperCase()}`;
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    subscriptionName: 'event-orchestrator.analytics.activity-feed-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_ACTIVITY_FEED_REQUESTED,
    dto: AnalyticsActivityFeedRequestedDto,
  })
  async handleActivityFeedRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsActivityFeedRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_ACTIVITY_FEED_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsActivityFeedRequestedDto,
  ): Promise<AnalyticsActivityFeedCompletedDto> {
    const { organizationId, correlationId, pageSize = 20 } = payload;
    
    const transactionsUrl = this.config.serviceEndpoints['api-transactions'];
    const communicationsUrl = this.config.serviceEndpoints['api-communications'];
    const collectorsUrl = this.config.serviceEndpoints['api-collectors'];
    const usersUrl = this.config.serviceEndpoints['api-users'];

    if (!transactionsUrl || !communicationsUrl || !collectorsUrl || !usersUrl) {
      throw new Error('Required service endpoints are not configured');
    }

    // 1. Fetch raw data from multiple sources
    const [transactions, communications, actions] = await Promise.all([
      this.fetchInternal(transactionsUrl, `/internal/transactions/analytics/recent/${organizationId}`, 'GET', null, { pageSize }),
      this.fetchInternal(communicationsUrl, `/internal/communications/analytics/recent/${organizationId}`, 'GET', null, { pageSize }),
      this.fetchInternal(collectorsUrl, `/internal/workstation/recent-actions/${organizationId}`, 'GET', null, { pageSize }),
    ]);

    // 2. Get unique User IDs from all sources to fetch names
    const userIds = new Set<string>();
    transactions.forEach((t: any) => { if (t.collectorUserId) userIds.add(t.collectorUserId); });
    communications.forEach((c: any) => { if (c.collectorUserId) userIds.add(c.collectorUserId); });
    actions.forEach((a: any) => { if (a.collectorUserId) userIds.add(a.collectorUserId); });

    const userSummaries = userIds.size > 0
      ? await this.fetchInternal(usersUrl, '/internal/users/summaries', 'POST', { userIds: Array.from(userIds) })
      : [];

    // 3. Map and Normalize into unified Activity Items
    const feedItems: IActivityFeedItem[] = [
      ...transactions.map((t: any) => this.mapTransaction(t, userSummaries)),
      ...communications.map((c: any) => this.mapCommunication(c, userSummaries)),
      ...actions.map((a: any) => this.mapAction(a, userSummaries)),
    ];

    // 4. Sort by timestamp DESC and limit to pageSize
    const sortedActivities = feedItems
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, pageSize);

    return {
      organizationId,
      correlationId,
      activities: { organizationId, activities: sortedActivities }
    };
  }

  private mapTransaction(t: any, users: any[]): IActivityFeedItem {
    const user = users.find(u => u.id === t.collectorUserId);
    const userName = user ? `${user.firstName} ${user.lastName}` : 'System';
    const amountStr = Number(t.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    return {
      id: t.id,
      type: ActivityFeedType.PAYMENT,
      severity: ActivitySeverity.INFO,
      summary: `${userName} collected ${amountStr}`,
      timestamp: t.createdAt,
      metadata: {
        userId: t.collectorUserId,
        userName,
        amount: Number(t.amount),
        extra: { debtId: t.debtId }
      }
    };
  }

  private mapCommunication(c: any, users: any[]): IActivityFeedItem {
    const user = users.find(u => u.id === c.collectorUserId);
    const userName = user ? `${user.firstName} ${user.lastName}` : 'System';

    return {
      id: c._id,
      type: ActivityFeedType.OUTREACH,
      severity: ActivitySeverity.INFO,
      summary: `${userName} sent ${c.type.toLowerCase()} to debtor`,
      timestamp: c.sentAt,
      metadata: {
        userId: c.collectorUserId,
        userName,
        debtorId: c.debtorId,
        extra: { commType: c.type }
      }
    };
  }

  private mapAction(a: any, users: any[]): IActivityFeedItem {
    const user = users.find(u => u.id === a.collectorUserId);
    const userName = user ? `${user.firstName} ${user.lastName}` : 'System';

    return {
      id: a.id,
      type: ActivityFeedType.NOTE,
      severity: a.actionType === 'DISPUTE' ? ActivitySeverity.HIGH : ActivitySeverity.INFO,
      summary: `${userName} logged ${a.actionType.toLowerCase()}: ${a.outcome}`,
      timestamp: a.actionDate,
      metadata: {
        userId: a.collectorUserId,
        userName,
        debtorId: a.debtorProfileId,
        extra: { actionType: a.actionType }
      }
    };
  }
}
