import { Module } from '@nestjs/common';

// Organization orchestrators
import {
  DashboardSummaryOrchestrator,
  RecoveryTrendsOrchestrator,
  PortfolioPerformanceOrchestrator,
  FlowAnalyticsOrchestrator,
  GeographicDebtorsOrchestrator,
  GeographicCreditorsOrchestrator,
} from './organizations/orchestrators';

// Collector orchestrators
import {
  DebtorFocusOrchestrator,
  CollectorStatsOrchestrator,
  TeamOverviewOrchestrator,
  CollectorLeaderboardOrchestrator,
} from './collectors/orchestrators';

// Activity orchestrator
import { ActivityFeedOrchestrator } from './activity/orchestrators';

/**
 * DashboardsModule
 *
 * Registers all analytics orchestrators for dashboard data aggregation.
 * Orchestrators listen to event topics and aggregate data from multiple services.
 *
 * Organization Orchestrators (6):
 * - DashboardSummaryOrchestrator: High-level business intelligence
 * - RecoveryTrendsOrchestrator: Time-series recovery analysis
 * - PortfolioPerformanceOrchestrator: Portfolio-level metrics
 * - FlowAnalyticsOrchestrator: Sankey flow diagrams
 * - GeographicDebtorsOrchestrator: Geographic distribution of debtors
 * - GeographicCreditorsOrchestrator: Geographic distribution of creditors
 *
 * Collector Orchestrators (4):
 * - DebtorFocusOrchestrator: Comprehensive debtor profile view
 * - CollectorStatsOrchestrator: Individual collector performance
 * - TeamOverviewOrchestrator: Team performance dashboard
 * - CollectorLeaderboardOrchestrator: Ranked collector performance
 *
 * Activity Orchestrator (1):
 * - ActivityFeedOrchestrator: Event timeline
 */
@Module({
  providers: [
    // Organization orchestrators
    DashboardSummaryOrchestrator,
    RecoveryTrendsOrchestrator,
    PortfolioPerformanceOrchestrator,
    FlowAnalyticsOrchestrator,
    GeographicDebtorsOrchestrator,
    GeographicCreditorsOrchestrator,

    // Collector orchestrators
    DebtorFocusOrchestrator,
    CollectorStatsOrchestrator,
    TeamOverviewOrchestrator,
    CollectorLeaderboardOrchestrator,

    // Activity orchestrator
    ActivityFeedOrchestrator,
  ],
  exports: [],
})
export class DashboardsModule {}
