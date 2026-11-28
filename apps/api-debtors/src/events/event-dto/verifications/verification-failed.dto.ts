import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { VerificationFailedPayload } from '@verichron/events';
import { VerificationType } from '@verichron/enums';

export class VerificationFailedDto implements VerificationFailedPayload {
  @IsUUID()
  verificationId: string;

  @IsUUID()
  debtorId: string;

  @IsUUID()
  organizationId: string;

  @IsEnum(VerificationType)
  verificationType: VerificationType;

  @IsString()
  @IsNotEmpty()
  errorMessage: string;

  @IsOptional()
  @IsString()
  errorCode?: string;

  @IsInt()
  @Min(0)
  retryCount: number;

  @IsDateString()
  @IsNotEmpty()
  failedAt: string;
}
