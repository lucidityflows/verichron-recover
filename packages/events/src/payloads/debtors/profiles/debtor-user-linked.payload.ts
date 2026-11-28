

/**
 * Payload for DebtorUserLinked event
 * Published by api-debtors when a user account is linked to a debtor profile
 */
export interface DebtorUserLinkedPayload {
  debtorIdentityId: string;
  debtorProfileId: string;
  userId: string;
  organizationId: string;
  linkedAt: string;
}