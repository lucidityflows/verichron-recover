import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DebtorVerificationStatusChangedPayload } from '@verichron/events';
import { DebtorVerificationStatus } from '@verichron/enums/dist';

/**
 * Event DTO for DebtorVerificationStatusChanged event
 *
 * Published when a debtor's verification status changes.
 */
export class DebtorVerificationStatusChangedDto implements DebtorVerificationStatusChangedPayload {
  @IsUUID()
  debtorId: string;

  @IsEnum(DebtorVerificationStatus)
  previousStatus: DebtorVerificationStatus;

  @IsEnum(DebtorVerificationStatus)
  newStatus: DebtorVerificationStatus;

  @IsDateString()
  statusChangedAt: string;

  @IsOptional()
  @IsString()
  verificationSource?: string;
}
