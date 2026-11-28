
/**
 * Payload for ANALYTICS_DASHBOARD_SUMMARY_REQUESTED event
 * Published by api-organizations when a dashboard summary is requested.
 */
export interface AnalyticsDashboardSummaryRequestedPayload {
  organizationId: string;
  correlationId: string; // To link request with response
  date?: string; // Optional specific date to fetch stats for (ISO 8601)
}
