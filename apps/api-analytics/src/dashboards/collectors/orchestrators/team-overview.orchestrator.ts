import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_SOURCES, EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { OrchestrationEventEnvelope } from '@verichron/events';
import type { EventOrchestratorConfig } from '@verichron/event-orchestrator';
import { BaseOrchestrator } from '@verichron/event-orchestrator';
import { AnalyticsTeamOverviewRequestedDto, AnalyticsTeamOverviewCompletedDto } from '../../../events/event-dto/analytics';
import { CacheService } from '../../../core/cache';
import { CircuitBreakerService } from '../../../core/circuit-breaker';
import { TeamOverviewResponseDto } from '../dto';

/**
 * Team Overview Analytics Orchestrator (api-analytics)
 *
 * Team performance dashboard for managers.
 * Shows all collectors' workload and performance metrics.
 *
 * Cache TTL: 1 minute (team metrics update frequently)
 */
@Injectable()
export class TeamOverviewOrchestrator extends BaseOrchestrator<
  AnalyticsTeamOverviewRequestedDto,
  AnalyticsTeamOverviewCompletedDto
> {
  protected readonly logger = new Logger(TeamOverviewOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsTeamOverviewRequestedDto;
  protected readonly responseDtoClass = AnalyticsTeamOverviewCompletedDto;
  protected readonly serviceName = EVENT_SOURCES.ANALYTICS;
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ANALYTICS';

  private readonly CACHE_TTL = 60; // 1 minute

  constructor(
    @Inject('EVENT_ORCHESTRATOR_CONFIG')
    config: EventOrchestratorConfig,
    httpService: HttpService,
    eventPublisher: EventPublisher,
    private readonly cacheService: CacheService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    super(config, httpService, eventPublisher);
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    subscriptionName: 'api-analytics.team-overview-requested.sub',
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

    const cacheKey = this.cacheService.buildKey('analytics:team_overview', {
      organizationId,
      teamId: teamId || 'all',
    });

    const cached = await this.cacheService.get<TeamOverviewResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for team overview (org: ${organizationId})`);
      return { organizationId, correlationId, overview: cached };
    }

    this.logger.debug(`Cache MISS for team overview (org: ${organizationId})`);

    const organizationsServiceUrl = this.config.serviceEndpoints['api-organizations'];
    const collectorsServiceUrl = this.config.serviceEndpoints['api-collectors'];
    const transactionsServiceUrl = this.config.serviceEndpoints['api-transactions'];
    const communicationsServiceUrl = this.config.serviceEndpoints['api-communications'];

    if (!organizationsServiceUrl || !collectorsServiceUrl) {
      throw new Error('Required service endpoints are not configured');
    }

    // Fetch team members first
    const teamMembers = teamId
      ? await this.circuitBreaker.execute('api-organizations', () =>
          this.fetchInternal(
            organizationsServiceUrl,
            `/internal/organizations/teams/${organizationId}/${teamId}/members`,
          ),
        )
      : await this.circuitBreaker.execute('api-collectors', () =>
          this.fetchInternal(collectorsServiceUrl, `/internal/collectors/profiles/${organizationId}`),
        );

    const collectorIds = teamMembers.collectors?.map((c: any) => c.userId) || [];

    if (collectorIds.length === 0) {
      const emptyOverview: TeamOverviewResponseDto = {
        organizationId,
        teamId,
        collectors: [],
        teamTotals: {
          totalCollected: 0,
          totalContacts: 0,
          averageGoalProgress: 0,
          activeCollectors: 0,
        },
        timestamp: new Date().toISOString(),
      };
      return { organizationId, correlationId, overview: emptyOverview };
    }

    // Fetch workload, payments, and communications for all collectors
    const [workload, payments, communications] = await Promise.all([
      this.circuitBreaker.execute('api-collectors', () =>
        this.fetchInternal(
          collectorsServiceUrl,
          `/internal/collectors/profiles/workload`,
          'POST',
          { collectorIds, organizationId },
        ),
      ),
      transactionsServiceUrl
        ? this.circuitBreaker
            .execute('api-transactions', () =>
              this.fetchInternal(
                transactionsServiceUrl,
                `/internal/transactions/analytics/team-overview/${organizationId}`,
                'POST',
                { collectorIds },
              ),
            )
            .catch(() => ({ collectors: [] }))
        : Promise.resolve({ collectors: [] }),
      communicationsServiceUrl
        ? this.circuitBreaker
            .execute('api-communications', () =>
              this.fetchInternal(
                communicationsServiceUrl,
                `/internal/communications/analytics/team-overview/${organizationId}`,
                'POST',
                { collectorIds },
              ),
            )
            .catch(() => ({ collectors: [] }))
        : Promise.resolve({ collectors: [] }),
    ]);

    // Merge collector data
    const collectors = collectorIds.map((userId: string) => {
      const workloadData = workload.collectors?.find((c: any) => c.userId === userId) || {};
      const paymentData = payments.collectors?.find((c: any) => c.collectorUserId === userId) || {};
      const commData = communications.collectors?.find((c: any) => c.collectorUserId === userId) || {};

      return {
        userId,
        ...workloadData,
        ...paymentData,
        ...commData,
      };
    });

    // Calculate team totals
    const totalCollected = collectors
      .reduce((sum: number, c: any) => sum + parseFloat(c.totalCollected || '0'), 0);
    const totalGoalProgress = collectors
      .reduce((sum: number, c: any) => sum + (c.performance?.goalProgress || 0), 0);
    const activeCollectors = collectors.filter((c: any) => c.status === 'ACTIVE').length;

    const teamTotals = {
      totalCollected,
      totalContacts: collectors.reduce((sum: number, c: any) => sum + (c.totalContacts || 0), 0),
      averageGoalProgress: collectors.length > 0 ? totalGoalProgress / collectors.length : 0,
      activeCollectors,
    };

    const overview: TeamOverviewResponseDto = {
      organizationId,
      teamId,
      collectors,
      teamTotals,
      timestamp: new Date().toISOString(),
    };

    // Cache result
    await this.cacheService.set(cacheKey, overview, this.CACHE_TTL);

    return { organizationId, correlationId, overview };
  }
}
