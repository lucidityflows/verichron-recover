import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DebtStatus, DebtSortField, SortOrder } from '@verichron/enums';
import { IQueryDebts } from '@verichron/contracts';




/**
 * DTO for querying and filtering debts with pagination and sorting.
 * 
 * All filters are optional and can be combined for complex queries.
 * 
 * Security:
 * - Results are automatically scoped to the user's organization via organizationId
 * - Layer 2 authorization filters to only portfolios the user has access to
 * 
 * Performance:
 * - Pagination is enforced (default: 20 per page, max: 100)
 * - Indexes exist on commonly filtered fields (status, portfolioId, organizationId)
 * - Consider adding indexes if new filter fields are added
 * 
 * Example Query:
 * ```
 * GET /debts?status=IN_COLLECTION&portfolioId=abc-123&minBalance=1000&page=2&pageSize=50&orderBy=current_balance&order=DESC
 * ```
 */
export class QueryDebtsDto implements IQueryDebts {
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
    enum: DebtSortField, enumName: 'DebtSortField',
    example: DebtSortField.CREATED_AT,
    default: DebtSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(DebtSortField, { message: 'orderBy must be a valid sortable field' })
  orderBy?: DebtSortField = DebtSortField.CREATED_AT;

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
    description: 'Filter by debt status. Can specify multiple statuses separated by commas.',
    enum: DebtStatus, enumName: 'DebtStatus',
    example: DebtStatus.IN_COLLECTION,
    isArray: true,
  })
  @IsOptional()
  @IsEnum(DebtStatus, { each: true, message: 'status must be a valid DebtStatus value' })
  status?: DebtStatus | DebtStatus[];

  @ApiPropertyOptional({
    description: 'Filter by portfolio ID. Returns only debts in the specified portfolio.',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'portfolioId must be a valid UUID' })
  portfolioId?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum current balance (inclusive)',
    example: 1000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'minBalance must be a number' })
  @Min(0, { message: 'minBalance cannot be negative' })
  @Type(() => Number)
  minBalance?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum current balance (inclusive)',
    example: 10000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'maxBalance must be a number' })
  @Min(0, { message: 'maxBalance cannot be negative' })
  @Type(() => Number)
  maxBalance?: number;

  @ApiPropertyOptional({
    description: 'Search term for account number or original creditor name (case-insensitive partial match)',
    example: 'ACC-2024',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by debtor profile ID. Returns debts associated with the specified debtor profile.',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'debtorProfileId must be a valid UUID' })
  debtorProfileId?: string;
}