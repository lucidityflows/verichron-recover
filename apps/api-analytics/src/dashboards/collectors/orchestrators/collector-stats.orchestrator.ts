import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_SOURCES, EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { OrchestrationEventEnvelope } from '@verichron/events';
import type { EventOrchestratorConfig } from '@verichron/event-orchestrator';
import { BaseOrchestrator } from '@verichron/event-orchestrator';
import { AnalyticsCollectorStatsRequestedDto, AnalyticsCollectorStatsCompletedDto } from '../../../events/event-dto/analytics';
import { CacheService } from '../../../core/cache';
import { CircuitBreakerService } from '../../../core/circuit-breaker';
import { CollectorStatsResponseDto } from '../dto';

/**
 * Collector Stats Analytics Orchestrator (api-analytics)
 *
 * Individual collector performance metrics.
 *
 * Cache TTL: 30 seconds (real-time performance tracking)
 */
@Injectable()
export class CollectorStatsOrchestrator extends BaseOrchestrator<
  AnalyticsCollectorStatsRequestedDto,
  AnalyticsCollectorStatsCompletedDto
> {
  protected readonly logger = new Logger(CollectorStatsOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsCollectorStatsRequestedDto;
  protected readonly responseDtoClass = AnalyticsCollectorStatsCompletedDto;
  protected readonly serviceName = EVENT_SOURCES.ANALYTICS;
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ANALYTICS';

  private readonly CACHE_TTL = 30; // 30 seconds

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
    subscriptionName: 'api-analytics.collector-stats-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_COLLECTOR_STATS_REQUESTED,
    dto: AnalyticsCollectorStatsRequestedDto,
  })
  async handleCollectorStatsRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsCollectorStatsRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_COLLECTOR_STATS_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsCollectorStatsRequestedDto,
  ): Promise<AnalyticsCollectorStatsCompletedDto> {
    const { organizationId, collectorUserId, correlationId, periodStart, periodEnd } = payload;

    const cacheKey = this.cacheService.buildKey('analytics:collector_stats', {
      organizationId,
      collectorUserId,
      periodStart,
      periodEnd,
    });

    const cached = await this.cacheService.get<CollectorStatsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for collector stats (collector: ${collectorUserId})`);
      return { organizationId, collectorUserId, correlationId, periodStart, periodEnd, stats: cached };
    }

    this.logger.debug(`Cache MISS for collector stats (collector: ${collectorUserId})`);

    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];
    const communicationsServiceUrl = this.config.serviceEndpoints['api-communications'];

    if (!transactionServiceUrl) {
      throw new Error('api-transactions endpoint not configured');
    }

    // Interfaces for upstream responses (locally defined for type safety)
    interface UpstreamTransactionMetrics {
      totalCollected: number;
      successfulPaymentCount: number;
      uniquePayingAccounts: number;
      paymentPlansCreated: number;
      totalCollectedToday: number;
    }

    interface UpstreamCommunicationMetrics {
      totalCalls: number;
      totalEmails: number;
      totalSms: number;
      uniqueAccountsContacted: number;
      emailResponseRate: number;
      totalCallsToday: number;
    }

    // Default empty stats
    const emptyTransStats: UpstreamTransactionMetrics = {
      totalCollected: 0,
      successfulPaymentCount: 0,
      uniquePayingAccounts: 0,
      paymentPlansCreated: 0,
      totalCollectedToday: 0,
    };

    const emptyCommsStats: UpstreamCommunicationMetrics = {
      totalCalls: 0,
      totalEmails: 0,
      totalSms: 0,
      uniqueAccountsContacted: 0,
      emailResponseRate: 0,
      totalCallsToday: 0,
    };

    // Calculate previous period for trend analysis
    const currentStart = new Date(periodStart);
    const currentEnd = new Date(periodEnd);
    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    // Fetch all required data in parallel
    const [collectorPayments, collectorComms, previousCollectorComms] = await Promise.all([
      // 1. Current Period Transactions
      this.circuitBreaker.execute('api-transactions', () =>
        this.fetchInternal<UpstreamTransactionMetrics>(
          transactionServiceUrl,
          `/internal/transactions/analytics/collectors/${collectorUserId}/dashboard-metrics`,
          'GET',
          null,
          { organizationId, periodStart, periodEnd },
        ),
      ).catch((err) => {
        this.logger.warn(`Failed to fetch transaction stats: ${err.message}`);
        return emptyTransStats;
      }),

      // 2. Current Period Communications
      communicationsServiceUrl
        ? this.circuitBreaker.execute('api-communications', () =>
            this.fetchInternal<UpstreamCommunicationMetrics>(
              communicationsServiceUrl,
              `/internal/communications/analytics/collectors/${collectorUserId}/dashboard-metrics`,
            ),
          ).catch((err) => {
            this.logger.warn(`Failed to fetch communications stats: ${err.message}`);
            return emptyCommsStats;
          })
        : Promise.resolve(emptyCommsStats),

      // 3. Previous Period Communications (for Trend)
      communicationsServiceUrl
        ? this.circuitBreaker.execute('api-communications', () =>
            this.fetchInternal<UpstreamCommunicationMetrics>(
              communicationsServiceUrl,
              `/internal/communications/analytics/collectors/${collectorUserId}/dashboard-metrics`,
              'GET',
              null,
              { 
                organizationId, 
                periodStart: previousStart.toISOString(), 
                periodEnd: previousEnd.toISOString() 
              },
            ),
          ).catch(() => emptyCommsStats) // Silent fail for trend
        : Promise.resolve(emptyCommsStats),
    ]);

    // Calculate Trends
    const currentCalls = collectorComms.totalCalls || 0;
    const previousCalls = previousCollectorComms.totalCalls || 0;
    
    // Calculate percentage change: ((current - previous) / previous) * 100
    // If previous is 0, we can't calculate a percentage growth, so we default to 0 (or 100 if current > 0?) 
    // Standard practice for 'trend' from 0 is usually 0 or undefined, keeping 0 for safety.
    let callsTrend = 0;
    if (previousCalls > 0) {
      callsTrend = ((currentCalls - previousCalls) / previousCalls) * 100;
    }

    const stats: CollectorStatsResponseDto = {
      // Communications
      callsMade: collectorComms.totalCalls || 0,
      emailsSent: collectorComms.totalEmails || 0,
      smsSent: collectorComms.totalSms || 0,
      accountsContacted: collectorComms.uniqueAccountsContacted || 0,
      emailResponseRate: collectorComms.emailResponseRate || 0,
      
      // Transactions
      collectedToday: collectorPayments.totalCollectedToday || 0,
      totalCollected: collectorPayments.totalCollected || 0,
      successfulPayments: collectorPayments.successfulPaymentCount || 0,
      paymentPlansCreated: collectorPayments.paymentPlansCreated || 0,
      uniquePayingAccounts: collectorPayments.uniquePayingAccounts || 0,
      
      // Derived / Computed
      totalActions: (collectorComms.totalCalls || 0) + (collectorComms.totalEmails || 0) + (collectorComms.totalSms || 0),
      callsTrend: Number(callsTrend.toFixed(1)),
      
      // Missing Upstream Data
      // Note: api-communications currently only tracks CALL, EMAIL, SMS. 
      // 'NOTE' actions are not aggregated, so this will always be 0 until upstream support is added.
      notesAdded: 0,
    };

    // Cache result
    await this.cacheService.set(cacheKey, stats, this.CACHE_TTL);

    return { organizationId, collectorUserId, correlationId, periodStart, periodEnd, stats };
  }
}
