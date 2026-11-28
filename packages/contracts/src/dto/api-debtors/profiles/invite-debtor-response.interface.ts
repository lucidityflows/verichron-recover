export interface IInviteDebtorResponse {
  message: string;
  debtorId: string;
  userId?: string;
  invitationSent: boolean;
}
