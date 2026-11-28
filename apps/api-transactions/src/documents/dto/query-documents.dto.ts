import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  IsUUID,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType, SortOrder } from '@verichron/enums';
import { IQueryTransactionDocuments } from '@verichron/contracts';

/**
 * Query Documents DTO
 *
 * Query parameters for listing and filtering documents.
 * All filters are optional and combined with AND logic.
 */
export class QueryDocumentsDto implements IQueryTransactionDocuments {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt({ message: 'pageSize must be an integer' })
  @Min(1, { message: 'pageSize must be at least 1' })
  @Max(100, { message: 'pageSize must not exceed 100' })
  @Type(() => Number)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by debtor ID',
    example: '321e6543-e89b-12d3-a456-426614174777',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'debtorId must be a valid UUID' })
  debtorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by document type',
    enum: DocumentType,
    enumName: 'DocumentType',
    example: DocumentType.PAYMENT_RECEIPT,
  })
  @IsOptional()
  @IsEnum(DocumentType, {
    message: 'documentType must be a valid DocumentType',
  })
  documentType?: DocumentType;

  @ApiPropertyOptional({
    description: 'Filter by associated payment plan ID',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'associatedPlanId must be a valid UUID' })
  associatedPlanId?: string;

  @ApiPropertyOptional({
    description: 'Filter by associated transaction ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'associatedTransactionId must be a valid UUID' })
  associatedTransactionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by associated debt ID',
    example: '789e0123-e89b-12d3-a456-426614174999',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'associatedDebtId must be a valid UUID' })
  associatedDebtId?: string;

  @ApiPropertyOptional({
    description: 'Filter by documents created on or after this date',
    example: '2024-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be a valid ISO 8601 date' })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by documents created on or before this date',
    example: '2024-12-31T23:59:59.999Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be a valid ISO 8601 date' })
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    default: 'createdAt',
    enum: ['createdAt', 'documentType', 'title'],
  })
  @IsOptional()
  @IsIn(['createdAt', 'documentType', 'title'], {
    message: 'sortBy must be one of: createdAt, documentType, title',
  })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: SortOrder.DESC,
    default: SortOrder.DESC,
    enum: SortOrder,
    enumName: 'SortOrder',
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'sortOrder must be ASC or DESC' })
  sortOrder?: SortOrder = SortOrder.DESC;
}