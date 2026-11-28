import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for querying communication logs with filters and pagination
 *
 * Supports filtering by debtor, debt, status, type, and date range.
 */
export class QueryLogsDto {
  @ApiPropertyOptional({
    description: 'Filter by debtor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  debtorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by debt ID',
    example: '456fcdeb-51a2-43d7-b890-987654321xyz',
  })
  @IsUUID()
  @IsOptional()
  debtId?: string;

  @ApiPropertyOptional({
    description: 'Filter by communication status',
    example: 'DELIVERED',
    enum: ['SENDING', 'SENT', 'DELIVERED', 'FAILED', 'OPENED', 'CLICKED', 'BLOCKED'],
    enumName: 'CommunicationStatus',
  })
  @IsEnum(['SENDING', 'SENT', 'DELIVERED', 'FAILED', 'OPENED', 'CLICKED', 'BLOCKED'])
  @IsOptional()
  status?: 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'OPENED' | 'CLICKED' | 'BLOCKED';

  @ApiPropertyOptional({
    description: 'Filter by communication type',
    example: 'EMAIL',
    enum: ['EMAIL', 'SMS', 'LETTER', 'CALL'],
    enumName: 'CommunicationType',
  })
  @IsEnum(['EMAIL', 'SMS', 'LETTER', 'CALL'])
  @IsOptional()
  type?: 'EMAIL' | 'SMS' | 'LETTER' | 'CALL';

  @ApiPropertyOptional({
    description: 'Filter by gateway provider',
    example: 'sendgrid',
    enum: ['sendgrid', 'twilio', 'mock'],
  })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({
    description: 'Filter by template ID',
    example: '789fcdeb-51a2-43d7-b890-123456789xyz',
  })
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Filter by template name',
    example: 'payment-receipt',
  })
  @IsString()
  @IsOptional()
  templateName?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO 8601)',
    example: '2024-01-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'sentAt',
    enum: ['sentAt', 'deliveredAt', 'createdAt', 'status'],
    default: 'sentAt',
  })
  @IsEnum(['sentAt', 'deliveredAt', 'createdAt', 'status'])
  @IsOptional()
  sortBy?: 'sentAt' | 'deliveredAt' | 'createdAt' | 'status';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
