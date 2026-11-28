/**
 * Payload for ANALYTICS_TEAM_OVERVIEW_REQUESTED event
 * 
 * Published by api-collectors when requesting a comprehensive team overview.
 */
export interface AnalyticsTeamOverviewRequestedPayload {
  organizationId: string;
  teamId?: string;
  correlationId?: string;
}
