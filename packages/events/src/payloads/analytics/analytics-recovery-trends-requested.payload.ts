import { IRecoveryTrendsQuery } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_RECOVERY_TRENDS_REQUESTED event
 * Published by api-organizations when recovery trends are requested.
 */
export interface AnalyticsRecoveryTrendsRequestedPayload {
  organizationId: string;
  correlationId: string;
  query: IRecoveryTrendsQuery;
}
