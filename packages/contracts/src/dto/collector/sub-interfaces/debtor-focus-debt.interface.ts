export interface IDebtorFocusDebt {
  id: string;
  accountNumber: string;
  originalCreditorName: string;
  debtType: string;
  status: string;
  principalAmount: number;
  interestAmount: number;
  feesAmount: number;
  currentBalance: number;
  daysOverdue: number;
  lastPaymentDate: Date | null;
  lastPaymentAmount: number | null;
  nextPaymentDue: Date | null;
  hasPaymentPlan: boolean;
  hasDispute: boolean;
  ltpScore?: number;
}
