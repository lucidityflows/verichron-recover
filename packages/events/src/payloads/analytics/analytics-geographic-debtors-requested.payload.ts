import { IGeographicQuery } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_GEOGRAPHIC_DEBTORS_REQUESTED event
 * Published by api-organizations when geographic debtor analytics are requested.
 */
export interface AnalyticsGeographicDebtorsRequestedPayload {
  organizationId: string;
  correlationId: string;
  query: IGeographicQuery;
}
