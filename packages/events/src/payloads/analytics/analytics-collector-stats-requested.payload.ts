/**
 * Payload for ANALYTICS_COLLECTOR_STATS_REQUESTED event
 *
 * Published by api-collectors when requesting collector performance statistics.
 * The event orchestrator aggregates data from api-communications, api-transactions,
 * and api-collectors to build comprehensive stats.
 */
export interface AnalyticsCollectorStatsRequestedPayload {
  organizationId: string;
  collectorUserId: string;
  periodStart: string; // ISO 8601 date string
  periodEnd: string; // ISO 8601 date string
  correlationId?: string;
}
