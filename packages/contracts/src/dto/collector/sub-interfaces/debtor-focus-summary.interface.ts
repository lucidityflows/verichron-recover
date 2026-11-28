export interface IDebtorFocusSummary {
  totalDebt: number;
  totalPaid: number;
  remainingBalance: number;
  oldestDebtDate: Date | null;
  daysSinceLastContact: number | null;
  daysSinceLastPayment: number | null;
  activeDebtsCount: number;
  paidDebtsCount: number;
}
