import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for manually assigning a work queue item to a collector
 */
export class AssignWorkQueueItemDto {
  @ApiProperty({
    description: 'User ID of the collector to assign to',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
  })
  @IsUUID()
  collectorUserId: string;

  @ApiPropertyOptional({
    description: 'Optional reason for manual assignment',
    example: 'Collector has expertise in medical debt',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * DTO for reassigning a work queue item to a different collector
 */
export class ReassignWorkQueueItemDto {
  @ApiProperty({
    description: 'User ID of the new collector to reassign to',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @IsUUID()
  newCollectorUserId: string;

  @ApiPropertyOptional({
    description: 'Optional reason for reassignment',
    example: 'Workload balancing - previous collector over capacity',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Response DTO for assignment operations
 */
export class AssignmentResponseDto {
  @ApiProperty({
    description: 'Whether the assignment was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Work queue item ID that was assigned',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  workQueueItemId: string;

  @ApiProperty({
    description: 'Collector user ID who was assigned',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
  })
  assignedToUserId: string;

  @ApiPropertyOptional({
    description: 'Previous collector user ID (for reassignments)',
    example: '6b8d5568-6314-30cd-833a-c06ec2e80ad6',
    format: 'uuid',
  })
  previousCollectorUserId?: string;

  @ApiProperty({
    description: 'Timestamp when the assignment occurred',
    example: '2025-12-17T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  assignedAt: string;

  @ApiProperty({
    description: 'Message describing the assignment result',
    example: 'Work queue item successfully assigned to collector',
  })
  message: string;
}
