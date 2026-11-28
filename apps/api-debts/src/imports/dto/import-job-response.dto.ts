import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ImportJob } from '../entities/import-job.entity';
import { IQueryImports, IImportJobResponse, IPaginatedImportJobResponse, IPaginationMeta } from '@verichron/contracts';
import { ImportJobStatus } from '@verichron/enums';

/**
 * DTO for querying import jobs with filters and pagination.
 */
export class QueryImportsDto implements IQueryImports {
  @ApiPropertyOptional({
    description: 'Filter by import job status',
    enum: ImportJobStatus, enumName: 'ImportJobStatus',
    example: ImportJobStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(ImportJobStatus, { message: 'status must be a valid ImportJobStatus' })
  status?: ImportJobStatus;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize must be an integer' })
  @Min(1, { message: 'pageSize must be at least 1' })
  @Max(100, { message: 'pageSize cannot exceed 100' })
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Sort order by creation date',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'order must be ASC or DESC' })
  order?: 'ASC' | 'DESC';
}

/**
 * DTO for import job response data.
 */
export class ImportJobResponseDto implements IImportJobResponse {
  @ApiProperty({
    description: 'Unique import job identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Organization that owns this import job',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Name of the portfolio being created',
    example: 'Q1 2024 Credit Card Purchase - First National Bank',
  })
  portfolioName: string;

  @ApiProperty({
    description: 'Current processing status',
    enum: ImportJobStatus, enumName: 'ImportJobStatus',
    example: ImportJobStatus.PROCESSING,
  })
  status: ImportJobStatus;

  @ApiPropertyOptional({
    description: 'Total number of rows in CSV (null if not yet parsed)',
    example: 1250,
    nullable: true,
  })
  totalRows: number | null;

  @ApiProperty({
    description: 'Number of rows processed so far',
    example: 850,
  })
  processedRows: number;

  @ApiPropertyOptional({
    description: 'Progress percentage (0-100, null if totalRows is null)',
    example: 68,
    minimum: 0,
    maximum: 100,
    nullable: true,
  })
  progressPercentage: number | null;

  @ApiPropertyOptional({
    description: 'Error message if import failed',
    example:
      'Validation failed at row 42: principalAmount must be greater than 0',
    nullable: true,
  })
  errorMessage: string | null;

  @ApiPropertyOptional({
    description: 'Portfolio ID if successfully created',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
    nullable: true,
  })
  portfolioId: string | null;

  @ApiProperty({
    description: 'Timestamp when import job was created',
    example: '2024-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when import job was last updated',
    example: '2024-01-15T10:35:00.000Z',
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Factory method to create DTO from entity.
   */
  static fromEntity(importJob: ImportJob): ImportJobResponseDto {
    const dto = new ImportJobResponseDto();
    dto.id = importJob.id;
    dto.organizationId = importJob.organizationId;
    dto.portfolioName = importJob.portfolioName;
    dto.status = importJob.status;
    dto.totalRows = importJob.totalRows;
    dto.processedRows = importJob.processedRows;
    dto.progressPercentage =
      importJob.totalRows && importJob.totalRows > 0
        ? Math.round((importJob.processedRows / importJob.totalRows) * 100)
        : null;
    dto.errorMessage = importJob.errorMessage;
    dto.portfolioId = importJob.portfolioId;
    dto.createdAt = importJob.createdAt.toISOString();
    dto.updatedAt = importJob.updatedAt.toISOString();
    return dto;
  }
}

/**
 * Pagination metadata for import job lists.
 */
export class PaginationMeta implements IPaginationMeta {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;
}

/**
 * DTO for paginated import job list response.
 */
export class PaginatedImportJobResponseDto implements IPaginatedImportJobResponse {
  @ApiProperty({
    description: 'Array of import jobs for current page',
    type: [ImportJobResponseDto],
  })
  data: ImportJobResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
