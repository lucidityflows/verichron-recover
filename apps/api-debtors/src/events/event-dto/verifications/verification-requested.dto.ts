import { IsDateString, IsEnum, IsNotEmpty, IsObject, IsString, IsUUID } from 'class-validator';
import { VerificationRequestedPayload } from '@verichron/events';
import { VerificationType } from '@verichron/enums';

export class VerificationRequestedDto implements VerificationRequestedPayload {
  @IsUUID()
  verificationId: string;

  @IsUUID()
  debtorId: string;

  @IsUUID()
  debtorProfileId: string;

  @IsUUID()
  organizationId: string;

  @IsEnum(VerificationType)
  verificationType: VerificationType;

  @IsObject()
  inputData: Record<string, any>;

  @IsDateString()
  requestedAt: string;

  @IsString()
  @IsNotEmpty()
  requestedBy: string;
}
