import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkQueueItemStatus, WorkQueuePriority, ActionType } from '@verichron/enums';

/**
 * Work Queue Item Entity
 *
 * Represents a debtor account requiring collector action.
 * This is an event-driven read model populated by subscriptions to debt, payment, and communication events.
 *
 * Key Design Principles:
 * - Denormalized read model optimized for collector workflow queries
 * - Priority score calculated by prioritization service
 * - Updated in real-time via event subscriptions
 * - Assigned to specific collectors for workload distribution
 *
 * Authorization:
 * - Users must have WORK_QUEUE:READ permission
 * - Collectors see only items assigned to them or unassigned
 * - Managers see all items for their organization
 */
@Entity({ name: 'work_queue_items' })
@Index(['organizationId', 'priorityScore'])
@Index(['organizationId', 'assignedToUserId', 'status'])
@Index(['organizationId', 'status'])
export class WorkQueueItem {
  @ApiProperty({
    description: 'Unique work queue item identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization (tenant) that owns this work queue item',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @ApiProperty({
    description: 'Debtor profile ID this work item represents',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @Column({ name: 'debtor_id', type: 'uuid' })
  @Index()
  debtorId: string;

  @ApiProperty({
    description: 'Full name of the debtor for display',
    example: 'John Smith',
    maxLength: 255,
  })
  @Column({ name: 'debtor_name', type: 'varchar', length: 255 })
  debtorName: string;

  @ApiProperty({
    description: 'Total outstanding balance across all debts for this debtor',
    example: 15750.50,
    type: 'number',
    format: 'decimal',
  })
  @Column({ name: 'total_balance', type: 'decimal', precision: 12, scale: 2 })
  totalBalance: number;

  @ApiProperty({
    description: 'Days since the oldest debt became overdue',
    example: 45,
    type: 'integer',
  })
  @Column({ name: 'days_overdue', type: 'integer' })
  daysOverdue: number;

  @ApiProperty({
    description: 'Calculated priority score (higher = more urgent)',
    example: 87.5,
    type: 'number',
    format: 'decimal',
  })
  @Column({ name: 'priority_score', type: 'decimal', precision: 8, scale: 2 })
  priorityScore: number;

  @ApiProperty({
    description: 'Human-readable priority label',
    enum: WorkQueuePriority,
    enumName: 'WorkQueuePriority',
    example: WorkQueuePriority.HIGH,
  })
  @Column({ name: 'priority_label', type: 'varchar', length: 20 })
  priorityLabel: WorkQueuePriority;

  @ApiPropertyOptional({
    description: 'Next recommended action type',
    enum: ActionType,
    enumName: 'ActionType',
    example: ActionType.CALL,
    nullable: true,
  })
  @Column({ name: 'next_action_type', type: 'varchar', length: 50, nullable: true })
  nextActionType: ActionType | null;

  @ApiPropertyOptional({
    description: 'Due date for next action',
    example: '2024-12-15T10:00:00Z',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'next_action_due', type: 'timestamp', nullable: true })
  nextActionDue: Date | null;

  @ApiPropertyOptional({
    description: 'Date of last contact attempt with debtor',
    example: '2024-12-01T14:30:00Z',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'last_contact_date', type: 'timestamp', nullable: true })
  lastContactDate: Date | null;

  @ApiPropertyOptional({
    description: 'Type of last contact attempt',
    enum: ActionType,
    enumName: 'ActionType',
    example: ActionType.EMAIL,
    nullable: true,
  })
  @Column({ name: 'last_contact_type', type: 'varchar', length: 50, nullable: true })
  lastContactType: ActionType | null;

  @ApiProperty({
    description: 'Current status of this work queue item',
    enum: WorkQueueItemStatus,
    enumName: 'WorkQueueItemStatus',
    example: WorkQueueItemStatus.NEW,
  })
  @Column({ name: 'status', type: 'varchar', length: 50 })
  status: WorkQueueItemStatus;

  @ApiProperty({
    description: 'Whether debtor has an open dispute',
    example: false,
    type: 'boolean',
  })
  @Column({ name: 'has_open_dispute', type: 'boolean', default: false })
  hasOpenDispute: boolean;

  @ApiProperty({
    description: 'Whether debtor has an active payment plan',
    example: true,
    type: 'boolean',
  })
  @Column({ name: 'has_payment_plan', type: 'boolean', default: false })
  hasPaymentPlan: boolean;

  @ApiProperty({
    description: 'Tags associated with this work item',
    example: ['high-value', 'responsive'],
    type: [String],
  })
  @Column({ name: 'tags', type: 'text', array: true, default: [] })
  tags: string[];

  @ApiPropertyOptional({
    description: 'User ID this item is assigned to',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId: string | null;

  @ApiPropertyOptional({
    description: 'Full name of assigned user for display',
    example: 'Jane Collector',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'assigned_to_name', type: 'varchar', length: 255, nullable: true })
  assignedToName: string | null;

  // ============================================================
  // CQRS Denormalized Fields (Cached from CollectorResponseTracking)
  // ============================================================

  @ApiPropertyOptional({
    description: 'When current assignment started (denormalized from CollectorResponseTracking)',
    example: '2025-12-01T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Column({ name: 'current_assignment_started_at', type: 'timestamp', nullable: true })
  currentAssignmentStartedAt?: Date;

  @ApiPropertyOptional({
    description: 'When first contact attempt was made (denormalized for UI performance)',
    example: '2025-12-01T10:15:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Column({ name: 'first_contact_attempt_at', type: 'timestamp', nullable: true })
  firstContactAttemptAt?: Date;

  @ApiPropertyOptional({
    description: 'When debtor first responded (denormalized for responsiveness indicator)',
    example: '2025-12-01T14:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Column({ name: 'first_response_at', type: 'timestamp', nullable: true })
  firstResponseAt?: Date;

  @ApiPropertyOptional({
    description: 'Date until which this item is deferred (for DEFERRED status)',
    example: '2025-12-25T09:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Column({ name: 'deferred_until', type: 'timestamp', nullable: true })
  deferredUntil?: Date;

  @ApiProperty({
    description: 'Timestamp when this work item was created',
    example: '2024-12-01T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when this work item was last updated',
    example: '2024-12-05T15:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
