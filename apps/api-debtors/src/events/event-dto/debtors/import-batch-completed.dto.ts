import { IsDateString, IsInt, IsUUID, Min, IsArray, ValidateNested, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ImportBatchCompletedPayload, DebtorMapping, DebtorProcessingError } from '@verichron/events';

/**
 * DTO for debtor mapping
 */
export class DebtorMappingDto implements DebtorMapping {
  @IsString()
  debtorKey: string;

  @IsUUID()
  debtorIdentityId: string;

  @IsUUID()
  debtorProfileId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  debtIds: string[];

  @IsBoolean()
  isNewIdentity: boolean;

  @IsBoolean()
  isNewProfile: boolean;
}

/**
 * DTO for debtor processing error
 */
export class DebtorProcessingErrorDto implements DebtorProcessingError {
  @IsString()
  debtorKey: string;

  @IsString()
  error: string;

  @IsArray()
  @IsUUID('4', { each: true })
  debtIds: string[];

  @IsBoolean()
  willRetry: boolean;
}

/**
 * Event DTO for ImportBatchCompleted event
 *
 * Published when a batch of debtors from a portfolio import has been processed.
 * Implements ImportBatchCompletedPayload from @verichron/events for type safety.
 */
export class ImportBatchCompletedDto implements ImportBatchCompletedPayload {
  @IsUUID()
  importJobId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  portfolioId: string;

  @IsInt()
  @Min(0)
  batchNumber: number;

  @IsInt()
  @Min(0)
  totalProcessed: number;

  @IsInt()
  @Min(0)
  successCount: number;

  @IsInt()
  @Min(0)
  failureCount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtorMappingDto)
  debtorMappings: DebtorMappingDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtorProcessingErrorDto)
  errors: DebtorProcessingErrorDto[];

  @IsDateString()
  completedAt: string;
}
