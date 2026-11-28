import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  OrchestrationEventEnvelope,
} from '@verichron/events';
import { IFlowAnalyticsResponse, IFlowNode, IFlowLink } from '@verichron/contracts';
import { FlowDimension, DebtCategory, PaymentMethod } from '@verichron/enums';
import {
  AnalyticsFlowRequestedDto,
  AnalyticsFlowCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { AnalyticsAggregationUtil } from '../../../utils';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Flow Analytics Orchestrator
 * ========================================================================
 *
 * PURPOSE:
 * Aggregates dimensional data from multiple services to generate Sankey
 * flow diagrams for the organization dashboard.
 *
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class AnalyticsFlowOrchestrator extends BaseOrchestrator<
  AnalyticsFlowRequestedDto,
  AnalyticsFlowCompletedDto
> {
  protected readonly logger = new Logger(AnalyticsFlowOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsFlowRequestedDto;
  protected readonly responseDtoClass = AnalyticsFlowCompletedDto;
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
    subscriptionName: 'event-orchestrator.analytics.flow-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_FLOW_REQUESTED,
    dto: AnalyticsFlowRequestedDto,
  })
  async handleFlowRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsFlowRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_FLOW_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsFlowRequestedDto,
  ): Promise<AnalyticsFlowCompletedDto> {
    const { organizationId, correlationId, query } = payload;
    
    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];
    const debtorServiceUrl = this.config.serviceEndpoints['api-debtors'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];

    if (!debtServiceUrl || !debtorServiceUrl || !transactionServiceUrl) {
      throw new Error(
        'Required service endpoints for flow analytics are not configured.',
      );
    }

    // Build query params
    const queryParamsString = AnalyticsAggregationUtil.buildQueryParams(query);
    const queryParams = Object.fromEntries(new URLSearchParams(queryParamsString).entries());

    let dimensionData: any[] = [];

    // Fetch data based on view
    if (query.view === FlowDimension.DEBT_CATEGORY || query.view === FlowDimension.PORTFOLIO) {
      const debtResponse = await this.fetchInternal(
        debtServiceUrl,
        `/internal/debts/analytics/flow/${organizationId}`,
        'GET',
        null,
        queryParams,
      );
      dimensionData = debtResponse.debtsByDimension || [];
    } else if (query.view === FlowDimension.STATE) {
      const debtorResponse = await this.fetchInternal(
        debtorServiceUrl,
        `/internal/debtors/analytics/flow/${organizationId}`,
        'GET',
        null,
        queryParams,
      );
      dimensionData = debtorResponse.debtorsByDimension || [];
    } else if (query.view === FlowDimension.PAYMENT_METHOD) {
      const paymentResponse = await this.fetchInternal(
        transactionServiceUrl,
        `/internal/transactions/analytics/flow/${organizationId}`,
        'GET',
        null,
        queryParams,
      );
      dimensionData = paymentResponse.paymentsByDimension || [];
    } else {
      this.logger.warn(`FlowOrchestrator: View ${query.view} is not yet supported`);
    }

    // Transform dimensional data into Sankey nodes and links
    const flowResponse = this.transformToSankeyFlow(
      dimensionData,
      query.view,
      organizationId,
    );

    return {
      organizationId,
      correlationId,
      data: flowResponse,
    };
  }

  private transformToSankeyFlow(
    dimensionData: any[],
    view: FlowDimension,
    organizationId: string,
  ): IFlowAnalyticsResponse {
    const nodes: IFlowNode[] = [];
    const links: IFlowLink[] = [];
    let totalValue = 0;

    dimensionData.forEach((item) => {
      const value = view === FlowDimension.STATE
        ? parseFloat(item.totalDebtors || '0')
        : parseFloat(item.totalPrincipal || item.totalAmount || '0');
      totalValue += value;
    });

    const sourceNode: IFlowNode = {
      id: 'source',
      label: 'All',
      value: totalValue.toFixed(2),
    };
    nodes.push(sourceNode);

    let processedData = dimensionData;
    if (view === FlowDimension.STATE && dimensionData.length > 5) {
      const sorted = [...dimensionData].sort((a, b) => {
        const aValue = parseFloat(a.totalDebtors || '0');
        const bValue = parseFloat(b.totalDebtors || '0');
        return bValue - aValue;
      });

      const top5 = sorted.slice(0, 5);
      const remaining = sorted.slice(5);
      if (remaining.length > 0) {
        const otherValue = remaining.reduce(
          (sum, item) => sum + parseFloat(item.totalDebtors || '0'),
          0,
        );
        processedData = [
          ...top5,
          {
            label: 'Other',
            dimensionValue: 'OTHER',
            totalDebtors: otherValue.toString(),
            count: remaining.length,
          },
        ];
      } else {
        processedData = top5;
      }
    }

    processedData.forEach((item, index) => {
      const value = view === FlowDimension.STATE
        ? parseFloat(item.totalDebtors || '0')
        : parseFloat(item.totalPrincipal || item.totalAmount || '0');
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;

      const targetNode: IFlowNode = {
        id: `${view.toLowerCase()}-${index}`,
        label: item.label || item.dimensionValue,
        value: value.toFixed(2),
        metadata:
          view === FlowDimension.DEBT_CATEGORY
            ? { debtCategory: item.dimensionValue as DebtCategory }
            : view === FlowDimension.PORTFOLIO
            ? { portfolioId: item.dimensionValue }
            : view === FlowDimension.STATE
            ? { state: item.dimensionValue, count: item.count }
            : view === FlowDimension.PAYMENT_METHOD
            ? { paymentMethod: item.dimensionValue as PaymentMethod }
            : undefined,
      };
      nodes.push(targetNode);

      const link: IFlowLink = {
        source: 'source',
        target: targetNode.id,
        value: value.toFixed(2),
        percentage: parseFloat(percentage.toFixed(2)),
      };
      links.push(link);
    });

    return {
      orgId: organizationId,
      view,
      nodes,
      links,
      totalValue: totalValue.toFixed(2),
      generatedAt: new Date().toISOString(),
    };
  }
}