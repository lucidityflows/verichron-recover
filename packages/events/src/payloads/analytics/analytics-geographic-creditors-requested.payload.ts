import { IGeographicQuery } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_GEOGRAPHIC_CREDITORS_REQUESTED event
 * Published by api-organizations when geographic creditor analytics are requested.
 */
export interface AnalyticsGeographicCreditorsRequestedPayload {
  organizationId: string;
  correlationId: string;
  query: IGeographicQuery;
}
