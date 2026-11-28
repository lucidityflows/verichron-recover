import { IGeographicQuery } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_GEOGRAPHIC_COMBINED_REQUESTED event
 * Published by api-organizations when combined geographic analytics are requested.
 */
export interface AnalyticsGeographicCombinedRequestedPayload {
  organizationId: string;
  correlationId: string;
  query: IGeographicQuery;
}
