import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  OrchestrationEventEnvelope,
  CollectorLeaderboard,
  LeaderboardEntry,
} from '@verichron/events';
import { TrendGranularity } from '@verichron/enums';
import {
  AnalyticsCollectorLeaderboardRequestedDto,
  AnalyticsCollectorLeaderboardCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Collector Leaderboard Analytics Orchestrator
 * ========================================================================
 *
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class AnalyticsCollectorLeaderboardOrchestrator extends BaseOrchestrator<
  AnalyticsCollectorLeaderboardRequestedDto,
  AnalyticsCollectorLeaderboardCompletedDto
> {
  protected readonly logger = new Logger(AnalyticsCollectorLeaderboardOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsCollectorLeaderboardRequestedDto;
  protected readonly responseDtoClass = AnalyticsCollectorLeaderboardCompletedDto;
  protected readonly serviceName = 'api-collectors';
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_COLLECTORS';

  constructor(
    @Inject('EVENT_ORCHESTRATOR_CONFIG')
    config: EventOrchestratorConfig,
    httpService: HttpService,
    eventPublisher: EventPublisher,
  ) {
    super(config, httpService, eventPublisher);
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    subscriptionName:
      'event-orchestrator.analytics.collector-leaderboard-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_COLLECTOR_LEADERBOARD_REQUESTED,
    dto: AnalyticsCollectorLeaderboardRequestedDto,
  })
  async handleCollectorLeaderboardRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsCollectorLeaderboardRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_COLLECTOR_LEADERBOARD_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsCollectorLeaderboardRequestedDto,
  ): Promise<AnalyticsCollectorLeaderboardCompletedDto> {
    const { organizationId, collectorUserId, period, pageSize, teamId, correlationId } = payload;
    
    let teamMemberIds: string[] | undefined;
    if (teamId) {
      teamMemberIds = await this.fetchTeamMembers(organizationId, teamId);
    }

    const { periodStart, periodEnd } = this.calculatePeriod(period);

    const communicationServiceUrl = this.config.serviceEndpoints['api-communications'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];

    if (!communicationServiceUrl || !transactionServiceUrl) {
      throw new Error('Required service endpoints are not configured.');
    }

    const [communicationStats, paymentStats] = await Promise.all([
      this.fetchOrganizationCommunicationStats(communicationServiceUrl, organizationId, periodStart, periodEnd),
      this.fetchOrganizationPaymentStats(transactionServiceUrl, organizationId, periodStart, periodEnd),
    ]);

    const leaderboard: CollectorLeaderboard = await this.buildLeaderboard(
      communicationStats,
      paymentStats,
      collectorUserId,
      period,
      periodStart,
      periodEnd,
      pageSize,
      teamMemberIds,
    );

    return {
      organizationId,
      collectorUserId,
      period,
      pageSize,
      correlationId,
      leaderboard,
    };
  }

  private calculatePeriod(granularity: TrendGranularity): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    let periodStart: Date;
    const periodEnd: Date = now;

    switch (granularity) {
      case TrendGranularity.DAILY:
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case TrendGranularity.WEEKLY:
        const dayOfWeek = now.getDay();
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case TrendGranularity.MONTHLY:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case TrendGranularity.QUARTERLY:
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case TrendGranularity.YEARLY:
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { periodStart, periodEnd };
  }

  private async fetchTeamMembers(organizationId: string, teamId: string): Promise<string[]> {
    const apiOrganizationsUrl = this.config.serviceEndpoints['api-organizations'];
    if (!apiOrganizationsUrl) throw new Error('api-organizations service endpoint not configured');

    try {
      const members = await this.fetchInternal(apiOrganizationsUrl, `/internal/teams/${organizationId}/${teamId}/members`);
      return members.map((member: any) => member.userId);
    } catch (error) {
      this.logger.error(`Failed to fetch team members for team ${teamId}`, error);
      return [];
    }
  }

  private async fetchOrganizationCommunicationStats(
    baseUrl: string,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<any> {
    return this.fetchInternal(
      baseUrl,
      `/internal/communications/analytics/organization-stats/${organizationId}`,
      'GET',
      null,
      { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() }
    );
  }

  private async fetchOrganizationPaymentStats(
    baseUrl: string,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<any> {
    return this.fetchInternal(
      baseUrl,
      `/internal/transactions/analytics/organization-stats/${organizationId}`,
      'GET',
      null,
      { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() }
    );
  }

  private async buildLeaderboard(
    communicationStats: any,
    paymentStats: any,
    currentCollectorUserId: string,
    period: TrendGranularity,
    periodStart: Date,
    periodEnd: Date,
    pageSize: number,
    teamMemberIds?: string[],
  ): Promise<CollectorLeaderboard> {
    const collectorMap = new Map<string, {
      totalCollected: number;
      totalContacts: number;
      successfulPayments: number;
      paymentPlansCreated: number;
    }>();

    const shouldIncludeCollector = (collectorId: string): boolean => {
      if (!teamMemberIds) return true;
      return teamMemberIds.includes(collectorId);
    };

    if (paymentStats.collectorStats) {
      paymentStats.collectorStats.forEach((stat: any) => {
        if (shouldIncludeCollector(stat.collectorUserId)) {
          collectorMap.set(stat.collectorUserId, {
            totalCollected: stat.totalCollected || 0,
            totalContacts: 0,
            successfulPayments: stat.successfulPaymentCount || 0,
            paymentPlansCreated: stat.paymentPlansCreated || 0,
          });
        }
      });
    }

    if (communicationStats.collectorStats) {
      communicationStats.collectorStats.forEach((stat: any) => {
        if (shouldIncludeCollector(stat.collectorUserId)) {
          const existing = collectorMap.get(stat.collectorUserId);
          if (existing) {
            existing.totalContacts = stat.uniqueAccountsContacted || 0;
          } else {
            collectorMap.set(stat.collectorUserId, {
              totalCollected: 0,
              totalContacts: stat.uniqueAccountsContacted || 0,
              successfulPayments: 0,
              paymentPlansCreated: 0,
            });
          }
        }
      });
    }

    const sortedCollectors = Array.from(collectorMap.entries())
      .map(([collectorId, stats]) => ({ collectorId, ...stats }))
      .sort((a, b) => b.totalCollected - a.totalCollected);

    const collectorIds = sortedCollectors.slice(0, pageSize).map((c) => c.collectorId);
    const collectorNames = await this.fetchCollectorNames(collectorIds);

    const entries: LeaderboardEntry[] = sortedCollectors
      .slice(0, pageSize)
      .map((collector, index) => ({
        collectorId: collector.collectorId,
        collectorName: collectorNames[collector.collectorId] || 'Unknown Collector',
        totalCollected: collector.totalCollected,
        rank: index + 1,
        isCurrentUser: collector.collectorId === currentCollectorUserId,
        accountsResolved: undefined,
        totalContacts: collector.totalContacts,
        successfulPayments: collector.successfulPayments,
        paymentPlansCreated: collector.paymentPlansCreated,
      }));

    const currentUserIndex = sortedCollectors.findIndex((c) => c.collectorId === currentCollectorUserId);
    const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : 0;

    return {
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      entries,
      totalCollectors: sortedCollectors.length,
      currentUserRank,
    };
  }

  private async fetchCollectorNames(collectorUserIds: string[]): Promise<Record<string, string>> {
    if (!collectorUserIds || collectorUserIds.length === 0) return {};
    const apiUsersUrl = this.config.serviceEndpoints['api-users'];
    if (!apiUsersUrl) return {};

    try {
      const userSummaries = await this.fetchInternal(apiUsersUrl, '/internal/users/summaries', 'POST', { userIds: collectorUserIds });
      const nameMap: Record<string, string> = {};
      userSummaries.forEach((user: any) => {
        nameMap[user.id] = `${user.firstName} ${user.lastName}`;
      });
      return nameMap;
    } catch (error) {
      this.logger.error(`Failed to fetch collector names`, error);
      return {};
    }
  }
}