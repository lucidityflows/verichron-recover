import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { VerificationCompletedPayload } from '@verichron/events';
import { VerificationType } from '@verichron/enums';

export class VerificationCompletedDto implements VerificationCompletedPayload {
  @IsUUID()
  verificationId: string;

  @IsUUID()
  debtorId: string;

  @IsUUID()
  organizationId: string;

  @IsEnum(VerificationType)
  verificationType: VerificationType;

  @IsBoolean()
  verified: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @IsInt()
  confidenceScore?: number;

  @IsObject()
  result: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @IsInt()
  costCents?: number;

  @IsDateString()
  @IsNotEmpty()
  completedAt: string;
}
