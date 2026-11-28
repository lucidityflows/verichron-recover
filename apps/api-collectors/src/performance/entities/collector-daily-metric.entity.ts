import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Collector Daily Metric Entity (Accumulator Pattern)
 *
 * This entity implements pre-aggregated time-series data for collector performance.
 * It stores daily totals for key metrics, allowing for near-instant dashboard
 * rendering and historical trend analysis without heavy database aggregation.
 *
 * Key Design Principles:
 * - One record per collector per day
 * - Optimized for read-heavy dashboard and timeline components
 * - Updated in real-time via event listeners (upsert pattern)
 * - Atomic increments ensure data consistency
 *
 * Use Cases:
 * - Performance timeline (30-day view)
 * - Efficiency trends (Calls per day over time)
 * - Collection velocity (Daily collected amount trends)
 * - Manager coaching (Historical performance context)
 */
@Entity({ name: 'collector_daily_metrics' })
@Unique(['organizationId', 'collectorUserId', 'date'])
@Index(['organizationId', 'date']) // For team-level historical trends
@Index(['collectorUserId', 'date']) // For individual timeline views
export class CollectorDailyMetric {
  @ApiProperty({
    description: 'Unique identifier for this metric record',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization (tenant) ID',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ApiProperty({
    description: 'Collector user ID',
    format: 'uuid',
  })
  @Column({ name: 'collector_user_id', type: 'uuid' })
  collectorUserId: string;

  @ApiProperty({
    description: 'The date these metrics apply to (YYYY-MM-DD)',
    type: 'string',
    format: 'date',
  })
  @Column({ type: 'date' })
  date: string;

  // ============================================================
  // Communication Metrics
  // ============================================================

  @ApiProperty({ description: 'Total number of calls made' })
  @Column({ name: 'calls_made', type: 'int', default: 0 })
  callsMade: number;

  @ApiProperty({ description: 'Total number of emails sent' })
  @Column({ name: 'emails_sent', type: 'int', default: 0 })
  emailsSent: number;

  @ApiProperty({ description: 'Total number of SMS messages sent' })
  @Column({ name: 'sms_sent', type: 'int', default: 0 })
  smsSent: number;

  @ApiProperty({ description: 'Number of unique accounts/debtors contacted' })
  @Column({ name: 'unique_accounts_contacted', type: 'int', default: 0 })
  uniqueAccountsContacted: number;

  // ============================================================
  // Outcome Metrics
  // ============================================================

  @ApiProperty({ description: 'Number of payment promises secured' })
  @Column({ name: 'promises_secured', type: 'int', default: 0 })
  promisesSecured: number;

  @ApiProperty({ description: 'Number of successful payments received' })
  @Column({ name: 'payments_received', type: 'int', default: 0 })
  paymentsReceived: number;

  @ApiProperty({ description: 'Total amount collected (in cents)' })
  @Column({ name: 'total_collected', type: 'bigint', default: 0 })
  totalCollected: number;

  // ============================================================
  // Timestamps
  // ============================================================

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
