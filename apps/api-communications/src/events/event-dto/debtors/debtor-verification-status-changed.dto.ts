import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum, IsISO8601 } from 'class-validator';
import type { DebtorVerificationStatusChangedPayload } from '@verichron/events';
import { DebtorVerificationStatus } from '@verichron/enums';



export class DebtorVerificationStatusChangedDto
  implements DebtorVerificationStatusChangedPayload
{

  @IsEnum(DebtorVerificationStatus)
  @IsNotEmpty()
  previousStatus: DebtorVerificationStatus;

  @IsEnum(DebtorVerificationStatus)
  @IsNotEmpty()
  newStatus: DebtorVerificationStatus;

  @IsISO8601()
  @IsNotEmpty()
  statusChangedAt: string;

  @IsString()
  @IsOptional()
  verificationSource?: string | undefined;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @IsEnum(DebtorVerificationStatus)
  @IsNotEmpty()
  verificationStatus: DebtorVerificationStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
