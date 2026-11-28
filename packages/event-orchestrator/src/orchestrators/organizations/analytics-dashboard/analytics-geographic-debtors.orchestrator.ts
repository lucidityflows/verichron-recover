import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  OrchestrationEventEnvelope,
} from '@verichron/events';
import { GeographicAnalyticsView } from '@verichron/enums';
import { IGeographicDebtorAnalytics, IDebtorGeographicStateData } from '@verichron/contracts';
import {
  AnalyticsGeographicDebtorsRequestedDto,
  AnalyticsGeographicDebtorsCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { AnalyticsAggregationUtil } from '../../../utils';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Geographic Debtors Analytics Orchestrator
 * ========================================================================
 *
 * PURPOSE:
 * Provides geographic distribution analysis of debtors.
 *
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class AnalyticsGeographicDebtorsOrchestrator extends BaseOrchestrator<
  AnalyticsGeographicDebtorsRequestedDto,
  AnalyticsGeographicDebtorsCompletedDto
> {
  protected readonly logger = new Logger(AnalyticsGeographicDebtorsOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsGeographicDebtorsRequestedDto;
  protected readonly responseDtoClass = AnalyticsGeographicDebtorsCompletedDto;
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
    subscriptionName: 'event-orchestrator.analytics.geographic-debtors-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_GEOGRAPHIC_DEBTORS_REQUESTED,
    dto: AnalyticsGeographicDebtorsRequestedDto,
  })
  async handleGeographicDebtorsRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsGeographicDebtorsRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_GEOGRAPHIC_DEBTORS_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsGeographicDebtorsRequestedDto,
  ): Promise<AnalyticsGeographicDebtorsCompletedDto> {
    const { organizationId, correlationId, query } = payload;
    
    const debtorServiceUrl = this.config.serviceEndpoints['api-debtors'];
    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];

    if (!debtorServiceUrl || !debtServiceUrl) {
      throw new Error(
        'Required service endpoints for geographic debtor analytics are not configured.',
      );
    }

    // Build query params
    const queryParamsString = AnalyticsAggregationUtil.buildQueryParams(query);
    const queryParams = Object.fromEntries(new URLSearchParams(queryParamsString).entries());

    // Fetch data from both services in parallel
    const [debtorData, debtData] = await Promise.all([
      this.fetchInternal(
        debtorServiceUrl,
        `/internal/debtors/analytics/geographic/debtors/${organizationId}`,
        'GET',
        null,
        queryParams,
      ),
      this.fetchInternal(
        debtServiceUrl,
        `/internal/debts/analytics/geographic/debts-by-state/${organizationId}`,
        'GET',
        null,
        queryParams,
      ),
    ]);

    // Create debtor-to-state lookup map
    const debtorToStateMap = new Map<string, string>();
    if (debtorData.debtorStateMapping) {
      debtorData.debtorStateMapping.forEach((mapping: any) => {
        debtorToStateMap.set(mapping.debtorProfileId, mapping.stateCode);
      });
    }

    // Aggregate debt metrics by state
    const stateDebtMetrics = new Map<string, {
      totalDebtValue: number;
      totalDebts: number;
      activeDebts: number;
      paidDebts: number;
      defaultedDebts: number;
    }>();

    let totalDebtValue = 0;

    if (debtData.debtorMetrics) {
      debtData.debtorMetrics.forEach((debtorMetric: any) => {
        const stateCode = debtorToStateMap.get(debtorMetric.debtorProfileId);
        if (!stateCode) return;

        totalDebtValue += debtorMetric.totalDebtValue || 0;

        const existing = stateDebtMetrics.get(stateCode) || {
          totalDebtValue: 0,
          totalDebts: 0,
          activeDebts: 0,
          paidDebts: 0,
          defaultedDebts: 0,
        };

        stateDebtMetrics.set(stateCode, {
          totalDebtValue: existing.totalDebtValue + (debtorMetric.totalDebtValue || 0),
          totalDebts: existing.totalDebts + (debtorMetric.totalDebts || 0),
          activeDebts: existing.activeDebts + (debtorMetric.activeDebts || 0),
          paidDebts: existing.paidDebts + (debtorMetric.paidDebts || 0),
          defaultedDebts: existing.defaultedDebts + (debtorMetric.defaultedDebts || 0),
        });
      });
    }

    // Merge aggregated debt data into debtor state data
    const mergedStates: IDebtorGeographicStateData[] = debtorData.states.map(
      (debtorState: IDebtorGeographicStateData) => {
        const debtMetrics = stateDebtMetrics.get(debtorState.stateCode);
        if (!debtMetrics) return debtorState;

        const averageDebtValue = debtMetrics.totalDebts > 0
          ? debtMetrics.totalDebtValue / debtMetrics.totalDebts
          : 0;

        const recoveryRate = debtMetrics.totalDebts > 0
          ? (debtMetrics.paidDebts / debtMetrics.totalDebts) * 100
          : 0;

        return {
          ...debtorState,
          totalDebtValue: debtMetrics.totalDebtValue,
          averageDebtValue,
          activeDebts: debtMetrics.activeDebts,
          paidDebts: debtMetrics.paidDebts,
          defaultedDebts: debtMetrics.defaultedDebts,
          recoveryRate,
        };
      },
    );

    const debtorAnalytics: IGeographicDebtorAnalytics = {
      type: GeographicAnalyticsView.DEBTORS,
      totalDebtors: debtorData.totalDebtors,
      totalDebtValue,
      states: mergedStates,
    };

    return {
      organizationId,
      correlationId,
      data: debtorAnalytics,
    };
  }
}