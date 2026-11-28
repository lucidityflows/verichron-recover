import { IsUUID, IsInt, IsArray, ValidateNested, IsDateString, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PortfolioDebtorBatchReadyPayload, DebtorData } from '@verichron/events';

/**
 * DTO for debtor data within batch event
 */
export class DebtorDataDto implements DebtorData {
  @IsString()
  debtorId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  debtIds: string[];

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  ssn?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}

/**
 * Event DTO for PortfolioDebtorBatchReady event
 *
 * Consumed from api-debts when a batch of debtors is ready for processing
 * during portfolio import. Implements PortfolioDebtorBatchReadyPayload from
 * @verichron/events for type safety.
 */
export class PortfolioDebtorBatchReadyDto implements PortfolioDebtorBatchReadyPayload {
  @IsUUID()
  importJobId: string;

  @IsUUID()
  portfolioId: string;

  @IsUUID()
  organizationId: string;

  @IsInt()
  @Min(1)
  batchNumber: number;

  @IsInt()
  @Min(1)
  totalBatches: number;

  @IsInt()
  @Min(0)
  debtorCount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtorDataDto)
  debtors: DebtorDataDto[];

  @IsDateString()
  publishedAt: string;
}
