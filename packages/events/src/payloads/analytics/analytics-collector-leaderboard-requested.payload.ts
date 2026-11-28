import { TrendGranularity } from '@verichron/enums';

/**
 * Payload for ANALYTICS_COLLECTOR_LEADERBOARD_REQUESTED event
 *
 * Published by api-collectors when requesting leaderboard rankings.
 * The event orchestrator aggregates organization-wide stats and ranks collectors.
 */
export interface AnalyticsCollectorLeaderboardRequestedPayload {
  organizationId: string;
  collectorUserId: string; // User requesting the leaderboard (to mark as isCurrentUser)
  period: TrendGranularity; // DAILY, WEEKLY, MONTHLY, etc.
  pageSize: number; // Max number of entries to return
  correlationId?: string;
}
