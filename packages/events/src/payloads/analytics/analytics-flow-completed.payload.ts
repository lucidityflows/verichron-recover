import { IFlowAnalyticsResponse } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_FLOW_COMPLETED event
 * Published by the AnalyticsFlowOrchestrator when flow analytics have been aggregated.
 */
export interface AnalyticsFlowCompletedPayload {
  organizationId: string;
  correlationId: string;
  data?: IFlowAnalyticsResponse;
  error?: string;
}
