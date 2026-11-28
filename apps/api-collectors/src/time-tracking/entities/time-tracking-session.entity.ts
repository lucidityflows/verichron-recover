import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimeTrackingSessionStatus } from '@verichron/enums';

/**
 * Time Tracking Session Entity
 *
 * Tracks collector work sessions for time utilization analysis.
 * Sessions can be active, paused, or completed.
 * Supports both debtor-specific sessions and general work sessions.
 */
@Entity('time_tracking_sessions')
@Index(['organizationId'])
@Index(['collectorUserId', 'status'])
@Index(['organizationId', 'collectorUserId'])
@Index(['organizationId', 'debtorId'])
@Index(['startTime', 'endTime'])
export class TimeTrackingSession {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({
    description: 'Unique identifier for the time tracking session',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @ApiProperty({
    description: 'Organization ID for multi-tenancy',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId: string;

  @Column({ name: 'collector_user_id', type: 'uuid' })
  @ApiProperty({
    description: 'Collector user ID who owns this session',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  collectorUserId: string;

  @Column({ name: 'debtor_id', type: 'uuid', nullable: true })
  @ApiPropertyOptional({
    description: 'Debtor ID this session is associated with (null for general work sessions)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  debtorId: string | null;

  @Column({ name: 'start_time', type: 'timestamptz' })
  @ApiProperty({
    description: 'Session start timestamp',
    example: '2025-01-15T10:00:00Z',
  })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
  @ApiPropertyOptional({
    description: 'Session end timestamp (null for active sessions)',
    example: '2025-01-15T11:30:00Z',
  })
  endTime: Date | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: TimeTrackingSessionStatus.ACTIVE,
  })
  @ApiProperty({
    description: 'Current session status',
    enum: TimeTrackingSessionStatus,
    enumName: 'TimeTrackingSessionStatus',
    example: TimeTrackingSessionStatus.ACTIVE,
  })
  status: TimeTrackingSessionStatus;

  @Column({ name: 'total_active_seconds', type: 'integer', default: 0 })
  @ApiProperty({
    description: 'Total active time in seconds (calculated)',
    example: 3600,
  })
  totalActiveSeconds: number;

  @Column({ name: 'total_idle_seconds', type: 'integer', default: 0 })
  @ApiProperty({
    description: 'Total idle/paused time in seconds (calculated)',
    example: 300,
  })
  totalIdleSeconds: number;

  @Column({ name: 'pause_start_time', type: 'timestamptz', nullable: true })
  @ApiPropertyOptional({
    description: 'Timestamp when session was paused (for calculating idle time)',
    example: '2025-01-15T10:45:00Z',
  })
  pauseStartTime: Date | null;

  @Column({ name: 'last_activity_time', type: 'timestamptz', nullable: true })
  @ApiPropertyOptional({
    description: 'Timestamp of last recorded activity',
    example: '2025-01-15T10:45:00Z',
  })
  lastActivityTime: Date | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  @ApiPropertyOptional({
    description: 'Additional session metadata',
    example: {
      activityType: 'phone_call',
      notes: 'Follow-up call regarding payment arrangement',
      tags: ['high-priority', 'payment-plan'],
    },
  })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({
    description: 'Timestamp when session was created',
    example: '2025-01-15T10:00:00Z',
  })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty({
    description: 'Timestamp when session was last updated',
    example: '2025-01-15T11:30:00Z',
  })
  updatedAt: Date;
}
