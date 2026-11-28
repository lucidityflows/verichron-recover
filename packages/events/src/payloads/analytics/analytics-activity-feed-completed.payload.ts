import { IActivityFeed } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_ACTIVITY_FEED_COMPLETED event
 */
export interface AnalyticsActivityFeedCompletedPayload {
  organizationId: string;
  activities?: IActivityFeed;
  error?: string;
  correlationId?: string;
}
