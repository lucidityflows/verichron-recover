import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ChargeOffReason } from '@verichron/enums';

/**
 * Charge-Off History Entity
 *
 * Tracks charge-off events for debts. Handles multiple charge-offs per debt.
 *
 * BOUNDED CONTEXT:
 * - Owned by: api-debts (tracks debt lifecycle events)
 * - Related to: Debt entity (debtId FK)
 *
 * WHAT IS A CHARGE-OFF?
 * - Creditor writes off debt as a loss for accounting purposes
 * - Typically occurs at 180 days past due (federal banking requirement)
 * - Does NOT mean debt is forgiven or legally uncollectible
 * - Creditor can still collect or sell debt after charge-off
 * - Negative impact on debtor's credit report (stays for 7 years)
 *
 * DESIGN PRINCIPLES:
 * - Multiple occurrences supported: Rare but possible (debt recovered then charged off again)
 * - One-to-many: One debt can have multiple charge-off events
 * - Audit trail: Track each charge-off separately for regulatory compliance
 * - Denormalized current state: Debt entity has chargeOffDate field (most recent charge-off)
 *
 * USE CASES:
 * 1. Standard charge-off at 180 days delinquent
 * 2. Debt recovered (status changed to IN_COLLECTION), then charged off again
 * 3. Partial recovery via settlement, remaining balance charged off
 * 4. Bankruptcy charge-off (debt included in bankruptcy proceedings)
 * 5. Deceased debtor charge-off (no estate recovery)
 *
 * COMPLIANCE & REPORTING:
 * - Credit bureau reporting: Charge-offs must be reported accurately
 * - Recovery tracking: If debt later paid, charge-off status may need updating
 * - Tax reporting: Charged-off debt may create taxable income for debtor
 * - Regulatory audits: Banks must maintain charge-off documentation
 *
 * ANALYTICS USAGE:
 * - Charge-off rate by portfolio/creditor
 * - Average days to charge-off
 * - Recovery rate after charge-off
 * - Charge-off reason distribution
 */
@Entity({ name: 'charge_off_history' })
@Index(['organizationId', 'debtId'])
@Index(['chargeOffDate'])
export class ChargeOffHistory {
  @ApiProperty({
    description: 'Unique charge-off event identifier',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization that owns this charge-off record',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ApiProperty({
    description: 'Debt that was charged off',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
  })
  @Column({ name: 'debt_id', type: 'uuid' })
  debtId: string;

  // ========================================================================
  // CHARGE-OFF DETAILS
  // ========================================================================

  @ApiProperty({
    description: 'Date the debt was charged off',
    example: '2023-12-15',
    type: 'string',
    format: 'date',
  })
  @Column({ name: 'charge_off_date', type: 'date' })
  chargeOffDate: Date;

  @ApiProperty({
    description: 'Reason the debt was charged off',
    enum: ChargeOffReason,
    example: ChargeOffReason.DELINQUENCY_180_DAYS,
  })
  @Column({
    name: 'reason',
    type: 'enum',
    enum: ChargeOffReason,
  })
  reason: ChargeOffReason;

  @ApiProperty({
    description: 'Principal balance at time of charge-off',
    example: 5000.00,
    type: 'number',
    format: 'decimal',
  })
  @Column({
    name: 'principal_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  principalBalance: string;

  @ApiProperty({
    description: 'Interest balance at time of charge-off',
    example: 250.00,
    type: 'number',
    format: 'decimal',
    default: 0,
  })
  @Column({
    name: 'interest_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  interestBalance: string;

  @ApiProperty({
    description: 'Fees balance at time of charge-off',
    example: 100.00,
    type: 'number',
    format: 'decimal',
    default: 0,
  })
  @Column({
    name: 'fees_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  feesBalance: string;

  @ApiProperty({
    description: 'Total balance charged off (principal + interest + fees)',
    example: 5350.00,
    type: 'number',
    format: 'decimal',
  })
  @Column({
    name: 'total_charged_off',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  totalChargedOff: string;

  @ApiProperty({
    description: 'Days delinquent at time of charge-off',
    example: 180,
    type: 'integer',
  })
  @Column({ name: 'days_delinquent', type: 'integer' })
  daysDelinquent: number;

  // ========================================================================
  // RECOVERY & REVERSAL
  // ========================================================================

  @ApiProperty({
    description: 'Whether this charge-off was later reversed (debt recovered or paid)',
    example: false,
    type: 'boolean',
    default: false,
  })
  @Column({ name: 'is_reversed', type: 'boolean', default: false })
  isReversed: boolean;

  @ApiProperty({
    description: 'Date the charge-off was reversed',
    example: '2024-03-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'reversal_date', type: 'date', nullable: true })
  reversalDate: Date | null;

  @ApiProperty({
    description: 'Reason the charge-off was reversed',
    example: 'Debt paid in full',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'reversal_reason', type: 'varchar', length: 255, nullable: true })
  reversalReason: string | null;

  @ApiProperty({
    description: 'Amount recovered after charge-off (if any)',
    example: 2500.00,
    type: 'number',
    format: 'decimal',
    nullable: true,
  })
  @Column({
    name: 'recovered_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  recoveredAmount: string | null;

  @ApiProperty({
    description: 'Date of recovery (if recovered)',
    example: '2024-03-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'recovered_date', type: 'date', nullable: true })
  recoveredDate: Date | null;

  // ========================================================================
  // CREDIT REPORTING
  // ========================================================================

  @ApiProperty({
    description: 'Whether this charge-off was reported to credit bureaus',
    example: true,
    type: 'boolean',
    default: false,
  })
  @Column({ name: 'reported_to_credit_bureaus', type: 'boolean', default: false })
  reportedToCreditBureaus: boolean;

  @ApiProperty({
    description: 'Date reported to credit bureaus',
    example: '2023-12-20',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'credit_bureau_report_date', type: 'date', nullable: true })
  creditBureauReportDate: Date | null;

  // ========================================================================
  // NOTES & METADATA
  // ========================================================================

  @ApiProperty({
    description: 'Additional notes about this charge-off event',
    example: 'Charged off per federal banking regulations at 180 days delinquent. Debt sold to collection agency on 2023-12-20.',
    nullable: true,
  })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    description: 'User ID who recorded this charge-off',
    example: '456e7890-e89b-12d3-a456-426614174001',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  // ========================================================================
  // TIMESTAMPS
  // ========================================================================

  @ApiProperty({
    description: 'Timestamp when the charge-off record was created in the system',
    example: '2023-12-15T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the charge-off record was last updated',
    example: '2024-03-15T14:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
