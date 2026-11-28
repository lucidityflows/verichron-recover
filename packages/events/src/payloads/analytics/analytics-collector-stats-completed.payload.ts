/**
 * Collector Statistics Response
 *
 * Aggregated performance metrics for a collector within a time period.
 */
export interface CollectorStats {
  // Communication metrics (from api-communications)
  callsMade: number;
  emailsSent: number;
  smsSent: number;
  accountsContacted: number; // Unique debtors contacted
  emailResponseRate: number; // Percentage

  // Payment metrics (from api-transactions)
  collectedToday: number; // Amount in cents
  totalCollected: number; // Amount in cents for the period
  successfulPayments: number;
  paymentPlansCreated: number;
  uniquePayingAccounts: number;

  // Action metrics (from api-collectors)
  totalActions: number;
  notesAdded: number;

  // Trends
  callsTrend?: number; // Percentage change from previous period
}

/**
 * Payload for ANALYTICS_COLLECTOR_STATS_COMPLETED event
 *
 * Published by event orchestrator after aggregating collector stats from all services.
 */
export interface AnalyticsCollectorStatsCompletedPayload {
  organizationId: string;
  collectorUserId: string;
  periodStart: string;
  periodEnd: string;
  correlationId?: string;
  stats?: CollectorStats;
  error?: string;
}
