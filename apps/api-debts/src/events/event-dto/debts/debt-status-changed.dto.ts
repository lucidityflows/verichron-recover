import { DebtStatusChangedPayload } from '@verichron/events';
import { DebtStatus } from '@verichron/enums';
import { IsUUID, IsEnum, IsDateString, IsString, IsOptional } from 'class-validator';

export class DebtStatusChangedDto implements DebtStatusChangedPayload {
  @IsUUID()
  debtId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  portfolioId: string;

  @IsEnum(DebtStatus)
  oldStatus: DebtStatus;

  @IsEnum(DebtStatus)
  newStatus: DebtStatus;

  @IsUUID()
  updatedBy: string;

  @IsDateString()
  updatedAt: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
