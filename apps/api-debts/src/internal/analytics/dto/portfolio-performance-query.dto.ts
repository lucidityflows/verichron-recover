import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsISO8601,
  IsUUID,
  IsEnum,
  IsArray,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DebtCategory, DebtStatus, PortfolioSortField, SortOrder } from '@verichron/enums';

/**
 * Query DTO for portfolio performance internal endpoint
 * Used by event orchestrator to fetch debt/portfolio data
 */
export class PortfolioPerformanceInternalQueryDto {
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
  })
  @IsOptional()
  @IsEnum(DebtCategory)
  debtCategory?: DebtCategory;

  @ApiPropertyOptional({
    description: 'Filter by debt status',
    enum: DebtStatus,
    enumName: 'DebtStatus',
  })
  @IsOptional()
  @IsEnum(DebtStatus)
  debtStatus?: DebtStatus;

  @ApiPropertyOptional({
    description: 'Field to sort results by',
    enum: PortfolioSortField,
    enumName: 'PortfolioSortField',
    default: PortfolioSortField.RECOVERY_RATE,
  })
  @IsOptional()
  @IsEnum(PortfolioSortField)
  sortBy?: PortfolioSortField;

  @ApiPropertyOptional({
    description: 'Sort order (ascending or descending)',
    enum: SortOrder,
    enumName: 'SortOrder',
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
