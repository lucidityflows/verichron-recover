import { IsString, IsNotEmpty, IsUUID, IsEnum, IsISO8601, IsOptional } from 'class-validator';
import type { DebtStatusChangedPayload } from '@verichron/events';
import { DebtStatus } from '@verichron/enums';

export class DebtStatusChangedDto implements DebtStatusChangedPayload {

  @IsString()
  @IsNotEmpty()
  portfolioId: string;

  @IsString()
  @IsNotEmpty()
  updatedBy: string;

  @IsISO8601()
  @IsNotEmpty()
  updatedAt: string;

  @IsString()
  @IsOptional()
  reason?: string | undefined;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @IsUUID()
  @IsNotEmpty()
  debtId: string;

  @IsEnum(DebtStatus) // Assuming status is a string (e.g., 'PAID_IN_FULL', 'SETTLED', 'DISPUTED')
  @IsNotEmpty()
  newStatus: DebtStatus;

  @IsEnum(DebtStatus)
  @IsNotEmpty()
  oldStatus: DebtStatus;
}
