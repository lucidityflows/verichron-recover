import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsBoolean, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { IQueryDocuments } from '@verichron/contracts';
import { DebtorDocumentType, SortOrder } from '@verichron/enums';

/**
 * DTO for querying documents with filters and pagination
 */
export class QueryDocumentsDto implements IQueryDocuments {
  @ApiPropertyOptional({
    description: 'Filter by document type',
    example: DebtorDocumentType.PROOF_OF_ADDRESS,
    enum: DebtorDocumentType, enumName: 'DebtorDocumentType',
  })
  @IsOptional()
  @IsEnum(DebtorDocumentType)
  documentType?: DebtorDocumentType;

  @ApiPropertyOptional({
    description: 'Filter by verification status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by archived status',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isArchived?: boolean;

  @ApiPropertyOptional({
    description: 'Search by tag',
    example: 'verified',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Include archived documents',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by upload date (after this date)',
    example: '2024-01-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  uploadedAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter by upload date (before this date)',
    example: '2024-12-31',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  uploadedBefore?: string;

  @ApiPropertyOptional({
    description: 'Filter by expiration date (after this date)',
    example: '2024-01-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  expiresAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter by expiration date (before this date)',
    example: '2024-12-31',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  expiresBefore?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: ['createdAt', 'uploadedAt', 'originalFilename', 'fileSize'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'uploadedAt', 'originalFilename', 'fileSize'])
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    example: SortOrder.DESC,
    enum: SortOrder,
    enumName: 'SortOrder',
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortDirection?: SortOrder;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number = 20;
}
