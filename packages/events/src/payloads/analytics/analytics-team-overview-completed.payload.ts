import { ITeamOverview } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_TEAM_OVERVIEW_COMPLETED event
 * 
 * Published by event orchestrator after aggregating data for the team overview.
 */
export interface AnalyticsTeamOverviewCompletedPayload {
  organizationId: string;
  teamId?: string;
  correlationId?: string;
  overview?: ITeamOverview;
  error?: string;
}
