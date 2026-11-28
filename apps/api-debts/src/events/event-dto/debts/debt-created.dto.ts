import { DebtCreatedPayload } from '@verichron/events';
import { IsString, IsUUID, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class DebtCreatedDto implements DebtCreatedPayload {
  @IsUUID()
  debtId: string;

  @IsOptional()
  @IsUUID()
  debtorIdentityId?: string; // Optional - may not be known for manual debt creation

  @IsUUID()
  debtorProfileId: string;

  @IsUUID()
  organizationId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  status: string;

  @IsDateString()
  createdAt: string;
}
