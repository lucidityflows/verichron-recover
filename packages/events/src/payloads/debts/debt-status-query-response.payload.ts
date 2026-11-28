export interface DebtStatusQueryResponsePayload {
  organizationId: string;
  debtId: string;
  status?: string;
  currentBalance?: string;
  lastPaymentDate?: string | null;
  error?: string;
}
