import { BadRequestException } from '@nestjs/common';

export class InvitationCoolDownException extends BadRequestException {
  constructor(debtorId: string, retryDate: Date) {
    super(
      `Invitation cool-down in effect for debtor ${debtorId}. Please wait until ${retryDate.toISOString()} to resend.`,
    );
  }
}
