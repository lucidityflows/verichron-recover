import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@verichron/enums';

/**
 * Notification Entity
 *
 * Stores notifications for collectors about important events and updates.
 * Supports polling-based retrieval and can be upgraded to WebSocket/SSE push.
 *
 * Key Design Principles:
 * - One notification per event per user
 * - Read/unread tracking for badge counts
 * - Automatic expiration after 30 days
 * - Metadata field for event-specific context
 *
 * Authorization:
 * - Users can only read their own notifications
 * - System creates notifications automatically via event listeners
 */
@Entity({ name: 'notifications' })
@Index(['organizationId', 'userId', 'isRead'])
@Index(['organizationId', 'userId', 'createdAt'])
export class Notification {
  @ApiProperty({
    description: 'Unique notification identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization (tenant) that owns this notification',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @ApiProperty({
    description: 'User ID this notification is for',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    enumName: 'NotificationType',
    example: NotificationType.WORK_ITEM_ASSIGNED,
  })
  @Column({ name: 'type', type: 'varchar', length: 50 })
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Work Item Assigned',
    maxLength: 255,
  })
  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({
    description: 'Notification message body',
    example: 'You have been assigned a high-priority account: John Smith ($5,432.10)',
    maxLength: 1000,
  })
  @Column({ name: 'message', type: 'text' })
  message: string;

  @ApiPropertyOptional({
    description: 'Link to navigate to when notification is clicked',
    example: '/work-queue/a1b2c3d4-e5f6-4789-a012-3456789abcde',
    maxLength: 500,
  })
  @Column({ name: 'action_link', type: 'varchar', length: 500, nullable: true })
  actionLink: string | null;

  @ApiProperty({
    description: 'Whether notification has been read',
    example: false,
  })
  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @ApiPropertyOptional({
    description: 'When notification was read',
    example: '2024-12-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @ApiPropertyOptional({
    description: 'Additional metadata for this notification',
    example: { workQueueItemId: 'abc123', debtorName: 'John Smith', balance: 5432.10 },
  })
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Timestamp when notification was created',
    example: '2024-12-15T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
