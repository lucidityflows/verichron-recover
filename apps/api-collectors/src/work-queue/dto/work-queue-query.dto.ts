import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  WorkQueuePriority,
  WorkQueueItemStatus,
  WorkQueueSortBy,
  SortOrder,
} from '@verichron/enums';
import { IWorkQueueQuery } from '@verichron/contracts';

/**
 * DTO for querying work queue items
 *
 * Supports filtering, sorting, and pagination for collector work queues.
 * All filters are optional and combine with AND logic.
 */
export class WorkQueueQueryDto implements IWorkQueueQuery {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Filter by assigned user ID (for managers viewing team queues)',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @ApiPropertyOptional({
    description: 'Filter by priority level',
    enum: WorkQueuePriority,
    enumName: 'WorkQueuePriority',
    example: WorkQueuePriority.HIGH,
  })
  @IsOptional()
  @IsEnum(WorkQueuePriority)
  priority?: WorkQueuePriority;

  @ApiPropertyOptional({
    description: 'Filter by work item status',
    enum: WorkQueueItemStatus,
    enumName: 'WorkQueueItemStatus',
    example: WorkQueueItemStatus.NEW,
  })
  @IsOptional()
  @IsEnum(WorkQueueItemStatus)
  status?: WorkQueueItemStatus;

  @ApiPropertyOptional({
    description: 'Search query for debtor name or account number',
    example: 'John Smith',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  searchQuery?: string;

  @ApiPropertyOptional({
    description: 'Minimum balance filter (inclusive)',
    example: 1000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minBalance?: number;

  @ApiPropertyOptional({
    description: 'Maximum balance filter (inclusive)',
    example: 50000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxBalance?: number;

  @ApiPropertyOptional({
    description: 'Minimum days overdue filter (inclusive)',
    example: 30,
    type: 'integer',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minDaysOverdue?: number;

  @ApiPropertyOptional({
    description: 'Filter by tags (OR logic - items with any of these tags)',
    example: ['high-value', 'responsive'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: WorkQueueSortBy,
    enumName: 'WorkQueueSortBy',
    example: WorkQueueSortBy.PRIORITY_SCORE,
    default: WorkQueueSortBy.PRIORITY_SCORE,
  })
  @IsOptional()
  @IsEnum(WorkQueueSortBy)
  sortBy?: WorkQueueSortBy;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    enumName: 'SortOrder',
    example: SortOrder.DESC,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
