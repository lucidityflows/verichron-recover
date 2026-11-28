import { IGeographicCreditorAnalytics } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_GEOGRAPHIC_CREDITORS_COMPLETED event
 * Published by the event orchestrator when geographic creditor analytics have been aggregated.
 */
export interface AnalyticsGeographicCreditorsCompletedPayload {
  organizationId: string;
  correlationId: string;
  data?: IGeographicCreditorAnalytics;
  error?: string;
}
