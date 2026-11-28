import { IsString, IsNumber, IsNotEmpty, IsUUID, IsOptional, IsEnum, IsISO8601 } from 'class-validator';
import type { DebtCreatedPayload } from '@verichron/events';
import { DebtStatus } from '@verichron/enums/dist';

export class DebtCreatedDto implements DebtCreatedPayload {

  @IsString()
  @IsOptional()
  debtorIdentityId?: string | undefined;

  @IsString()
  @IsNotEmpty()
  debtorProfileId: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsEnum(DebtStatus)
  @IsNotEmpty()
  status: DebtStatus;

  @IsISO8601()
  @IsNotEmpty()
  createdAt: string;
  
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @IsUUID()
  @IsNotEmpty()
  debtId: string;

  @IsString()
  @IsNotEmpty()
  originalCreditor: string;

  @IsNumber()
  @IsNotEmpty()
  originalAmount: number;

  @IsNumber()
  @IsNotEmpty()
  currentBalance: number;
}
