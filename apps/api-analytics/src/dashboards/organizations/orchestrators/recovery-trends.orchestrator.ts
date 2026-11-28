import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_SOURCES, EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { OrchestrationEventEnvelope } from '@verichron/events';
import { TrendGranularity, AnalyticsGroupBy } from '@verichron/enums';
import {
  AnalyticsRecoveryTrendsRequestedDto,
  AnalyticsRecoveryTrendsCompletedDto,
} from '../../../events/event-dto';
import type { EventOrchestratorConfig } from '@verichron/event-orchestrator';
import { BaseOrchestrator, AnalyticsAggregationUtil } from '@verichron/event-orchestrator';
import { CacheService } from '../../../core/cache';
import { CircuitBreakerService } from '../../../core/circuit-breaker';
import { RecoveryTrendsResponseDto } from '../dto';

/**
 * Recovery Trends Analytics Orchestrator (api-analytics)
 *
 * Time-series analysis of debt recovery performance.
 * Shows trends in collections, recovery rates, and portfolio health.
 *
 * Cache TTL: 15 minutes (historical data, slow-changing)
 */
@Injectable()
export class RecoveryTrendsOrchestrator extends BaseOrchestrator<
  AnalyticsRecoveryTrendsRequestedDto,
  AnalyticsRecoveryTrendsCompletedDto
> {
  protected readonly logger = new Logger(RecoveryTrendsOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsRecoveryTrendsRequestedDto;
  protected readonly responseDtoClass = AnalyticsRecoveryTrendsCompletedDto;
  protected readonly serviceName = EVENT_SOURCES.ANALYTICS;
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ANALYTICS';

  private readonly CACHE_TTL = 900; // 15 minutes

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
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    subscriptionName: 'api-analytics.recovery-trends-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_RECOVERY_TRENDS_REQUESTED,
    dto: AnalyticsRecoveryTrendsRequestedDto,
  })
  async handleRecoveryTrendsRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsRecoveryTrendsRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_RECOVERY_TRENDS_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsRecoveryTrendsRequestedDto,
  ): Promise<AnalyticsRecoveryTrendsCompletedDto> {
    const { organizationId, correlationId, query } = payload;

    // Check cache
    const cacheKey = this.cacheService.buildKey('analytics:recovery_trends', {
      organizationId,
      ...query,
    });

    const cached = await this.cacheService.get<RecoveryTrendsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for recovery trends (org: ${organizationId})`);
      return { organizationId, correlationId, trends: cached };
    }

    this.logger.debug(`Cache MISS for recovery trends (org: ${organizationId})`);

    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];

    if (!debtServiceUrl || !transactionServiceUrl) {
      throw new Error('Required service endpoints are not configured');
    }

    // Build query params
    const queryParams = AnalyticsAggregationUtil.buildQueryParams(query);
    const params = Object.fromEntries(new URLSearchParams(queryParams).entries());

    // Fetch with circuit breaker
    const [transactionData, debtData] = await Promise.all([
      this.circuitBreaker.execute('api-transactions', () =>
        this.fetchInternal(
          transactionServiceUrl,
          `/internal/transactions/analytics/recovery-trends/${organizationId}`,
          'GET',
          null,
          params,
        ),
      ),
      this.circuitBreaker.execute('api-debts', () =>
        this.fetchInternal(
          debtServiceUrl,
          `/internal/debts/analytics/recovery-trends/${organizationId}`,
          'GET',
          null,
          params,
        ),
      ),
    ]);

    const aggregatedTrends = this.aggregateTrends(transactionData, debtData, organizationId, query);

    // Cache result
    await this.cacheService.set(cacheKey, aggregatedTrends, this.CACHE_TTL);

    return { organizationId, correlationId, trends: aggregatedTrends };
  }

  private aggregateTrends(
    transactionData: any,
    debtData: any,
    organizationId: string,
    query: any,
  ): RecoveryTrendsResponseDto {
    const payments = transactionData.payments || [];
    const debts = debtData.debtsOverTime || [];

    const isGrouped = query.groupBy && query.groupBy !== AnalyticsGroupBy.NONE;

    if (isGrouped) {
      const trendsByGroup = AnalyticsAggregationUtil.aggregateGroupedTrends(payments, debts);
      const { totalCollected, avgRecoveryRate } =
        AnalyticsAggregationUtil.calculateGroupedOverallMetrics(trendsByGroup);

      return {
        orgId: organizationId,
        startDate:
          query.startDate ||
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: query.endDate || new Date().toISOString().split('T')[0],
        granularity: query.granularity || TrendGranularity.MONTHLY,
        groupBy: query.groupBy,
        trendsByGroup,
        totalCollected,
        avgRecoveryRate,
        generatedAt: new Date().toISOString(),
      };
    } else {
      const trends = AnalyticsAggregationUtil.aggregateSingleSeriesTrends(payments, debts);
      const { totalCollected, avgRecoveryRate } =
        AnalyticsAggregationUtil.calculateOverallMetrics(trends);

      return {
        orgId: organizationId,
        startDate:
          query.startDate ||
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: query.endDate || new Date().toISOString().split('T')[0],
        granularity: query.granularity || TrendGranularity.MONTHLY,
        trends,
        totalCollected,
        avgRecoveryRate,
        generatedAt: new Date().toISOString(),
      };
    }
  }
}
