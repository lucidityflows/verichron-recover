export interface DebtStatusQueryRequestedPayload {
  organizationId: string;
  debtId: string;
  replyTo?: string;
  correlationId?: string;
}
