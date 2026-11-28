import { IGeographicDebtorAnalytics } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_GEOGRAPHIC_DEBTORS_COMPLETED event
 * Published by the event orchestrator when geographic debtor analytics have been aggregated.
 */
export interface AnalyticsGeographicDebtorsCompletedPayload {
  organizationId: string;
  correlationId: string;
  data?: IGeographicDebtorAnalytics;
  error?: string;
}
