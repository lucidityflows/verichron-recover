import { DebtUpdatedPayload } from '@verichron/events';
import { DebtStatus } from '@verichron/enums';
import { IsNotEmpty, IsUUID, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class DebtUpdatedDto implements DebtUpdatedPayload {
  @IsUUID()
  @IsNotEmpty()
  debtId: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  portfolioId: string;

  @IsString()
  @IsNotEmpty()
  updatedBy: string;

  @IsDateString()
  @IsNotEmpty()
  updatedAt: string;

  @IsOptional()
  @IsString()
  interestAmount?: string;

  @IsOptional()
  @IsString()
  feesAmount?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsEnum(DebtStatus)
  status?: DebtStatus;
}
