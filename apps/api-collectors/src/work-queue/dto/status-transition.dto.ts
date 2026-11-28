import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { WorkQueueItemStatus, ResolutionType } from '@verichron/enums';

/**
 * DTO for manually completing a work queue item
 */
export class CompleteWorkQueueItemDto {
  @ApiProperty({
    description: 'Resolution type for completed item',
    enum: ResolutionType,
    enumName: 'ResolutionType',
    example: ResolutionType.PAYMENT_PLAN,
  })
  @IsEnum(ResolutionType)
  resolutionType: ResolutionType;

  @ApiPropertyOptional({
    description: 'Optional notes about the resolution',
    example: 'Debtor agreed to $200/month payment plan starting next week',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/**
 * DTO for deferring a single work queue item
 */
export class DeferWorkQueueItemDto {
  @ApiProperty({
    description: 'Date to defer item until (ISO 8601 format)',
    example: '2025-12-25T09:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @IsDateString()
  deferUntil: string;

  @ApiPropertyOptional({
    description: 'Optional reason for deferring',
    example: 'Awaiting additional documentation from debtor',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * DTO for generic status update
 */
export class UpdateStatusDto {
  @ApiProperty({
    description: 'New status for the work queue item',
    enum: WorkQueueItemStatus,
    enumName: 'WorkQueueItemStatus',
    example: WorkQueueItemStatus.ON_HOLD,
  })
  @IsEnum(WorkQueueItemStatus)
  status: WorkQueueItemStatus;

  @ApiPropertyOptional({
    description: 'Optional reason for status change',
    example: 'Debtor requested temporary hold during hardship period',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Optional date for follow-up (required for FOLLOW_UP_SCHEDULED status)',
    example: '2025-12-20T09:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({
    description: 'Optional defer until date (required for DEFERRED status)',
    example: '2025-12-25T09:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  deferUntil?: string;
}

/**
 * Response DTO for status transition operations
 */
export class StatusTransitionResponseDto {
  @ApiProperty({
    description: 'Whether the status transition was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Work queue item ID',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  workQueueItemId: string;

  @ApiProperty({
    description: 'Previous status',
    enum: WorkQueueItemStatus,
    example: WorkQueueItemStatus.IN_PROGRESS,
  })
  previousStatus: WorkQueueItemStatus;

  @ApiProperty({
    description: 'New status',
    enum: WorkQueueItemStatus,
    example: WorkQueueItemStatus.COMPLETED,
  })
  newStatus: WorkQueueItemStatus;

  @ApiPropertyOptional({
    description: 'Resolution type (for COMPLETED status)',
    enum: ResolutionType,
    example: ResolutionType.PAYMENT_PLAN,
  })
  resolutionType?: ResolutionType;

  @ApiProperty({
    description: 'Timestamp when the status transition occurred',
    example: '2025-12-18T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  transitionedAt: string;

  @ApiProperty({
    description: 'Message describing the status transition result',
    example: 'Work queue item successfully completed with resolution type: PAYMENT_PLAN',
  })
  message: string;
}
