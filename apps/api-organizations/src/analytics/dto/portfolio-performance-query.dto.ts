import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PortfolioSortField, SortOrder } from '@verichron/enums';
import { IPortfolioPerformanceQuery } from '@verichron/contracts';
import { BaseAnalyticsFiltersDto } from './base-analytics-filters.dto';

/**
 * Portfolio Performance Query DTO
 * Extends base filters with pagination and sorting options
 */
export class PortfolioPerformanceQueryDto
  extends BaseAnalyticsFiltersDto
  implements IPortfolioPerformanceQuery
{
  @ApiPropertyOptional({
    description: 'Sort field for portfolio ranking',
    enum: PortfolioSortField,
    enumName: 'PortfolioSortField',
    default: PortfolioSortField.RECOVERY_RATE,
    example: PortfolioSortField.RECOVERY_RATE,
  })
  @IsOptional()
  @IsEnum(PortfolioSortField)
  sortBy?: PortfolioSortField;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    enumName: 'SortOrder',
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of portfolios per page',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number;
}
