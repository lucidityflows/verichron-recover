/**
 * Payload for ANALYTICS_DEBTOR_FOCUS_REQUESTED event
 *
 * Published by api-organizations when a collector requests debtor focus view.
 */
export interface AnalyticsDebtorFocusRequestedPayload {
  organizationId: string;
  debtorProfileId: string;
  correlationId?: string;
}
