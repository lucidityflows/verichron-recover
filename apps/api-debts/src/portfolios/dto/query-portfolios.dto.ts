import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PortfolioStatus } from '@verichron/enums';
import { IQueryPortfolios } from '@verichron/contracts';

enum PortfolioSortField {
  CREATED_AT = 'created_at',
  PURCHASE_DATE = 'purchase_date',
  PURCHASE_PRICE = 'purchase_price',
  NAME = 'name',
}

enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * DTO for querying and filtering portfolios with pagination and sorting.
 *
 * All filters are optional and can be combined for complex queries.
 *
 * Security:
 * - Results are automatically scoped to the user's organization
 *
 * Performance:
 * - Pagination is enforced (default: 20 per page, max: 100)
 * - Indexes exist on commonly filtered fields
 */
export class QueryPortfoliosDto implements IQueryPortfolios {
  // ==================== Pagination ====================

  @ApiPropertyOptional({
    description: 'Page number for pagination (1-indexed)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'page must be a number' })
  @Min(1, { message: 'page must be at least 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber({}, { message: 'pageSize must be a number' })
  @Min(1, { message: 'pageSize must be at least 1' })
  @Max(100, { message: 'pageSize cannot exceed 100' })
  @Type(() => Number)
  pageSize?: number = 20;

  // ==================== Sorting ====================

  @ApiPropertyOptional({
    description: 'Field to sort results by',
    enum: PortfolioSortField, enumName: 'PortfolioSortField',
    example: PortfolioSortField.CREATED_AT,
    default: PortfolioSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(PortfolioSortField, { message: 'orderBy must be a valid sortable field' })
  orderBy?: PortfolioSortField = PortfolioSortField.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort order (ascending or descending)',
    enum: SortOrder, enumName: 'SortOrder',
    example: SortOrder.DESC,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'order must be ASC or DESC' })
  order?: SortOrder = SortOrder.DESC;

  // ==================== Filters ====================

  @ApiPropertyOptional({
    description: 'Filter by portfolio status. Can specify multiple statuses.',
    enum: PortfolioStatus, enumName: 'PortfolioStatus',
    example: PortfolioStatus.ACTIVE,
    isArray: true,
  })
  @IsOptional()
  @IsEnum(PortfolioStatus, { each: true, message: 'status must be a valid PortfolioStatus value' })
  status?: PortfolioStatus | PortfolioStatus[];

  @ApiPropertyOptional({
    description: 'Filter by minimum purchase price (inclusive)',
    example: 100000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'minPurchasePrice must be a number' })
  @Min(0, { message: 'minPurchasePrice cannot be negative' })
  @Type(() => Number)
  minPurchasePrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum purchase price (inclusive)',
    example: 500000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'maxPurchasePrice must be a number' })
  @Min(0, { message: 'maxPurchasePrice cannot be negative' })
  @Type(() => Number)
  maxPurchasePrice?: number;

  @ApiPropertyOptional({
    description: 'Search term for portfolio name or source (case-insensitive partial match)',
    example: 'First National',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  search?: string;
}
