import { TrendGranularity } from '@verichron/enums';

/**
 * Leaderboard Entry
 *
 * Performance metrics for a single collector on the leaderboard.
 */
export interface LeaderboardEntry {
  collectorId: string;
  collectorName: string;
  totalCollected: number; // Amount in cents
  rank: number;
  isCurrentUser: boolean;
  accountsResolved?: number;
  totalContacts?: number;
  successfulPayments?: number;
  paymentPlansCreated?: number;
}

/**
 * Collector Leaderboard
 *
 * Rankings of collectors by performance within a time period.
 */
export interface CollectorLeaderboard {
  period: TrendGranularity;
  periodStart: string;
  periodEnd: string;
  entries: LeaderboardEntry[];
  totalCollectors: number;
  currentUserRank: number;
}

/**
 * Payload for ANALYTICS_COLLECTOR_LEADERBOARD_COMPLETED event
 *
 * Published by event orchestrator after aggregating and ranking collector performance.
 */
export interface AnalyticsCollectorLeaderboardCompletedPayload {
  organizationId: string;
  collectorUserId: string;
  period: TrendGranularity;
  pageSize: number;
  correlationId?: string;
  leaderboard?: CollectorLeaderboard;
  error?: string;
}
