export interface IDebtorFocusPaymentHistory {
  id: string;
  date: Date;
  amount: number;
  debtId: string;
  debtAccountNumber: string;
  paymentMethod: string;
  transactionId: string | null;
  status: string;
}
