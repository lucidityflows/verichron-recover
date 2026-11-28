export interface WSRealtimeBasePayload {
  organizationId: string;
}

export interface WSUserStatusChangedPayload extends WSRealtimeBasePayload {
  userId: string;
  status: string;
}

export interface WSTeamMemberAddedPayload extends WSRealtimeBasePayload {
  teamId: string;
  userId: string;
}

export interface WSDebtStatusChangedPayload extends WSRealtimeBasePayload {
  debtId: string;
  status: string;
}

export interface WSPaymentReceivedPayload extends WSRealtimeBasePayload {
  transactionId: string;
  amount: number;
  debtorId: string;
}

export interface WSWorkItemAssignedPayload extends WSRealtimeBasePayload {
  itemId: string;
  collectorId: string;
  debtorId: string;
}

export interface WSComplianceBlockedPayload extends WSRealtimeBasePayload {
  debtorId: string;
  reason: string;
  timestamp: string;
}

export interface WSSettlementRequestedPayload extends WSRealtimeBasePayload {
  debtId: string;
  amount: number;
  collectorId: string;
}