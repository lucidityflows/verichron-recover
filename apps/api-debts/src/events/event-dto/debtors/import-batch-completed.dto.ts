import { ImportBatchCompletedPayload, DebtorMapping, DebtorProcessingError } from '@verichron/events';
import { IsUUID, IsNumber, IsArray, IsDateString, ValidateNested, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class DebtorMappingDto implements DebtorMapping {
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

class DebtorProcessingErrorDto implements DebtorProcessingError {
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

export class ImportBatchCompletedDto implements ImportBatchCompletedPayload {
  @IsUUID()
  importJobId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  portfolioId: string;

  @IsNumber()
  batchNumber: number;

  @IsNumber()
  totalProcessed: number;

  @IsNumber()
  successCount: number;

  @IsNumber()
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
