// query-verification-requests.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IQueryVerificationRequests
} from '@verichron/contracts';
import { VerificationType, VerificationRequestStatus, SortOrder } from '@verichron/enums/dist';

/**
 * DTO for querying and filtering verification requests
 */
export class QueryVerificationRequestsDto implements IQueryVerificationRequests {
  @ApiPropertyOptional({
    description: 'Filter by verification type',
    example: VerificationType.ADDRESS_VERIFICATION,
    enum: VerificationType, enumName: 'VerificationType',
  })
  @IsEnum(VerificationType)
  @IsOptional()
  verificationType?: VerificationType;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: VerificationRequestStatus.VERIFIED,
    enum: VerificationRequestStatus, enumName: 'VerificationRequestStatus',
  })
  @IsEnum(VerificationRequestStatus)
  @IsOptional()
  status?: VerificationRequestStatus;

  @ApiPropertyOptional({
    description: 'Filter verifications requested after this date',
    example: '2024-01-01',
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  requestedAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter verifications requested before this date',
    example: '2024-12-31',
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  requestedBefore?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['requestedAt', 'completedAt', 'status', 'verificationType'],
    example: 'requestedAt',
    default: 'requestedAt',
  })
  @IsEnum(['requestedAt', 'completedAt', 'status', 'verificationType'])
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: SortOrder,
    enumName: 'SortOrder',
    example: SortOrder.DESC,
    default: SortOrder.DESC,
  })
  @IsEnum(SortOrder)
  @IsOptional()
  sortDirection?: SortOrder;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 20;
}

