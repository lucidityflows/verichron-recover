import { DashboardSummaryPayload } from "./dashboard-summary.payload";

/**
 * Payload for ANALYTICS_DASHBOARD_SUMMARY_COMPLETED event
 * Published by the AnalyticsOrchestrator when a dashboard summary has been aggregated.
 */
export interface AnalyticsDashboardSummaryCompletedPayload {
  organizationId: string;
  correlationId: string; // To link request with response
  summary?: DashboardSummaryPayload; // The aggregated summary data
  error?: string; // Error message if orchestration failed
}
