/**
 * Represents the shape of the dashboard summary data.
 * This is a shared type, independent of any specific application DTO.
 */
export interface DashboardSummaryPayload {
  totalPortfolios: number;
  totalDebts: number;
  totalDebtors: number;
  totalInvested: Array<{ period: string; value: number }>;
  totalCollected: Array<{ period: string; value: number }>;
  totalOutstanding: number;
  overallRecoveryRate: number;
  statusCounts: {
    active: number;
    paid: number;
    settled: number;
    defaulted: number;
    paymentPlan: number;
  };
  todayCollections: number;
  todayPaymentPlans: number;
  todayContacts: number;
  yesterdayCollections: number;
  yesterdayPaymentPlans: number;
  yesterdayContacts: number;
  topPortfolios: Array<{ id: string; name: string; value: number }>;
  generatedAt: Date;
}
