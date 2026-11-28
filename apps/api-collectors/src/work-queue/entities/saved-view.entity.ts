import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SortOrder } from '@verichron/enums';

/**
 * Saved View Entity
 *
 * Stores custom filter configurations for work queue views.
 * Allows collectors to save frequently-used filters and share them with team members.
 *
 * Key Design Principles:
 * - Each view stores filter criteria as JSONB
 * - Views can be private (user-specific) or shared (team-wide)
 * - Users can set a default view that loads automatically
 * - Quick filters are predefined views created by system
 *
 * Authorization:
 * - Users can create and manage their own views
 * - Shared views visible to all users in organization
 * - Only view creator can edit/delete (unless admin)
 */
@Entity({ name: 'saved_views' })
@Index(['organizationId', 'userId'])
@Index(['organizationId', 'isShared'])
export class SavedView {
  @ApiProperty({
    description: 'Unique saved view identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization (tenant) that owns this saved view',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @ApiProperty({
    description: 'User ID of the view creator',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ApiProperty({
    description: 'Name of the saved view',
    example: 'High Balance Overdue',
    maxLength: 255,
  })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of what this view filters',
    example: 'Accounts with balance > $10,000 that are 60+ days overdue',
    maxLength: 1000,
  })
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    description: 'Filter criteria as JSONB',
    example: {
      minBalance: 10000,
      minDaysOverdue: 60,
      priorityLabels: ['HIGH', 'URGENT'],
      status: ['NEW', 'IN_PROGRESS'],
    },
  })
  @Column({ name: 'filters', type: 'jsonb' })
  filters: Record<string, any>;

  @ApiProperty({
    description: 'Whether this view is shared with the team',
    example: false,
  })
  @Column({ name: 'is_shared', type: 'boolean', default: false })
  isShared: boolean;

  @ApiProperty({
    description: 'Whether this is a system-provided quick filter',
    example: false,
  })
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @ApiProperty({
    description: 'Whether this is the default view for the user',
    example: false,
  })
  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @ApiPropertyOptional({
    description: 'Sort configuration',
    example: { field: 'priorityScore', order: 'DESC' },
  })
  @Column({ name: 'sort', type: 'jsonb', nullable: true })
  sort: { field: string; order: SortOrder } | null;

  @ApiProperty({
    description: 'Timestamp when view was created',
    example: '2024-12-15T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when view was last updated',
    example: '2024-12-16T14:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
