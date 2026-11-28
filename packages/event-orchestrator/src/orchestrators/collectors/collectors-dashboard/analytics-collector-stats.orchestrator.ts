import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  OrchestrationEventEnvelope,
  type CollectorStats,
} from '@verichron/events';
import {
  AnalyticsCollectorStatsRequestedDto,
  AnalyticsCollectorStatsCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Collector Stats Analytics Orchestrator
 * ========================================================================
 *
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class AnalyticsCollectorStatsOrchestrator extends BaseOrchestrator<
  AnalyticsCollectorStatsRequestedDto,
  AnalyticsCollectorStatsCompletedDto
> {
  protected readonly logger = new Logger(AnalyticsCollectorStatsOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsCollectorStatsRequestedDto;
  protected readonly responseDtoClass = AnalyticsCollectorStatsCompletedDto;
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
      'event-orchestrator.analytics.collector-stats-requested.sub',
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
    const { organizationId, collectorUserId, periodStart, periodEnd, correlationId } = payload;
    
    const communicationServiceUrl = this.config.serviceEndpoints['api-communications'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];
    const collectorServiceUrl = this.config.serviceEndpoints['api-collectors'];

    if (!communicationServiceUrl || !transactionServiceUrl || !collectorServiceUrl) {
      throw new Error('Required service endpoints are not configured.');
    }

    const [communicationMetrics, paymentMetrics, actionStats] = await Promise.all([
      this.fetchCommunicationDashboardMetrics(communicationServiceUrl, organizationId, collectorUserId, periodStart, periodEnd),
      this.fetchPaymentDashboardMetrics(transactionServiceUrl, organizationId, collectorUserId, periodStart, periodEnd),
      this.fetchActionStats(collectorServiceUrl, organizationId, collectorUserId, periodStart, periodEnd),
    ]);

    const stats: CollectorStats = this.aggregateCollectorStats(
      communicationMetrics,
      paymentMetrics,
      actionStats,
    );

    return {
      organizationId,
      collectorUserId,
      periodStart,
      periodEnd,
      correlationId,
      stats,
    };
  }

  private async fetchCommunicationDashboardMetrics(
    baseUrl: string,
    organizationId: string,
    collectorUserId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<any> {
    return this.fetchInternal(
      baseUrl,
      `/internal/communications/analytics/collectors/${collectorUserId}/dashboard-metrics`,
      'GET',
      null,
      { organizationId, periodStart, periodEnd }
    );
  }

  private async fetchPaymentDashboardMetrics(
    baseUrl: string,
    organizationId: string,
    collectorUserId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<any> {
    return this.fetchInternal(
      baseUrl,
      `/internal/transactions/analytics/collectors/${collectorUserId}/dashboard-metrics`,
      'GET',
      null,
      { organizationId, periodStart, periodEnd }
    );
  }

  private async fetchActionStats(
    baseUrl: string,
    organizationId: string,
    collectorUserId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<any> {
    return {
      totalActions: 0,
      notesAdded: 0,
    };
  }

  private aggregateCollectorStats(
    communicationMetrics: any,
    paymentMetrics: any,
    actionStats: any,
  ): CollectorStats {
    return {
      callsMade: communicationMetrics?.totalCalls || 0,
      emailsSent: communicationMetrics?.totalEmails || 0,
      smsSent: communicationMetrics?.totalSms || 0,
      accountsContacted: communicationMetrics?.uniqueAccountsContacted || 0,
      emailResponseRate: communicationMetrics?.emailResponseRate || 0,
      totalCollected: paymentMetrics?.totalCollected || 0,
      successfulPayments: paymentMetrics?.successfulPaymentCount || 0,
      paymentPlansCreated: paymentMetrics?.paymentPlansCreated || 0,
      uniquePayingAccounts: paymentMetrics?.uniquePayingAccounts || 0,
      collectedToday: paymentMetrics?.totalCollectedToday || 0,
      totalActions: actionStats?.totalActions || 0,
      notesAdded: actionStats?.notesAdded || 0,
      callsTrend: undefined,
    };
  }
}