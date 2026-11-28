import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsISO8601,
  IsUUID,
  IsArray,
  IsString,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DebtCategory, DebtStatus } from '@verichron/enums';
import { IBaseAnalyticsFilters } from '@verichron/contracts';

/**
 * Base Analytics Filters DTO
 * Common filtering parameters used across all analytics endpoints
 * Supports comma-separated arrays for multi-value filters
 */
export class BaseAnalyticsFiltersDto implements IBaseAnalyticsFilters {
  @ApiPropertyOptional({
    description: 'Start date for time range filter (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for time range filter (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by single portfolio UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  portfolioId?: string;

  @ApiPropertyOptional({
    description: 'Filter by portfolio tags (comma-separated for multiple)',
    example: 'Q2-2024,Broker-Triton',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsString({ each: true })
  portfolioTag?: string[];

  @ApiPropertyOptional({
    description: 'Filter by debt category',
    enum: DebtCategory,
    enumName: 'DebtCategory',
    example: DebtCategory.MEDICAL,
  })
  @IsOptional()
  @IsEnum(DebtCategory)
  debtCategory?: DebtCategory;

  @ApiPropertyOptional({
    description: 'Filter by debt statuses (comma-separated for multiple)',
    enum: DebtStatus,
    enumName: 'DebtStatus',
    example: 'ACTIVE,SETTLED',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsEnum(DebtStatus, { each: true })
  debtStatus?: DebtStatus[];
}
