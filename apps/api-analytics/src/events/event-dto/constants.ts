import { EVENT_TYPES } from '@verichron/events';
import {
  AnalyticsActivityFeedRequestedDto,
  AnalyticsActivityFeedCompletedDto,
  AnalyticsDashboardSummaryRequestedDto,
  AnalyticsDashboardSummaryCompletedDto,
  AnalyticsRecoveryTrendsRequestedDto,
  AnalyticsPortfolioPerformanceRequestedDto,
  AnalyticsPortfolioPerformanceCompletedDto,
  AnalyticsFlowRequestedDto,
  AnalyticsFlowCompletedDto,
  AnalyticsGeographicDebtorsRequestedDto,
  AnalyticsGeographicDebtorsCompletedDto,
  AnalyticsGeographicCreditorsRequestedDto,
  AnalyticsGeographicCreditorsCompletedDto,
  AnalyticsDebtorFocusRequestedDto,
  AnalyticsDebtorFocusCompletedDto,
  AnalyticsCollectorStatsRequestedDto,
  AnalyticsCollectorStatsCompletedDto,
  AnalyticsTeamOverviewRequestedDto,
  AnalyticsTeamOverviewCompletedDto,
  AnalyticsCollectorLeaderboardRequestedDto,
  AnalyticsCollectorLeaderboardCompletedDto,
} from './analytics';

/**
 * Mapping of event types to their corresponding DTO classes.
 * Useful for type-safe event handling and deserialization.
 */
export const EVENT_DTO_MAP = {
  // Activity Feed
  [EVENT_TYPES.ANALYTICS_ACTIVITY_FEED_REQUESTED]: AnalyticsActivityFeedRequestedDto,
  [EVENT_TYPES.ANALYTICS_ACTIVITY_FEED_COMPLETED]: AnalyticsActivityFeedCompletedDto,

  // Dashboard Summary
  [EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_REQUESTED]: AnalyticsDashboardSummaryRequestedDto,
  [EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_COMPLETED]: AnalyticsDashboardSummaryCompletedDto,

  // Recovery Trends
  [EVENT_TYPES.ANALYTICS_RECOVERY_TRENDS_REQUESTED]: AnalyticsRecoveryTrendsRequestedDto,

  // Portfolio Performance
  [EVENT_TYPES.ANALYTICS_PORTFOLIO_PERFORMANCE_REQUESTED]: AnalyticsPortfolioPerformanceRequestedDto,
  [EVENT_TYPES.ANALYTICS_PORTFOLIO_PERFORMANCE_COMPLETED]: AnalyticsPortfolioPerformanceCompletedDto,

  // Flow Analytics
  [EVENT_TYPES.ANALYTICS_FLOW_REQUESTED]: AnalyticsFlowRequestedDto,
  [EVENT_TYPES.ANALYTICS_FLOW_COMPLETED]: AnalyticsFlowCompletedDto,

  // Geographic Debtors
  [EVENT_TYPES.ANALYTICS_GEOGRAPHIC_DEBTORS_REQUESTED]: AnalyticsGeographicDebtorsRequestedDto,
  [EVENT_TYPES.ANALYTICS_GEOGRAPHIC_DEBTORS_COMPLETED]: AnalyticsGeographicDebtorsCompletedDto,

  // Geographic Creditors
  [EVENT_TYPES.ANALYTICS_GEOGRAPHIC_CREDITORS_REQUESTED]: AnalyticsGeographicCreditorsRequestedDto,
  [EVENT_TYPES.ANALYTICS_GEOGRAPHIC_CREDITORS_COMPLETED]: AnalyticsGeographicCreditorsCompletedDto,

  // Debtor Focus
  [EVENT_TYPES.ANALYTICS_DEBTOR_FOCUS_REQUESTED]: AnalyticsDebtorFocusRequestedDto,
  [EVENT_TYPES.ANALYTICS_DEBTOR_FOCUS_COMPLETED]: AnalyticsDebtorFocusCompletedDto,

  // Collector Stats
  [EVENT_TYPES.ANALYTICS_COLLECTOR_STATS_REQUESTED]: AnalyticsCollectorStatsRequestedDto,
  [EVENT_TYPES.ANALYTICS_COLLECTOR_STATS_COMPLETED]: AnalyticsCollectorStatsCompletedDto,

  // Team Overview
  [EVENT_TYPES.ANALYTICS_TEAM_OVERVIEW_REQUESTED]: AnalyticsTeamOverviewRequestedDto,
  [EVENT_TYPES.ANALYTICS_TEAM_OVERVIEW_COMPLETED]: AnalyticsTeamOverviewCompletedDto,

  // Collector Leaderboard
  [EVENT_TYPES.ANALYTICS_COLLECTOR_LEADERBOARD_REQUESTED]: AnalyticsCollectorLeaderboardRequestedDto,
  [EVENT_TYPES.ANALYTICS_COLLECTOR_LEADERBOARD_COMPLETED]: AnalyticsCollectorLeaderboardCompletedDto,
} as const;
