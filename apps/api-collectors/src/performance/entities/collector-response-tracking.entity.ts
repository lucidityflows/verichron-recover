import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentReason, ResponseType, ResolutionType } from '@verichron/enums';

/**
 * Collector Response Tracking Entity (CQRS Read Model)
 *
 * This entity implements the Read Model side of a CQRS pattern for collector analytics.
 * It stores complete historical tracking of collector assignments and debtor responses,
 * optimized for time-series analytics and reporting.
 *
 * Key Design Principles:
 * - One record per assignment event (can track multiple assignments for same debtor)
 * - Immutable historical data (updates only for calculated fields)
 * - Time-series optimized with date-based indexing for partitioning
 * - Separate from WorkQueueItem (operational vs analytical separation)
 *
 * Use Cases:
 * - Calculate average time to first contact by collector
 * - Track response rates over time
 * - Analyze effectiveness of different assignment strategies
 * - Generate collector performance reports
 * - Identify patterns in debtor responsiveness
 * - Measure impact of reassignments on resolution time
 *
 * Scalability:
 * - Can be partitioned by assignedAt date (monthly/yearly)
 * - Can be moved to separate analytics database
 * - Can use columnar storage engines (TimescaleDB)
 * - Old data (>2 years) can be archived to cold storage
 *
 * Event Sources:
 * - WORK_QUEUE_ITEM_ASSIGNED → creates record
 * - COLLECTORS_DEBTOR_CONTACT_ATTEMPTED → updates contact fields
 * - DEBTOR_RESPONSE events → updates response fields
 * - WORK_QUEUE_ITEM_COMPLETED → updates resolution fields
 */
@Entity({ name: 'collector_response_tracking' })
@Index(['organizationId', 'collectorUserId', 'assignedAt'])
@Index(['organizationId', 'debtorId', 'assignedAt'])
@Index(['assignedAt']) // For time-series queries and partitioning
@Index(['collectorUserId', 'assignedAt']) // For collector performance reports
@Index(['workQueueItemId']) // For linking to work queue items
export class CollectorResponseTracking {
  @ApiProperty({
    description: 'Unique identifier for this tracking record',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization (tenant) ID',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @ApiProperty({
    description: 'Collector user ID',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @Column({ name: 'collector_user_id', type: 'uuid' })
  @Index()
  collectorUserId: string;

  @ApiProperty({
    description: 'Debtor profile ID',
    example: '7e9d6c5b-4a3f-4e2d-9c1b-6a8e7f5d4c3b',
    format: 'uuid',
  })
  @Column({ name: 'debtor_id', type: 'uuid' })
  @Index()
  debtorId: string;

  @ApiPropertyOptional({
    description: 'Work queue item ID (reference to assignment)',
    example: '6d8c5b4a-3e2f-4d1c-9b0a-5e7d6c4b3a2f',
    format: 'uuid',
  })
  @Column({ name: 'work_queue_item_id', type: 'uuid', nullable: true })
  workQueueItemId?: string;

  // ============================================================
  // Assignment Tracking
  // ============================================================

  @ApiProperty({
    description: 'Timestamp when debtor was assigned to collector',
    example: '2025-12-01T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Column({ name: 'assigned_at', type: 'timestamp' })
  assignedAt: Date;

  @ApiPropertyOptional({
    description: 'Previous collector ID if this is a reassignment',
    example: '5c7b4a3e-2d1f-4c0b-9a1e-4d6c5b3a2e1f',
    format: 'uuid',
  })
  @Column({ name: 'reassigned_from_collector_id', type: 'uuid', nullable: true })
  reassignedFromCollectorId?: string;

  @ApiProperty({
    description: 'Reason for assignment',
    enum: AssignmentReason,
    enumName: 'AssignmentReason',
    example: AssignmentReason.AUTO_LEAST_WORKLOAD,
  })
  @Column({
    name: 'assignment_reason',
    type: 'varchar',
    length: 50,
  })
  assignmentReason: AssignmentReason;

  // ============================================================
  // Contact Tracking
  // ============================================================

  @ApiPropertyOptional({
    description: 'Timestamp of first contact attempt by collector',
    example: '2025-12-01T10:15:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Column({ name: 'first_contact_attempt_at', type: 'timestamp', nullable: true })
  firstContactAttemptAt?: Date;

  @ApiProperty({
    description: 'Total number of contact attempts made',
    example: 5,
    type: 'integer',
  })
  @Column({ name: 'total_contact_attempts', type: 'int', default: 0 })
  totalContactAttempts: number;

  // ============================================================
  // Response Tracking
  // ============================================================

  @ApiPropertyOptional({
    description: 'Timestamp when debtor first responded',
    example: '2025-12-01T14:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Column({ name: 'first_response_at', type: 'timestamp', nullable: true })
  firstResponseAt?: Date;

  @ApiPropertyOptional({
    description: 'Type of first response from debtor',
    enum: ResponseType,
    enumName: 'ResponseType',
    example: ResponseType.ANSWERED_CALL,
  })
  @Column({ name: 'response_type', type: 'varchar', length: 50, nullable: true })
  responseType?: ResponseType;

  @ApiPropertyOptional({
    description: 'Time from assignment to first response (in minutes)',
    example: 260,
    type: 'integer',
  })
  @Column({ name: 'time_to_first_response_minutes', type: 'int', nullable: true })
  timeToFirstResponseMinutes?: number;

  @ApiPropertyOptional({
    description: 'Time from first contact attempt to first response (in minutes)',
    example: 255,
    type: 'integer',
  })
  @Column({ name: 'time_to_response_from_contact_minutes', type: 'int', nullable: true })
  timeToResponseFromContactMinutes?: number;

  // ============================================================
  // Resolution Tracking
  // ============================================================

  @ApiPropertyOptional({
    description: 'Timestamp when work queue item was resolved',
    example: '2025-12-15T16:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @ApiPropertyOptional({
    description: 'Type of resolution',
    enum: ResolutionType,
    enumName: 'ResolutionType',
    example: ResolutionType.PAYMENT_PLAN,
  })
  @Column({ name: 'resolution_type', type: 'varchar', length: 50, nullable: true })
  resolutionType?: ResolutionType;

  @ApiPropertyOptional({
    description: 'Number of days from assignment to resolution',
    example: 14,
    type: 'integer',
  })
  @Column({ name: 'days_to_resolution', type: 'int', nullable: true })
  daysToResolution?: number;

  @ApiPropertyOptional({
    description: 'Whether resolution was successful (payment-related)',
    example: true,
    type: 'boolean',
  })
  @Column({ name: 'is_successful_resolution', type: 'boolean', default: false })
  isSuccessfulResolution: boolean;

  // ============================================================
  // Metadata & Timestamps
  // ============================================================

  @ApiPropertyOptional({
    description: 'Additional metadata for analytics and extensibility',
    example: {
      debtBalance: 15000,
      assignmentScore: 87.5,
      collectorExperience: 'senior',
      debtorRiskScore: 'medium',
    },
  })
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Timestamp when this record was created',
    example: '2025-12-01T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when this record was last updated',
    example: '2025-12-15T16:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
