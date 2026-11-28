/**
 * Payload for ANALYTICS_ACTIVITY_FEED_REQUESTED event
 */
export interface AnalyticsActivityFeedRequestedPayload {
  organizationId: string;
  teamId?: string;
  pageSize?: number;
  correlationId?: string;
}
