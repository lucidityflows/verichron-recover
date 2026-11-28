import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../profiles/entities';
import { OrganizationNotFoundException } from '../core/exceptions';
import { EventOrchestratorClient } from '@verichron/event-orchestrator';
import { v4 as uuidv4 } from 'uuid';

import { handleServiceError } from '@verichron/error-handling';
import {
  DashboardSummaryResponseDto,
  RecoveryTrendsQueryDto,
  RecoveryTrendsResponseDto,
  PortfolioPerformanceQueryDto,
  PortfolioPerformanceResponseDto,
  FlowAnalyticsQueryDto,
  FlowAnalyticsResponseDto,
  TeamOverviewResponseDto,
  ActivityFeedResponseDto,
  GeographicQueryDto,
  GeographicDebtAgeAnalyticsDto,
  GeographicCreditorAnalyticsDto,
  GeographicDebtorAnalyticsDto,
  GeographicDefaultRiskAnalyticsDto,
  GeographicLikelihoodToPayAnalyticsDto,
  GeographicPaymentPlanAnalyticsDto,
  GeographicResponsivenessAnalyticsDto,
  GeographicCombinedAnalyticsDto,
} from './dto';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import {
  AnalyticsDashboardSummaryRequestedDto,
  AnalyticsPortfolioPerformanceRequestedDto,
  AnalyticsRecoveryTrendsRequestedDto,
  AnalyticsFlowRequestedDto,
  AnalyticsTeamOverviewRequestedDto,
  AnalyticsActivityFeedRequestedDto,
  AnalyticsGeographicDebtorsRequestedDto,
  AnalyticsGeographicCreditorsRequestedDto,
  AnalyticsGeographicCombinedRequestedDto,
} from '../events/event-dto';
import {
  AnalyticsDashboardSummaryRequestedPayload,
  AnalyticsPortfolioPerformanceRequestedPayload,
  AnalyticsRecoveryTrendsRequestedPayload,
  AnalyticsFlowRequestedPayload,
  AnalyticsTeamOverviewRequestedPayload,
  AnalyticsActivityFeedRequestedPayload,
  AnalyticsGeographicDebtorsRequestedPayload,
  AnalyticsGeographicCreditorsRequestedPayload,
  AnalyticsGeographicCombinedRequestedPayload,
} from '@verichron/events';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly orchestratorClient: EventOrchestratorClient,
  ) {}

  async getDashboardSummary(
    orgId: string,
    date?: string,
  ): Promise<DashboardSummaryResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      this.logger.log(
        `Requesting dashboard summary via orchestrator for organization: ${orgId} for date: ${date || 'today'}`,
      );

      const payload: AnalyticsDashboardSummaryRequestedPayload = {
        organizationId: orgId,
        correlationId: uuidv4(),
        date,
      };

      // The orchestrator client handles publishing the request, creating a temporary
      // subscription for the response, correlating the messages, and handling timeouts.
      const summary = await this.orchestratorClient.request<DashboardSummaryResponseDto, AnalyticsDashboardSummaryRequestedDto>(
        EVENT_TOPICS.ORGANIZATIONS,
        EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_REQUESTED,
        payload,
        AnalyticsDashboardSummaryRequestedDto,
      );

      if (!summary) {
        throw new ServiceUnavailableException(
          `Analytics orchestration completed without a summary for organization ${orgId}.`,
        );
      }

      return summary;

    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        `Failed to get dashboard summary for ${orgId}`,
        [OrganizationNotFoundException, ServiceUnavailableException],
      );
    }
  }

  async getTeamOverview(
    orgId: string,
    teamId?: string,
  ): Promise<TeamOverviewResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      this.logger.log(
        `Requesting team overview via orchestrator for organization: ${orgId}, team: ${teamId || 'ALL'}`,
      );

      const payload: AnalyticsTeamOverviewRequestedPayload = {
        organizationId: orgId,
        teamId,
        correlationId: uuidv4(),
      };

      const result = await this.orchestratorClient.request<{ overview?: TeamOverviewResponseDto; error?: string }, AnalyticsTeamOverviewRequestedDto>(
        EVENT_TOPICS.COLLECTORS,
        EVENT_TYPES.ANALYTICS_TEAM_OVERVIEW_REQUESTED,
        payload,
        AnalyticsTeamOverviewRequestedDto,
      );

      if (!result || result.error || !result.overview) {
        throw new ServiceUnavailableException(
          `Team overview orchestration failed: ${result?.error || 'No data returned'}`,
        );
      }

      return result.overview;
    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        `Failed to get team overview for ${orgId}`,
        [OrganizationNotFoundException, ServiceUnavailableException],
      );
    }
  }

  async getActivityFeed(
    orgId: string,
    pageSize?: number,
  ): Promise<ActivityFeedResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      this.logger.log(
        `Requesting activity feed via orchestrator for organization: ${orgId}`,
      );

      const payload: AnalyticsActivityFeedRequestedPayload = {
        organizationId: orgId,
        pageSize,
        correlationId: uuidv4(),
      };

      const result = await this.orchestratorClient.request<{ activities?: ActivityFeedResponseDto; error?: string }, AnalyticsActivityFeedRequestedDto>(
        EVENT_TOPICS.ORGANIZATIONS,
        EVENT_TYPES.ANALYTICS_ACTIVITY_FEED_REQUESTED,
        payload,
        AnalyticsActivityFeedRequestedDto,
      );

      if (!result || result.error || !result.activities) {
        throw new ServiceUnavailableException(
          `Activity feed orchestration failed: ${result?.error || 'No data returned'}`,
        );
      }

      return result.activities;
    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        `Failed to get activity feed for ${orgId}`,
        [OrganizationNotFoundException, ServiceUnavailableException],
      );
    }
  }

  async getRecoveryTrends(
    orgId: string,
    query: RecoveryTrendsQueryDto,
  ): Promise<RecoveryTrendsResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      this.logger.log(
        `Requesting recovery trends via orchestrator for organization: ${orgId}`,
      );

      const payload: AnalyticsRecoveryTrendsRequestedPayload = {
        organizationId: orgId,
        correlationId: uuidv4(),
        query,
      };

      const trends = await this.orchestratorClient.request<RecoveryTrendsResponseDto, AnalyticsRecoveryTrendsRequestedDto>(
        EVENT_TOPICS.ORGANIZATIONS,
        EVENT_TYPES.ANALYTICS_RECOVERY_TRENDS_REQUESTED,
        payload,
        AnalyticsRecoveryTrendsRequestedDto,
      );

      if (!trends) {
        throw new ServiceUnavailableException(
          `Analytics orchestration completed without recovery trends for organization ${orgId}.`,
        );
      }

      return trends;

    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        `Failed to get recovery trends for ${orgId}`,
        [OrganizationNotFoundException, ServiceUnavailableException],
      );
    }
  }

  async getPortfolioPerformance(
    orgId: string,
    query: PortfolioPerformanceQueryDto,
  ): Promise<PortfolioPerformanceResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      this.logger.log(
        `Requesting portfolio performance via orchestrator for organization: ${orgId}`,
      );

      const payload: AnalyticsPortfolioPerformanceRequestedPayload = {
        organizationId: orgId,
        correlationId: uuidv4(),
        query,
      };

      const performance = await this.orchestratorClient.request<PortfolioPerformanceResponseDto, AnalyticsPortfolioPerformanceRequestedDto>(
        EVENT_TOPICS.ORGANIZATIONS,
        EVENT_TYPES.ANALYTICS_PORTFOLIO_PERFORMANCE_REQUESTED,
        payload,
        AnalyticsPortfolioPerformanceRequestedDto,
      );

      if (!performance) {
        throw new ServiceUnavailableException(
          `Analytics orchestration completed without portfolio performance for organization ${orgId}.`,
        );
      }

      return performance;

    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        `Failed to get portfolio performance for ${orgId}`,
        [OrganizationNotFoundException, ServiceUnavailableException],
      );
    }
  }

  async getFlowAnalytics(
    orgId: string,
    query: FlowAnalyticsQueryDto,
  ): Promise<FlowAnalyticsResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      this.logger.log(
        `Requesting flow analytics via orchestrator for organization: ${orgId}, view: ${query.view}`,
      );

      const payload: AnalyticsFlowRequestedPayload = {
        organizationId: orgId,
        correlationId: uuidv4(),
        query,
      };

      const flowData = await this.orchestratorClient.request<FlowAnalyticsResponseDto, AnalyticsFlowRequestedDto>(
        EVENT_TOPICS.ORGANIZATIONS,
        EVENT_TYPES.ANALYTICS_FLOW_REQUESTED,
        payload,
        AnalyticsFlowRequestedDto,
      );

      if (!flowData) {
        throw new ServiceUnavailableException(
          `Analytics orchestration completed without flow data for organization ${orgId}.`,
        );
      }

      return flowData;

    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        `Failed to get flow analytics for ${orgId}`,
        [OrganizationNotFoundException, ServiceUnavailableException],
      );
    }
  }

  async getDebtAgeGeographic(
    orgId: string,
    query: GeographicQueryDto,
  ): Promise<GeographicDebtAgeAnalyticsDto> {
    await this.verifyOrganizationExists(orgId);
    this.logger.warn(`AnalyticsService: getDebtAgeGeographic not yet implemented via orchestration for ${orgId}`);
    throw new ServiceUnavailableException('Geographic debt age analytics not yet implemented.');
  }

  async getCreditorGeographic(
    orgId: string,
    query: GeographicQueryDto,
  ): Promise<GeographicCreditorAnalyticsDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      this.logger.log(
        `Requesting geographic creditor analytics via orchestrator for organization: ${orgId}`,
      );

      const payload: AnalyticsGeographicCreditorsRequestedPayload = {
        organizationId: orgId,
        correlationId: uuidv4(),
        query,
      };

      const analytics = await this.orchestratorClient.request<GeographicCreditorAnalyticsDto, AnalyticsGeographicCreditorsRequestedDto>(
        EVENT_TOPICS.ORGANIZATIONS,
        EVENT_TYPES.ANALYTICS_GEOGRAPHIC_CREDITORS_REQUESTED,
        payload,
        AnalyticsGeographicCreditorsRequestedDto,
      );

      if (!analytics) {
        throw new ServiceUnavailableException(
          `Analytics orchestration completed without data for organization ${orgId}.`,
        );
      }

      return analytics;
    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        `Failed to get geographic creditor analytics for ${orgId}`,
        [OrganizationNotFoundException, ServiceUnavailableException],
      );
    }
  }

  async getDebtorGeographic(
    orgId: string,
    query: GeographicQueryDto,
  ): Promise<GeographicDebtorAnalyticsDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      this.logger.log(
        `Requesting geographic debtor analytics via orchestrator for organization: ${orgId}`,
      );

      const payload: AnalyticsGeographicDebtorsRequestedPayload = {
        organizationId: orgId,
        correlationId: uuidv4(),
        query,
      };

      const analytics = await this.orchestratorClient.request<GeographicDebtorAnalyticsDto, AnalyticsGeographicDebtorsRequestedDto>(
        EVENT_TOPICS.ORGANIZATIONS,
        EVENT_TYPES.ANALYTICS_GEOGRAPHIC_DEBTORS_REQUESTED,
        payload,
        AnalyticsGeographicDebtorsRequestedDto,
      );

      if (!analytics) {
        throw new ServiceUnavailableException(
          `Analytics orchestration completed without data for organization ${orgId}.`,
        );
      }

      return analytics;
    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        `Failed to get geographic debtor analytics for ${orgId}`,
        [OrganizationNotFoundException, ServiceUnavailableException],
      );
    }
  }

  async getDefaultRiskGeographic(
    orgId: string,
    query: GeographicQueryDto,
  ): Promise<GeographicDefaultRiskAnalyticsDto> {
    await this.verifyOrganizationExists(orgId);
    this.logger.warn(`AnalyticsService: getDefaultRiskGeographic not yet implemented via orchestration for ${orgId}`);
    throw new ServiceUnavailableException('Geographic default risk analytics not yet implemented.');
  }

  async getLikelihoodToPayGeographic(
    orgId: string,
    query: GeographicQueryDto,
  ): Promise<GeographicLikelihoodToPayAnalyticsDto> {
    await this.verifyOrganizationExists(orgId);
    this.logger.warn(`AnalyticsService: getLikelihoodToPayGeographic not yet implemented via orchestration for ${orgId}`);
    throw new ServiceUnavailableException('Geographic likelihood to pay analytics not yet implemented.');
  }

  async getPaymentPlanGeographic(
    orgId: string,
    query: GeographicQueryDto,
  ): Promise<GeographicPaymentPlanAnalyticsDto> {
    await this.verifyOrganizationExists(orgId);
    this.logger.warn(`AnalyticsService: getPaymentPlanGeographic not yet implemented via orchestration for ${orgId}`);
    throw new ServiceUnavailableException('Geographic payment plan analytics not yet implemented.');
  }

  async getResponsivenessGeographic(
    orgId: string,
    query: GeographicQueryDto,
  ): Promise<GeographicResponsivenessAnalyticsDto> {
    await this.verifyOrganizationExists(orgId);
    this.logger.warn(`AnalyticsService: getResponsivenessGeographic not yet implemented via orchestration for ${orgId}`);
    throw new ServiceUnavailableException('Geographic responsiveness analytics not yet implemented.');
  }

  async getCombinedGeographic(
    orgId: string,
    query: GeographicQueryDto,
  ): Promise<GeographicCombinedAnalyticsDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      this.logger.log(
        `Requesting combined geographic analytics via orchestrator for organization: ${orgId}`,
      );

      const payload: AnalyticsGeographicCombinedRequestedPayload = {
        organizationId: orgId,
        correlationId: uuidv4(),
        query,
      };

      const analytics = await this.orchestratorClient.request<GeographicCombinedAnalyticsDto, AnalyticsGeographicCombinedRequestedDto>(
        EVENT_TOPICS.ORGANIZATIONS,
        EVENT_TYPES.ANALYTICS_GEOGRAPHIC_COMBINED_REQUESTED,
        payload,
        AnalyticsGeographicCombinedRequestedDto,
      );

      if (!analytics) {
        throw new ServiceUnavailableException(
          `Analytics orchestration completed without data for organization ${orgId}.`,
        );
      }

      return analytics;
    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        `Failed to get combined geographic analytics for ${orgId}`,
        [OrganizationNotFoundException, ServiceUnavailableException],
      );
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async verifyOrganizationExists(orgId: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new OrganizationNotFoundException(orgId);
    }

    return organization;
  }
}
