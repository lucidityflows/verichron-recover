import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  OrchestrationEventEnvelope,
} from '@verichron/events';
import { IRecoveryTrendsResponse } from '@verichron/contracts';
import { TrendGranularity, AnalyticsGroupBy } from '@verichron/enums';
import {
  AnalyticsRecoveryTrendsRequestedDto,
  AnalyticsRecoveryTrendsCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { AnalyticsAggregationUtil } from '../../../utils';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Recovery Trends Analytics Orchestrator
 * ========================================================================
 *
 * PURPOSE:
 * Provides time-series analysis of debt recovery performance showing
 * trends in collections, recovery rates, and portfolio health over time.
 *
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class AnalyticsRecoveryTrendsOrchestrator extends BaseOrchestrator<
  AnalyticsRecoveryTrendsRequestedDto,
  AnalyticsRecoveryTrendsCompletedDto
> {
  protected readonly logger = new Logger(AnalyticsRecoveryTrendsOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsRecoveryTrendsRequestedDto;
  protected readonly responseDtoClass = AnalyticsRecoveryTrendsCompletedDto;
  protected readonly serviceName = 'api-organizations';
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ORGANIZATIONS';

  constructor(
    @Inject('EVENT_ORCHESTRATOR_CONFIG')
    config: EventOrchestratorConfig,
    httpService: HttpService,
    eventPublisher: EventPublisher,
  ) {
    super(config, httpService, eventPublisher);
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    subscriptionName: 'event-orchestrator.analytics.recovery-trends-requested.sub',
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
    
    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];

    if (!debtServiceUrl || !transactionServiceUrl) {
      throw new Error(
        'Required service endpoints for recovery trends are not configured.',
      );
    }

    // Build query params from filters
    const queryParams = AnalyticsAggregationUtil.buildQueryParams(query);

    // Fetch data from both services in parallel
    const [transactionData, debtData] = await Promise.all([
      this.fetchPayments(transactionServiceUrl, organizationId, queryParams),
      this.fetchDebts(debtServiceUrl, organizationId, queryParams),
    ]);

    // Aggregate the data
    const aggregatedTrends = this.aggregateTrends(
      transactionData,
      debtData,
      organizationId,
      query,
    );

    return {
      organizationId,
      correlationId,
      trends: aggregatedTrends,
    };
  }

  private async fetchPayments(
    baseUrl: string,
    organizationId: string,
    queryParams: string,
  ): Promise<any> {
    // Note: BaseOrchestrator.fetchInternal expects a Record<string, string> for queryParams
    // but building it via URLSearchParams then parsing back or just passing the object is cleaner.
    // The original code passed a built string. 
    // I'll adjust the call to pass the raw query object if possible, or just parse it back.
    const params = Object.fromEntries(new URLSearchParams(queryParams).entries());
    
    return this.fetchInternal(
      baseUrl,
      `/internal/transactions/analytics/recovery-trends/${organizationId}`,
      'GET',
      null,
      params,
    );
  }

  private async fetchDebts(
    baseUrl: string,
    organizationId: string,
    queryParams: string,
  ): Promise<any> {
    const params = Object.fromEntries(new URLSearchParams(queryParams).entries());

    return this.fetchInternal(
      baseUrl,
      `/internal/debts/analytics/recovery-trends/${organizationId}`,
      'GET',
      null,
      params,
    );
  }

  private aggregateTrends(
    transactionData: any,
    debtData: any,
    organizationId: string,
    query: any,
  ): IRecoveryTrendsResponse {
    const payments = transactionData.payments || [];
    const debts = debtData.debtsOverTime || [];

    const isGrouped = query.groupBy && query.groupBy !== AnalyticsGroupBy.NONE;

    if (isGrouped) {
      const trendsByGroup = AnalyticsAggregationUtil.aggregateGroupedTrends(
        payments,
        debts,
      );

      const { totalCollected, avgRecoveryRate } =
        AnalyticsAggregationUtil.calculateGroupedOverallMetrics(trendsByGroup);

      return {
        orgId: organizationId,
        startDate: query.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: query.endDate || new Date().toISOString().split('T')[0],
        granularity: query.granularity || TrendGranularity.MONTHLY,
        groupBy: query.groupBy,
        trendsByGroup,
        totalCollected,
        avgRecoveryRate,
        generatedAt: new Date().toISOString(),
      };
    } else {
      const trends = AnalyticsAggregationUtil.aggregateSingleSeriesTrends(
        payments,
        debts,
      );

      const { totalCollected, avgRecoveryRate } =
        AnalyticsAggregationUtil.calculateOverallMetrics(trends);

      return {
        orgId: organizationId,
        startDate: query.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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