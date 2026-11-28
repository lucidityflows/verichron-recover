import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentPlanStatus, PaymentFrequency } from "@verichron/enums";

import { PaymentPlanDebt } from './payment-plan-debt.entity';

/**
 * PaymentPlan Entity
 * 
 * Represents a structured agreement for a debtor to pay off debt(s) in installments.
 * Supports multi-debt consolidation and configurable approval workflows.
 * 
 * @entity payment_plan
 */
@Entity('payment_plan')
@Check(`"total_amount" > 0`)
@Check(`"number_of_installments" > 0`)
@Check(`"installment_amount" > 0`)
@Index(['organizationId'])
@Index(['debtorId'])
@Index(['status'])
@Index(['nextPaymentDate'])
@Index(['organizationId', 'status'])
@Index(['organizationId', 'debtorId'])
export class PaymentPlan {
  @ApiProperty({
    description: 'Unique payment plan identifier',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique payment plan identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Organization that owns this payment plan (denormalized for tenant isolation)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @Column('uuid', {
    name: 'organization_id',
    nullable: false,
    comment: 'Foreign key to api-organizations - denormalized for performance and security',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Debtor who agreed to this payment plan',
    example: '321e6543-e89b-12d3-a456-426614174777',
    format: 'uuid',
  })
  @Column('uuid', {
    name: 'debtor_id',
    nullable: false,
    comment: 'Foreign key to api-debtors',
  })
  debtorId: string;

  @ApiProperty({
    description: 'Collector who created this payment plan (null for self-service plans)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    nullable: true,
  })
  @Column('uuid', {
    name: 'collector_user_id',
    nullable: true,
    comment: 'Foreign key to api-users - collector who created this plan (null for self-service)',
  })
  @Index()
  collectorUserId: string | null;

  @ApiProperty({
    description: 'Current status of the payment plan',
    enum: PaymentPlanStatus,
    example: PaymentPlanStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: PaymentPlanStatus,
    name: 'status',
    nullable: false,
    default: PaymentPlanStatus.DRAFT,
    comment: 'Payment plan lifecycle status',
  })
  status: PaymentPlanStatus;

  @ApiProperty({
    description: 'Total amount to be paid under this plan (sum of all consolidated debts)',
    example: 1500.00,
    type: 'number',
    format: 'decimal',
  })
  @Column('decimal', {
    name: 'total_amount',
    precision: 10,
    scale: 2,
    nullable: false,
    comment: 'Total amount to be paid - calculated from consolidated debts',
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Number of scheduled payment installments',
    example: 12,
    type: 'integer',
    minimum: 1,
  })
  @Column('int', {
    name: 'number_of_installments',
    nullable: false,
    comment: 'Number of scheduled payments',
  })
  numberOfInstallments: number;

  @ApiProperty({
    description: 'Amount per installment payment',
    example: 125.00,
    type: 'number',
    format: 'decimal',
  })
  @Column('decimal', {
    name: 'installment_amount',
    precision: 10,
    scale: 2,
    nullable: false,
    comment: 'Amount per installment - totalAmount / numberOfInstallments',
  })
  installmentAmount: number;

  @ApiProperty({
    description: 'Payment frequency for scheduled installments',
    enum: PaymentFrequency,
    example: PaymentFrequency.MONTHLY,
  })
  @Column({
    type: 'enum',
    enum: PaymentFrequency,
    name: 'frequency',
    nullable: false,
    comment: 'How often payments are scheduled (WEEKLY, BI_WEEKLY, MONTHLY)',
  })
  frequency: PaymentFrequency;

  @ApiProperty({
    description: 'Date of the first scheduled payment',
    example: '2024-02-01',
    type: 'string',
    format: 'date',
  })
  @Column('date', {
    name: 'start_date',
    nullable: false,
    comment: 'Date of first scheduled payment',
  })
  startDate: Date;

  @ApiProperty({
    description: 'Date of the next scheduled payment (updated after each successful payment)',
    example: '2024-03-01',
    type: 'string',
    format: 'date',
  })
  @Column('date', {
    name: 'next_payment_date',
    nullable: false,
    comment: 'Date of next scheduled payment - updated after each success',
  })
  nextPaymentDate: Date;

  @ApiProperty({
    description: 'Date of the most recent payment (null if no payments yet)',
    example: '2024-02-01',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column('date', {
    name: 'last_payment_date',
    nullable: true,
    comment: 'Date of most recent payment - null until first payment succeeds',
  })
  lastPaymentDate: Date | null;

  @ApiProperty({
    description: 'Tokenized payment method for scheduled payments',
    example: 'tok_1234567890abcdef',
  })
  @Column('varchar', {
    name: 'payment_method_token',
    length: 255,
    nullable: false,
    comment: 'Tokenized payment method - used for all scheduled payments',
  })
  paymentMethodToken: string;

  @ApiProperty({
    description: 'Number of completed payments',
    example: 3,
    type: 'integer',
    minimum: 0,
  })
  @Column('int', {
    name: 'payments_completed',
    nullable: false,
    default: 0,
    comment: 'Count of successfully completed payments',
  })
  paymentsCompleted: number;

  @ApiProperty({
    description: 'Number of failed payment attempts',
    example: 0,
    type: 'integer',
    minimum: 0,
  })
  @Column('int', {
    name: 'payments_failed',
    nullable: false,
    default: 0,
    comment: 'Count of failed payment attempts - used for default threshold',
  })
  paymentsFailed: number;

  @ApiProperty({
    description: 'User who created this payment plan',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @Column('uuid', {
    name: 'created_by_user_id',
    nullable: false,
    comment: 'User who created the plan (collector or debtor)',
  })
  createdByUserId: string;

  @ApiProperty({
    description: 'User who approved this payment plan (if approval was required)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
    nullable: true,
  })
  @Column('uuid', {
    name: 'approved_by_user_id',
    nullable: true,
    comment: 'User who approved the plan - null if auto-approved or not yet approved',
  })
  approvedByUserId: string | null;

  @ApiProperty({
    description: 'Timestamp when the plan was approved',
    example: '2024-01-15T10:30:00.000Z',
    nullable: true,
  })
  @Column('timestamp with time zone', {
    name: 'approved_at',
    nullable: true,
    comment: 'Timestamp when plan was approved',
  })
  approvedAt: Date | null;

  @ApiProperty({
    description: 'Additional metadata for the payment plan',
    example: { notes: 'Hardship case - reduced payments', source: 'debtor_portal' },
    nullable: true,
  })
  @Column('jsonb', {
    name: 'metadata',
    nullable: true,
    comment: 'Additional plan metadata',
  })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Timestamp when the payment plan was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp when plan was created',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the payment plan was last updated',
    example: '2024-01-15T10:30:05.000Z',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp when plan was last updated',
  })
  updatedAt: Date;

  /**
   * Relationship to consolidated debts
   */
  @OneToMany(() => PaymentPlanDebt, (planDebt) => planDebt.paymentPlan)
  debts: PaymentPlanDebt[];
}