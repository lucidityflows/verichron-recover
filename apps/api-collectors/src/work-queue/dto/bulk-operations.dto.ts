import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsString,
  MaxLength,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { WorkQueuePriority } from '@verichron/enums';

/**
 * DTO for bulk assigning multiple work queue items to a collector
 */
export class BulkAssignDto {
  @ApiProperty({
    description: 'Array of work queue item IDs to assign',
    example: [
      'a1b2c3d4-e5f6-4789-a012-3456789abcde',
      'b2c3d4e5-f6a7-5890-b123-4567890bcdef',
    ],
    type: [String],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  workQueueItemIds: string[];

  @ApiProperty({
    description: 'User ID of the collector to assign all items to',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
  })
  @IsUUID()
  collectorUserId: string;

  @ApiPropertyOptional({
    description: 'Optional reason for bulk assignment',
    example: 'Balancing workload across team',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * DTO for bulk deferring multiple work queue items to a future date
 */
export class BulkDeferDto {
  @ApiProperty({
    description: 'Array of work queue item IDs to defer',
    example: [
      'a1b2c3d4-e5f6-4789-a012-3456789abcde',
      'b2c3d4e5-f6a7-5890-b123-4567890bcdef',
    ],
    type: [String],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  workQueueItemIds: string[];

  @ApiProperty({
    description: 'Date to defer items until (ISO 8601 format)',
    example: '2025-12-25T09:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @IsDateString()
  deferUntil: string;

  @ApiPropertyOptional({
    description: 'Optional reason for deferring',
    example: 'Awaiting additional documentation',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * DTO for bulk updating priority of multiple work queue items
 */
export class BulkUpdatePriorityDto {
  @ApiProperty({
    description: 'Array of work queue item IDs to update',
    example: [
      'a1b2c3d4-e5f6-4789-a012-3456789abcde',
      'b2c3d4e5-f6a7-5890-b123-4567890bcdef',
    ],
    type: [String],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  workQueueItemIds: string[];

  @ApiProperty({
    description: 'New priority level for all items',
    enum: WorkQueuePriority,
    enumName: 'WorkQueuePriority',
    example: WorkQueuePriority.HIGH,
  })
  @IsEnum(WorkQueuePriority)
  priority: WorkQueuePriority;

  @ApiPropertyOptional({
    description: 'Optional reason for priority change',
    example: 'High-value accounts requiring immediate attention',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Result for a single item in a bulk operation
 */
export class BulkOperationItemResult {
  @ApiProperty({
    description: 'Work queue item ID',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  workQueueItemId: string;

  @ApiProperty({
    description: 'Whether the operation succeeded for this item',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Error message if operation failed',
    example: 'Item not found',
  })
  error?: string;
}

/**
 * Response DTO for bulk operations
 */
export class BulkOperationResponseDto {
  @ApiProperty({
    description: 'Total number of items in the operation',
    example: 10,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Number of items successfully processed',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of items that failed',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Detailed results for each item',
    type: [BulkOperationItemResult],
  })
  results: BulkOperationItemResult[];

  @ApiProperty({
    description: 'Overall operation status message',
    example: 'Bulk assignment completed: 8 succeeded, 2 failed',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp when the operation completed',
    example: '2025-12-18T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  completedAt: string;
}
