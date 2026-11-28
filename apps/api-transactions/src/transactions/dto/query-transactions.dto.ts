import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus, PaymentType, SortOrder } from '@verichron/enums';
import { IQueryTransactions } from '@verichron/contracts';

/**
 * Query Transactions DTO
 *
 * Query parameters for listing and filtering transactions.
 * Supports pagination, sorting, and filtering by various criteria.
 */
export class QueryTransactionsDto implements IQueryTransactions {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    type: 'integer',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 20,
    type: 'integer',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize must be an integer' })
  @Min(1, { message: 'pageSize must be at least 1' })
  @Max(100, { message: 'pageSize must not exceed 100' })
  pageSize: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'updatedAt', 'amount', 'status'],
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'amount', 'status'], {
    message: 'sortBy must be one of: createdAt, updatedAt, amount, status',
  })
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    enumName: 'SortOrder',
    example: SortOrder.DESC,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: 'sortOrder must be either ASC or DESC',
  })
  sortOrder: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Filter by debt UUID',
    example: '789e0123-e89b-12d3-a456-426614174999',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'debtId must be a valid UUID' })
  debtId?: string;

  @ApiPropertyOptional({
    description: 'Filter by debtor UUID',
    example: '321e6543-e89b-12d3-a456-426614174777',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'debtorId must be a valid UUID' })
  debtorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment plan UUID',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'paymentPlanId must be a valid UUID' })
  paymentPlanId?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction status',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCEEDED,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: 'status must be a valid TransactionStatus',
  })
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    enum: PaymentType,
    example: PaymentType.PAYMENT,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentType, {
    message: 'type must be a valid TransactionType',
  })
  type?: PaymentType;

  @ApiPropertyOptional({
    description: 'Filter by transactions created on or after this date',
    example: '2024-01-01',
    type: 'string',
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be a valid ISO 8601 date' })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by transactions created on or before this date',
    example: '2024-12-31',
    type: 'string',
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be a valid ISO 8601 date' })
  dateTo?: string;
}
