import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsString, IsBoolean, IsOptional, IsObject, MaxLength, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '@verichron/enums';

/**
 * Response DTO for notification
 */
export class NotificationResponseDto {
  @ApiProperty({
    description: 'Unique notification identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  organizationId: string;

  @ApiProperty({
    description: 'User ID this notification is for',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  userId: string;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.WORK_ITEM_ASSIGNED,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Work Item Assigned',
  })
  title: string;

  @ApiProperty({
    description: 'Notification message body',
    example: 'You have been assigned a high-priority account: John Smith ($5,432.10)',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Link to navigate to when notification is clicked',
    example: '/work-queue/a1b2c3d4-e5f6-4789-a012-3456789abcde',
  })
  actionLink?: string;

  @ApiProperty({
    description: 'Whether notification has been read',
    example: false,
  })
  isRead: boolean;

  @ApiPropertyOptional({
    description: 'When notification was read',
    example: '2024-12-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  readAt?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for this notification',
    example: { workQueueItemId: 'abc123', debtorName: 'John Smith' },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Timestamp when notification was created',
    example: '2024-12-15T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: string;
}

/**
 * Query DTO for fetching notifications
 */
export class GetNotificationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by read status',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by notification type',
    enum: NotificationType,
    example: NotificationType.WORK_ITEM_ASSIGNED,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'Maximum number of notifications to return',
    example: 50,
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Number of notifications to skip (for pagination)',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * DTO for marking notification as read
 */
export class MarkNotificationReadDto {
  @ApiProperty({
    description: 'Whether to mark as read or unread',
    example: true,
  })
  @IsBoolean()
  isRead: boolean;
}

/**
 * DTO for creating a notification (internal use)
 */
export class CreateNotificationDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: 'User ID to send notification to',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.WORK_ITEM_ASSIGNED,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Work Item Assigned',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Notification message body',
    example: 'You have been assigned a high-priority account',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({
    description: 'Link to navigate to when notification is clicked',
    example: '/work-queue/a1b2c3d4-e5f6-4789-a012-3456789abcde',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionLink?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for this notification',
    example: { workQueueItemId: 'abc123', debtorName: 'John Smith' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Response DTO for notification summary
 */
export class NotificationSummaryDto {
  @ApiProperty({
    description: 'Total number of unread notifications',
    example: 5,
  })
  unreadCount: number;

  @ApiProperty({
    description: 'Total number of notifications',
    example: 25,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Most recent notifications',
    type: [NotificationResponseDto],
  })
  recentNotifications: NotificationResponseDto[];
}
