import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_SOURCES, EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import { TrendGranularity } from '@verichron/enums';
import type { OrchestrationEventEnvelope } from '@verichron/events';
import type { EventOrchestratorConfig } from '@verichron/event-orchestrator';
import { BaseOrchestrator } from '@verichron/event-orchestrator';
import { AnalyticsCollectorLeaderboardRequestedDto, AnalyticsCollectorLeaderboardCompletedDto } from '../../../events/event-dto/analytics';
import { CacheService } from '../../../core/cache';
import { CircuitBreakerService } from '../../../core/circuit-breaker';
import { CollectorLeaderboardResponseDto } from '../dto';

/**
 * Collector Leaderboard Analytics Orchestrator (api-analytics)
 *
 * Ranked collector performance for team competition.
 *
 * Cache TTL: 1 minute
 */
@Injectable()
export class CollectorLeaderboardOrchestrator extends BaseOrchestrator<
  AnalyticsCollectorLeaderboardRequestedDto,
  AnalyticsCollectorLeaderboardCompletedDto
> {
  protected readonly logger = new Logger(CollectorLeaderboardOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsCollectorLeaderboardRequestedDto;
  protected readonly responseDtoClass = AnalyticsCollectorLeaderboardCompletedDto;
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
    subscriptionName: 'api-analytics.collector-leaderboard-requested.sub',
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
    const { organizationId, correlationId, collectorUserId, period, pageSize } = payload;

    const cacheKey = this.cacheService.buildKey('analytics:collector_leaderboard', {
      organizationId,
      period,
      pageSize,
    });

    const cached = await this.cacheService.get<CollectorLeaderboardResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for collector leaderboard (org: ${organizationId})`);
      return { organizationId, correlationId, collectorUserId, period, pageSize, leaderboard: cached };
    }

    this.logger.debug(`Cache MISS for collector leaderboard (org: ${organizationId})`);

    const collectorsServiceUrl = this.config.serviceEndpoints['api-collectors'];
    const transactionsServiceUrl = this.config.serviceEndpoints['api-transactions'];
    const communicationsServiceUrl = this.config.serviceEndpoints['api-communications'];

    if (!collectorsServiceUrl || !transactionsServiceUrl) {
      throw new Error('Required service endpoints are not configured');
    }

    // Calculate dates from period enum
    const { periodStart, periodEnd } = this.calculatePeriod(period);

    // Fetch leaderboard data
    const queryParams = { period, pageSize };
    const [collectorsList, paymentStats, communicationStats] = await Promise.all([
      this.circuitBreaker.execute('api-collectors', () =>
        this.fetchInternal(
          collectorsServiceUrl,
          `/internal/collectors/profiles/${organizationId}`,
          'GET',
          null,
          queryParams,
        ),
      ),
      this.circuitBreaker.execute('api-transactions', () =>
        this.fetchInternal(
          transactionsServiceUrl,
          `/internal/transactions/analytics/organization-stats/${organizationId}`,
          'GET',
          null,
          { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() },
        ),
      ),
      communicationsServiceUrl
        ? this.circuitBreaker
            .execute('api-communications', () =>
              this.fetchInternal(
                communicationsServiceUrl,
                `/internal/communications/analytics/organization-stats/${organizationId}`,
                'GET',
                null,
                { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() },
              ),
            )
            .catch(() => ({ collectorStats: [] }))
        : Promise.resolve({ collectorStats: [] }),
    ]);

    const collectors = collectorsList.collectors || [];
    const payments = paymentStats.collectorStats || [];
    const communications = communicationStats.collectorStats || [];

    // Merge and rank
    const leaderboard = collectors
      .map((collector: any) => {
        const perf = payments.find((r: any) => r.collectorUserId === collector.userId) || {};
        const comms = communications.find((r: any) => r.collectorUserId === collector.userId) || {};
        return {
          ...collector,
          ...perf,
          ...comms,
        };
      })
      .sort((a: any, b: any) => parseFloat(b.totalCollected || '0') - parseFloat(a.totalCollected || '0'))
      .map((c: any, index: number) => ({ ...c, rank: index + 1 }));

    const result: CollectorLeaderboardResponseDto = {
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      entries: leaderboard,
      totalCollectors: collectors.length,
      currentUserRank: leaderboard.findIndex((e: any) => e.collectorId === collectorUserId) + 1,
    };

    // Cache result
    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

    return { organizationId, correlationId, collectorUserId, period, pageSize, leaderboard: result };
  }

  private calculatePeriod(granularity: TrendGranularity): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    const periodEnd = new Date(now);
    const periodStart = new Date(now);

    switch (granularity) {
      case TrendGranularity.DAILY:
        periodStart.setHours(0, 0, 0, 0);
        break;
      case TrendGranularity.WEEKLY:
        const day = periodStart.getDay();
        const diff = periodStart.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        periodStart.setDate(diff);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case TrendGranularity.MONTHLY:
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case TrendGranularity.QUARTERLY:
        const quarterMonth = Math.floor(periodStart.getMonth() / 3) * 3;
        periodStart.setMonth(quarterMonth, 1);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case TrendGranularity.YEARLY:
        periodStart.setMonth(0, 1);
        periodStart.setHours(0, 0, 0, 0);
        break;
      default:
        // Default to monthly if unknown
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
    }

    return { periodStart, periodEnd };
  }
}
