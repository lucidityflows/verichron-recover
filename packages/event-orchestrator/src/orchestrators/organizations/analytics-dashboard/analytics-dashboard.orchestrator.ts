import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  DashboardSummaryPayload,
  OrchestrationEventEnvelope,
} from '@verichron/events';
import {
  AnalyticsDashboardSummaryRequestedDto,
  AnalyticsDashboardSummaryCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Dashboard Summary Analytics Orchestrator
 * ========================================================================
 *
 * PURPOSE:
 * Provides high-level business intelligence dashboard for organization admins
 * and managers. Aggregates data from multiple services to show overall
 * organization performance, portfolio health, and key metrics.
 * 
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class AnalyticsDashboardOrchestrator extends BaseOrchestrator<
  AnalyticsDashboardSummaryRequestedDto,
  AnalyticsDashboardSummaryCompletedDto
> {
  protected readonly logger = new Logger(AnalyticsDashboardOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsDashboardSummaryRequestedDto;
  protected readonly responseDtoClass = AnalyticsDashboardSummaryCompletedDto;
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
    subscriptionName:
      'event-orchestrator.analytics.dashboard-summary-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_REQUESTED,
    dto: AnalyticsDashboardSummaryRequestedDto,
  })
  async handleDashboardSummaryRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsDashboardSummaryRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_COMPLETED,
      async (payload) => this.processDashboardRequest(payload),
    );
  }

  private async processDashboardRequest(
    payload: AnalyticsDashboardSummaryRequestedDto,
  ): Promise<AnalyticsDashboardSummaryCompletedDto> {
    const { organizationId, correlationId, date } = payload;
    
    // Fan out requests to multiple services
    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];
    const debtorServiceUrl = this.config.serviceEndpoints['api-debtors'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];
    const communicationsServiceUrl = this.config.serviceEndpoints['api-communications'];

    if (!debtServiceUrl || !debtorServiceUrl) {
      throw new Error(
        'Required service endpoints for analytics orchestration are not configured.',
      );
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Use provided date or today if not provided (though typical usage relies on 'yesterday' calc for comparison)
    // The original code passed 'date' from payload to queryParams if present.
    const queryParams = date ? { date } : {};
    const yesterdayParams = { date: yesterdayStr };

    // Fetch data from multiple services in parallel
    const [
      debtData,
      debtorData,
      todayTransactions,
      yesterdayTransactions,
      todayComms,
      yesterdayComms,
    ] = await Promise.all([
      this.fetchDebtData(debtServiceUrl, organizationId, queryParams),
      this.fetchDebtorData(debtorServiceUrl, organizationId, queryParams),
      transactionServiceUrl
        ? this.fetchTransactionData(transactionServiceUrl, organizationId, queryParams)
        : Promise.resolve({
            todayCollections: 0,
            todayPaymentPlans: 0,
            totalCollected: [],
          }),
      transactionServiceUrl
        ? this.fetchTransactionData(transactionServiceUrl, organizationId, yesterdayParams)
        : Promise.resolve({ todayCollections: 0, todayPaymentPlans: 0 }),
      communicationsServiceUrl
        ? this.fetchInternal(
            communicationsServiceUrl,
            `/internal/communications/analytics/dashboard-summary/${organizationId}`,
            'GET',
            null,
            queryParams,
          ).catch(() => ({ todayContacts: 0 })) // Graceful degradation
        : Promise.resolve({ todayContacts: 0 }),
      communicationsServiceUrl
        ? this.fetchInternal(
            communicationsServiceUrl,
            `/internal/communications/analytics/dashboard-summary/${organizationId}`,
            'GET',
            null,
            yesterdayParams,
          ).catch(() => ({ todayContacts: 0 })) // Graceful degradation
        : Promise.resolve({ todayContacts: 0 }),
    ]);

    const aggregatedSummary = this.aggregateDashboardResponses([
      debtData,
      debtorData,
      {
        ...todayTransactions,
        todayContacts: todayComms.todayContacts,
        yesterdayCollections: yesterdayTransactions.todayCollections,
        yesterdayPaymentPlans: yesterdayTransactions.todayPaymentPlans,
        yesterdayContacts: yesterdayComms.todayContacts,
      },
    ]);

    return {
      organizationId,
      correlationId: correlationId, // BaseOrchestrator ensures this, but TS likes it explicit
      summary: aggregatedSummary,
    };
  }

  private async fetchDebtData(
    baseUrl: string,
    organizationId: string,
    queryParams?: Record<string, any>,
  ): Promise<any> {
    return this.fetchInternal(
      baseUrl,
      `/internal/debts/analytics/dashboard-summary/${organizationId}`,
      'GET',
      null,
      queryParams,
    );
  }

  private async fetchDebtorData(
    baseUrl: string,
    organizationId: string,
    queryParams?: Record<string, any>,
  ): Promise<any> {
    return this.fetchInternal(
      baseUrl,
      `/internal/debtors/analytics/dashboard-summary/${organizationId}`,
      'GET',
      null,
      queryParams,
    );
  }

  private async fetchTransactionData(
    baseUrl: string,
    organizationId: string,
    queryParams?: Record<string, any>,
  ): Promise<any> {
    try {
      const data = await this.fetchInternal(
        baseUrl,
        `/internal/transactions/analytics/dashboard-summary/${organizationId}`,
        'GET',
        null,
        queryParams,
      );
      return data;
    } catch (error: any) {
      this.logger.error(
        `[fetchTransactionData] FAILED: ${error.message}`,
      );
      // Return empty data instead of throwing so dashboard can still show other metrics
      return {
        totalCollected: [],
        todayCollections: 0,
        todayPaymentPlans: 0,
      };
    }
  }

  private aggregateDashboardResponses(
    responses: any[],
  ): DashboardSummaryPayload {
    const initialSummary: DashboardSummaryPayload = {
      totalPortfolios: 0,
      totalDebts: 0,
      totalDebtors: 0,
      totalInvested: [],
      totalCollected: [],
      totalOutstanding: 0,
      overallRecoveryRate: 0,
      statusCounts: {
        active: 0,
        paid: 0,
        settled: 0,
        defaulted: 0,
        paymentPlan: 0,
      },
      todayCollections: 0,
      todayPaymentPlans: 0,
      todayContacts: 0,
      yesterdayCollections: 0,
      yesterdayPaymentPlans: 0,
      yesterdayContacts: 0,
      topPortfolios: [],
      generatedAt: new Date(),
    };

    const aggregated = responses.reduce((acc, data) => {
      acc.totalPortfolios += data.totalPortfolios || 0;
      acc.totalDebts += data.totalDebts || 0;
      acc.totalDebtors += data.totalDebtors || 0;
      acc.totalInvested = acc.totalInvested.concat(data.totalInvested || []);
      acc.totalCollected = acc.totalCollected.concat(data.totalCollected || []);
      acc.totalOutstanding += data.totalOutstanding || 0;

      if (data.statusCounts) {
        acc.statusCounts.active += data.statusCounts.active || 0;
        acc.statusCounts.paid += data.statusCounts.paid || 0;
        acc.statusCounts.settled += data.statusCounts.settled || 0;
        acc.statusCounts.defaulted += data.statusCounts.defaulted || 0;
        acc.statusCounts.paymentPlan += data.statusCounts.paymentPlan || 0;
      }

      acc.todayCollections += data.todayCollections || 0;
      acc.todayPaymentPlans += data.todayPaymentPlans || 0;
      acc.todayContacts += data.todayContacts || 0;
      acc.yesterdayCollections += data.yesterdayCollections || 0;
      acc.yesterdayPaymentPlans += data.yesterdayPaymentPlans || 0;
      acc.yesterdayContacts += data.yesterdayContacts || 0;
      acc.topPortfolios = acc.topPortfolios.concat(data.topPortfolios || []);

      return acc;
    }, initialSummary);

    const totalCollectedSum = aggregated.totalCollected.reduce(
      (sum: number, item: { value: number }) => sum + item.value,
      0,
    );
    const totalInvestedSum = aggregated.totalInvested.reduce(
      (sum: number, item: { value: number }) => sum + item.value,
      0,
    );

    if (totalInvestedSum > 0) {
      aggregated.overallRecoveryRate =
        (totalCollectedSum / totalInvestedSum) * 100;
    }

    return aggregated;
  }
}