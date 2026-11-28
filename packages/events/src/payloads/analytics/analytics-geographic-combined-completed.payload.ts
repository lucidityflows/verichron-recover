import { ICombinedGeographicAnalytics } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_GEOGRAPHIC_COMBINED_COMPLETED event
 * Published by the event orchestrator when combined geographic analytics have been aggregated.
 */
export interface AnalyticsGeographicCombinedCompletedPayload {
  organizationId: string;
  correlationId: string;
  data?: ICombinedGeographicAnalytics;
  error?: string;
}
