import type { IDebtorFocusView } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_DEBTOR_FOCUS_COMPLETED event
 *
 * Published by event orchestrator after aggregating debtor details from all services.
 */
export interface AnalyticsDebtorFocusCompletedPayload {
  organizationId: string;
  debtorProfileId: string;
  correlationId?: string;
  debtorFocusView?: IDebtorFocusView;
  error?: string;
}
