import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { AutoAssignmentStrategy, WorkflowPriority } from '@verichron/enums';

// Nested Interface for filters (similar to WorkflowCondition but specific to assignment)
export interface AutoAssignmentFilters {
  portfolioIds?: string[];
  balanceRange?: [number, number];
  accountAgeRange?: [number, number]; // in days
  priority?: string[]; // e.g., WorkflowPriority.HIGH
  [key: string]: any; // Allow custom filters
}

// Interface for tracking daily assignment counts per collector
export interface DailyAssignmentCounts {
  [collectorId: string]: {
    [date: string]: number; // Date format: YYYY-MM-DD
  };
}

@Entity('auto_assignment_configs')
@Unique(['organizationId', 'name'])
export class AutoAssignmentConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true, name: 'enabled' })
  enabled: boolean;

  @Column({
    type: 'enum',
    enum: AutoAssignmentStrategy,
    enumName: 'AutoAssignmentStrategy',
    name: 'strategy',
  })
  strategy: AutoAssignmentStrategy;

  @Column({ type: 'jsonb', name: 'filters' })
  filters: AutoAssignmentFilters;

  @Column({ type: 'jsonb', name: 'collector_pool' })
  collectorPool: string[]; // Array of collector IDs eligible for assignment

  @Column({ type: 'jsonb', name: 'exclude_collectors', nullable: true })
  excludeCollectors?: string[];

  @Column({ type: 'integer', name: 'max_assignments_per_day', nullable: true })
  maxAssignmentsPerDay?: number;

  @Column({ type: 'integer', name: 'workload_threshold', nullable: true })
  workloadThreshold?: number; // Max accounts before collector is excluded

  @Column({ type: 'uuid', name: 'last_assigned_collector_id', nullable: true })
  lastAssignedCollectorId?: string; // For round-robin strategy

  @Column({ 
    type: 'jsonb', 
    name: 'daily_assignment_counts', 
    default: '{}',
    comment: 'Tracks assignments per collector per day: { collectorId: { "2025-01-15": 5 } }'
  })
  dailyAssignmentCounts: DailyAssignmentCounts;

  @Column({ type: 'integer', name: 'total_assignments', default: 0 })
  totalAssignments: number; // Total number of assignments made using this config

  @Column({ type: 'integer', name: 'consecutive_failures', default: 0 })
  consecutiveFailures: number; // Track consecutive failures for auto-disable logic

  @Column({ type: 'boolean', name: 'auto_disabled', default: false })
  autoDisabled: boolean; // Auto-disabled flag after consecutive failures

  @Column({ type: 'timestamptz', name: 'auto_disabled_at', nullable: true })
  autoDisabledAt?: Date; // Timestamp when auto-disabled

  @Column({ type: 'text', name: 'auto_disabled_reason', nullable: true })
  autoDisabledReason?: string; // Reason for auto-disable

  @Column({ type: 'integer', name: 'delay_minutes', nullable: true })
  delayMinutes?: number; // Optional delay before assignment execution (0 = immediate)

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy?: string; // User ID

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}