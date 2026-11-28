import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  EventOrchestratorClient,
  AnalyticsCollectorStatsRequestedDto,
  AnalyticsCollectorLeaderboardRequestedDto,
} from '@verichron/event-orchestrator';
import { v4 as uuidv4 } from 'uuid';
import { handleServiceError } from '@verichron/error-handling';
import { CollectorResponseTrackingService } from './collector-response-tracking.service';
import { DailyMetricsService } from './daily-metrics.service';
import {
  CollectorTodayStatsDto,
  CollectorWeekStatsDto,
  CollectorLeaderboardDto,
  CollectorDashboardSummaryDto,
  CollectorPerformancePointDto,
} from './dto';
import { TrendGranularity } from '@verichron/enums';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';

/**
 * Performance Service
 *
 * Analytics and ranking logic:
 * - Stats aggregation (today/week)
 * - Leaderboard ranking
 * - Response tracking integration
 * - Historical metrics retrieval
 */
@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  constructor(
    private readonly orchestratorClient: EventOrchestratorClient,
    private readonly dailyMetricsService: DailyMetricsService,
    private readonly responseTrackingService: CollectorResponseTrackingService,
  ) {}

  /**
   * Get historical performance metrics for a collector
   */
  async getHistory(
    organizationId: string,
    collectorUserId: string,
    startDate: string,
    endDate: string,
  ): Promise<CollectorPerformancePointDto[]> {
    try {
      const metrics = await this.dailyMetricsService.getHistory(
        organizationId,
        collectorUserId,
        startDate,
        endDate,
      );

      return metrics.map(m => ({
        date: m.date,
        callsMade: m.callsMade,
        emailsSent: m.emailsSent,
        smsSent: m.smsSent,
        uniqueAccountsContacted: m.uniqueAccountsContacted,
        promisesSecured: m.promisesSecured,
        paymentsReceived: m.paymentsReceived,
        totalCollected: m.totalCollected.toString(),
      }));
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to get performance history');
    }
  }

  /**
   * Get today's collector performance stats
   */
  async getTodayStats(
    organizationId: string,
    collectorUserId: string,
  ): Promise<CollectorTodayStatsDto> {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const result = await this.orchestratorClient.request<{
        stats?: any;
        error?: string;
      }, AnalyticsCollectorStatsRequestedDto>(
        EVENT_TOPICS.COLLECTORS,
        EVENT_TYPES.ANALYTICS_COLLECTOR_STATS_REQUESTED,
        {
          organizationId,
          collectorUserId,
          periodStart: startOfDay.toISOString(),
          periodEnd: endOfDay.toISOString(),
          correlationId: uuidv4(),
        },
        AnalyticsCollectorStatsRequestedDto,
      );

      if (!result || result.error || !result.stats) {
        throw new ServiceUnavailableException('Collector stats unavailable');
      }

      return {
        callsMade: result.stats.callsMade || 0,
        emailsSent: result.stats.emailsSent || 0,
        accountsContacted: result.stats.accountsContacted || 0,
        collectedToday: result.stats.collectedToday || 0,
        callsTrend: result.stats.callsTrend,
        emailResponseRate: result.stats.emailResponseRate || 0,
      };
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to get today stats', [ServiceUnavailableException]);
    }
  }

  /**
   * Get this week's collector performance stats
   */
  async getWeekStats(
    organizationId: string,
    collectorUserId: string,
  ): Promise<CollectorWeekStatsDto> {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const result = await this.orchestratorClient.request<{
        stats?: any;
        error?: string;
      }, AnalyticsCollectorStatsRequestedDto>(
        EVENT_TOPICS.COLLECTORS,
        EVENT_TYPES.ANALYTICS_COLLECTOR_STATS_REQUESTED,
        {
          organizationId,
          collectorUserId,
          periodStart: startOfWeek.toISOString(),
          periodEnd: endOfWeek.toISOString(),
          correlationId: uuidv4(),
        },
        AnalyticsCollectorStatsRequestedDto,
      );

      if (!result || result.error || !result.stats) {
        throw new ServiceUnavailableException('Collector week stats unavailable');
      }

      const [accountsResolved, recoveryRate, avgTimeToContact] = await Promise.all([
        this.responseTrackingService.getResolvedAccountsCount(organizationId, collectorUserId, startOfWeek, endOfWeek),
        this.responseTrackingService.getRecoveryRate(organizationId, collectorUserId, startOfWeek, endOfWeek),
        this.responseTrackingService.getAverageTimeToContact(organizationId, collectorUserId, startOfWeek, endOfWeek),
      ]);

      return {
        totalCalls: result.stats.callsMade || 0,
        accountsResolved,
        totalCollected: result.stats.totalCollected || 0,
        recoveryRate,
        totalAccountsWorked: result.stats.accountsContacted || 0,
        avgTimeToContact,
      };
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to get week stats', [ServiceUnavailableException]);
    }
  }

  /**
   * Get team leaderboard
   */
  async getLeaderboard(
    organizationId: string,
    collectorUserId: string,
    period: TrendGranularity,
    pageSize: number,
    teamId?: string,
  ): Promise<CollectorLeaderboardDto> {
    try {
      const result = await this.orchestratorClient.request<{
        leaderboard?: any;
        error?: string;
      }, AnalyticsCollectorLeaderboardRequestedDto>(
        EVENT_TOPICS.COLLECTORS,
        EVENT_TYPES.ANALYTICS_COLLECTOR_LEADERBOARD_REQUESTED,
        {
          organizationId,
          collectorUserId,
          period,
          pageSize,
          teamId,
          correlationId: uuidv4(),
        },
        AnalyticsCollectorLeaderboardRequestedDto,
      );

      if (!result || result.error || !result.leaderboard) {
        throw new ServiceUnavailableException('Leaderboard unavailable');
      }

      return {
        period: result.leaderboard.period,
        periodStart: result.leaderboard.periodStart,
        periodEnd: result.leaderboard.periodEnd,
        entries: result.leaderboard.entries.map((entry: any) => ({
          collectorId: entry.collectorId,
          collectorName: entry.collectorName,
          totalCollected: entry.totalCollected,
          rank: entry.rank,
          isCurrentUser: entry.isCurrentUser,
          accountsResolved: entry.accountsResolved,
          totalContacts: entry.totalContacts,
        })),
        totalCollectors: result.leaderboard.totalCollectors,
        currentUserRank: result.leaderboard.currentUserRank,
      };
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to get leaderboard', [ServiceUnavailableException]);
    }
  }

  /**
   * Get complete dashboard summary
   */
  async getDashboardSummary(
    organizationId: string,
    collectorUserId: string,
    teamId?: string,
  ): Promise<CollectorDashboardSummaryDto> {
    const [todayStats, weekStats, leaderboard] = await Promise.all([
      this.getTodayStats(organizationId, collectorUserId),
      this.getWeekStats(organizationId, collectorUserId),
      this.getLeaderboard(organizationId, collectorUserId, TrendGranularity.MONTHLY, 10, teamId),
    ]);

    return { todayStats, weekStats, leaderboard };
  }
}
