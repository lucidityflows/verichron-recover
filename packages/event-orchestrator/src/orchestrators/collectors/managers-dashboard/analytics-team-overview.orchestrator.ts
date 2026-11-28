import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  OrchestrationEventEnvelope,
} from '@verichron/events';
import { ITeamOverview, ITeamOverviewCollector } from '@verichron/contracts';
import { CollectorAvailabilityStatus, TrendGranularity } from '@verichron/enums';
import {
  AnalyticsTeamOverviewRequestedDto,
  AnalyticsTeamOverviewCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Team Overview Analytics Orchestrator
 * ========================================================================
 *
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class AnalyticsTeamOverviewOrchestrator extends BaseOrchestrator<
  AnalyticsTeamOverviewRequestedDto,
  AnalyticsTeamOverviewCompletedDto
> {
  protected readonly logger = new Logger(AnalyticsTeamOverviewOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsTeamOverviewRequestedDto;
  protected readonly responseDtoClass = AnalyticsTeamOverviewCompletedDto;
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
    topicName: EVENT_TOPICS.COLLECTORS,
    subscriptionName: 'event-orchestrator.analytics.team-overview-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_TEAM_OVERVIEW_REQUESTED,
    dto: AnalyticsTeamOverviewRequestedDto,
  })
  async handleTeamOverviewRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsTeamOverviewRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_TEAM_OVERVIEW_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsTeamOverviewRequestedDto,
  ): Promise<AnalyticsTeamOverviewCompletedDto> {
    const { organizationId, teamId, correlationId } = payload;
    
    const usersUrl = this.config.serviceEndpoints['api-users'];
    const orgsUrl = this.config.serviceEndpoints['api-organizations'];
    const collectorsUrl = this.config.serviceEndpoints['api-collectors'];
    const transactionsUrl = this.config.serviceEndpoints['api-transactions'];
    const communicationsUrl = this.config.serviceEndpoints['api-communications'];
    const debtsUrl = this.config.serviceEndpoints['api-debts'];

    if (!usersUrl || !orgsUrl || !collectorsUrl || !transactionsUrl || !communicationsUrl || !debtsUrl) {
      throw new Error('Required service endpoints are not configured');
    }

    let collectorIds: string[];
    if (teamId) {
      const members = await this.fetchInternal(orgsUrl, `/internal/teams/${organizationId}/${teamId}/members`);
      collectorIds = members.map((m: any) => m.userId);
    } else {
      const response = await this.fetchInternal(orgsUrl, `/internal/teams/${organizationId}/collectors`);
      collectorIds = response.collectorIds;
    }

    if (collectorIds.length === 0) {
      return { organizationId, teamId, correlationId, overview: this.emptyOverview(organizationId, teamId) };
    }

    const { periodStart, periodEnd } = this.getPeriodDates(TrendGranularity.DAILY);

    const [userSummaries, collectorProfiles, workloadData, commStats, paymentStats, collectorAssignments] = await Promise.all([
      this.fetchInternal(usersUrl, '/internal/users/summaries', 'POST', { userIds: collectorIds }),
      this.fetchInternal(collectorsUrl, '/internal/collectors/profiles', 'POST', { organizationId, collectorIds }),
      this.fetchInternal(collectorsUrl, '/internal/collectors/workload', 'POST', { organizationId, collectorIds }),
      this.fetchInternal(communicationsUrl, `/internal/communications/analytics/organization-stats/${organizationId}`, 'GET', null, { periodStart, periodEnd }),
      this.fetchInternal(transactionsUrl, `/internal/transactions/analytics/organization-stats/${organizationId}`, 'GET', null, { periodStart, periodEnd }),
      this.fetchInternal(collectorsUrl, '/internal/collectors/assignments', 'POST', { organizationId, collectorIds }),
    ]);

    const allDebtorIds = [...new Set(Object.values(collectorAssignments.assignments).flat() as string[])];
    
    const portfolioDistribution: Record<string, any[]> = {};
    if (allDebtorIds.length > 0) {
      try {
        const distributionResponse = await this.fetchInternal(debtsUrl, `/internal/debts/analytics/debtor-portfolios/${organizationId}`, 'POST', { debtorProfileIds: allDebtorIds });
        
        Object.entries(collectorAssignments.assignments).forEach(([collectorId, debtorIds]) => {
          const portfolioMap = new Map<string, any>();
          (debtorIds as string[]).forEach(debtorId => {
            const debtorPortfolios = distributionResponse[debtorId] || [];
            debtorPortfolios.forEach((dp: any) => {
              const existing = portfolioMap.get(dp.portfolioId);
              if (existing) {
                existing.accountCount += dp.accountCount;
                existing.totalBalance += dp.totalBalance;
              } else {
                portfolioMap.set(dp.portfolioId, { ...dp });
              }
            });
          });
          portfolioDistribution[collectorId] = Array.from(portfolioMap.values());
        });
      } catch (error) {
        this.logger.error(`Failed to fetch debtor-portfolio mapping`, error);
      }
    }

    const overview = this.buildOverview(
      organizationId,
      teamId,
      collectorIds,
      userSummaries,
      collectorProfiles,
      workloadData.workload,
      commStats.collectorStats || [],
      paymentStats.collectorStats || [],
      portfolioDistribution
    );

    return { organizationId, teamId, correlationId, overview };
  }

  private buildOverview(
    organizationId: string,
    teamId: string | undefined,
    collectorIds: string[],
    users: any[],
    profiles: any[],
    workload: Record<string, number>,
    commStats: any[],
    paymentStats: any[],
    portfolioDistribution: Record<string, any[]>
  ): ITeamOverview {
    const collectors: ITeamOverviewCollector[] = collectorIds.map(userId => {
      const user = users.find(u => u.id === userId) || { firstName: 'Unknown', lastName: 'User', email: '' };
      const profile = profiles.find(p => p.userId === userId) || {};
      const commStat = commStats.find(s => s.collectorUserId === userId) || {};
      const paymentStat = paymentStats.find(s => s.collectorUserId === userId) || {};

      const activeWorkload = workload[userId] || 0;
      const capacity = profile.maxConcurrentAccounts || 100;

      return {
        userId,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        status: profile.availabilityStatus || CollectorAvailabilityStatus.OFFLINE,
        lastActivity: new Date().toISOString(),
        workload: {
          active: activeWorkload,
          capacity,
          percentage: Math.round((activeWorkload / capacity) * 100),
        },
        performance: {
          todayCollected: paymentStat.totalCollected || 0,
          todayContacts: commStat.uniqueAccountsContacted || 0,
          goalProgress: 0, 
        },
        portfolios: portfolioDistribution[userId] || [],
      };
    });

    return {
      organizationId,
      teamId,
      collectors,
      teamTotals: {
        totalCollected: collectors.reduce((sum, c) => sum + c.performance.todayCollected, 0),
        totalContacts: collectors.reduce((sum, c) => sum + c.performance.todayContacts, 0),
        averageGoalProgress: 0,
        activeCollectors: collectors.filter(c => c.status === CollectorAvailabilityStatus.AVAILABLE).length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private emptyOverview(organizationId: string, teamId?: string): ITeamOverview {
    return {
      organizationId,
      teamId,
      collectors: [],
      teamTotals: { totalCollected: 0, totalContacts: 0, averageGoalProgress: 0, activeCollectors: 0 },
      timestamp: new Date().toISOString(),
    };
  }

  private getPeriodDates(granularity: TrendGranularity): { periodStart: string; periodEnd: string } {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return {
      periodStart: startOfDay.toISOString(),
      periodEnd: endOfDay.toISOString(),
    };
  }
}
