import { DebtUpdatedPayload } from '@verichron/events';
import { DebtStatus } from '@verichron/enums';
import { IsString, IsUUID, IsDateString, IsOptional, IsEnum } from 'class-validator';

export class DebtUpdatedDto implements DebtUpdatedPayload {
  @IsUUID()
  debtId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  portfolioId: string;

  @IsUUID()
  updatedBy: string;

  @IsDateString()
  updatedAt: string;

  @IsString()
  @IsOptional()
  interestAmount?: string;

  @IsString()
  @IsOptional()
  feesAmount?: string;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsEnum(DebtStatus)
  @IsOptional()
  status?: DebtStatus;
}
