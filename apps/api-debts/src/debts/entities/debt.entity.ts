import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { DebtStatus, DebtCategory } from '@verichron/enums';
import { DebtDebtor } from './debt-debtor.entity';
import type { Portfolio } from '../../portfolios/entities/portfolio.entity';

/**
 * Debt Entity
 * 
 * Represents an individual debt account owed by one or more debtors.
 * This is the core entity of the debt management bounded context.
 * 
 * Key Design Principles:
 * - Denormalized organizationId for single-query tenant isolation
 * - Immutable financial fields (principalAmount, originalDebtDate) for audit integrity
 * - Calculated currentBalance updated via event subscription
 * - Many-to-many relationship with debtors via join table
 * 
 * Authorization:
 * - Layer 1: JWT must contain debt:read, debt:update, etc. permissions
 * - Layer 2: User must have access to the portfolio this debt belongs to
 */
@Entity({ name: 'debts' })
@Index(['organizationId', 'accountNumber'], { unique: true })
@Index(['organizationId', 'portfolioId'])
@Index(['organizationId', 'status'])
export class Debt {
  @ApiProperty({
    description: 'Unique debt identifier',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization (tenant) that owns this debt. Denormalized for performance and security.',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ApiProperty({
    description: 'Portfolio this debt belongs to',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
  })
  @Column({ name: 'portfolio_id', type: 'uuid' })
  portfolioId: string;

  /**
   * Portfolio relationship
   */
  @ManyToOne('Portfolio', (portfolio: Portfolio) => portfolio.debts)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  @ApiProperty({
    description: 'Name of the original creditor who issued this debt',
    example: 'First National Bank',
    maxLength: 255,
  })
  @Column({ name: 'original_creditor_name', type: 'varchar', length: 255 })
  originalCreditorName: string;

  @ApiProperty({
    description: 'Original creditor account number. Must be unique within the organization.',
    example: 'ACC-2024-00123456',
    maxLength: 100,
  })
  @Column({ name: 'account_number', type: 'varchar', length: 100 })
  accountNumber: string;

  @ApiProperty({
    description: 'Original principal amount of the debt. IMMUTABLE after creation for audit integrity.',
    example: 5000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0.01,
  })
  @Column({
    name: 'principal_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  principalAmount: string;

  @ApiProperty({
    description: 'Accrued interest on the debt. Can be updated by admins.',
    example: 250.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
    default: 0,
  })
  @Column({
    name: 'interest_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  interestAmount: string;

  @ApiProperty({
    description: 'Additional fees associated with the debt. Can be updated by admins.',
    example: 100.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
    default: 0,
  })
  @Column({
    name: 'fees_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  feesAmount: string;

  @ApiProperty({
    description: 'Current outstanding balance. Updated via TransactionSucceeded events, never directly editable.',
    example: 4850.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @Column({
    name: 'current_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  currentBalance: string;

  @ApiProperty({
    description: 'Current lifecycle status of the debt',
    enum: DebtStatus,
    example: DebtStatus.IN_COLLECTION,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: DebtStatus,
    default: DebtStatus.IMPORTED,
  })
  status: DebtStatus;

  @ApiProperty({
    description: 'Canonical debt type classification. Intrinsic property of the debt.',
    enum: DebtCategory,
    enumName: 'DebtCategory',
    example: DebtCategory.MEDICAL,
  })
  @Column({
    name: 'debt_category',
    type: 'enum',
    enum: DebtCategory,
    default: DebtCategory.OTHER,
  })
  debtCategory: DebtCategory;

  @ApiProperty({
    description: 'Optional subcategory for more specific classification (e.g., "Subprime Auto", "Elective Surgery")',
    example: 'Emergency Room Visit',
    maxLength: 100,
    nullable: true,
  })
  @Column({ name: 'debt_subcategory', type: 'varchar', length: 100, nullable: true })
  debtSubcategory: string | null;

  @ApiProperty({
    description: 'Date the original debt was incurred. IMMUTABLE after creation for audit integrity.',
    example: '2023-06-15',
    type: 'string',
    format: 'date',
  })
  @Column({ name: 'original_debt_date', type: 'date' })
  originalDebtDate: Date;

  @ApiProperty({
    description: 'Date of the most recent payment received. Updated via TransactionSucceeded events.',
    example: '2024-01-20',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'last_payment_date', type: 'date', nullable: true })
  lastPaymentDate: Date | null;

  @ApiProperty({
    description: 'Collector notes and comments about this debt. Updated by users with debt:update:notes permission.',
    example: 'Debtor prefers email contact. Responsive to payment plan offers.',
    nullable: true,
  })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    description: 'FDCPA Compliance: Whether the debt is currently disputed by the debtor. Collection must cease until validation provided.',
    example: false,
    type: 'boolean',
    default: false,
  })
  @Column({ name: 'is_disputed', type: 'boolean', default: false })
  isDisputed: boolean;

  @ApiProperty({
    description: 'FDCPA Compliance: Date when the dispute was filed. NULL if never disputed or dispute resolved.',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'disputed_at', type: 'timestamp', nullable: true })
  disputedAt: Date | null;

  @ApiProperty({
    description: 'FDCPA Compliance: Reason provided by debtor for disputing the debt. Required for compliance documentation.',
    example: 'This debt was already paid in full. I have bank statements showing payment on 2023-12-15.',
    nullable: true,
  })
  @Column({ name: 'dispute_reason', type: 'text', nullable: true })
  disputeReason: string | null;

  // ========================================================================
  // ANALYTICS DATE FIELDS (Debt Lifecycle Tracking)
  // ========================================================================

  @ApiProperty({
    description: 'Date when the debt first became delinquent (missed first payment). Used for statute of limitations calculation and aging analytics.',
    example: '2023-06-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'first_delinquency_date', type: 'date', nullable: true })
  firstDelinquencyDate: Date | null;

  @ApiProperty({
    description: 'Date when the debt was placed with this collection agency for recovery.',
    example: '2024-01-20',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'placement_date', type: 'date', nullable: true })
  placementDate: Date | null;

  @ApiProperty({
    description: 'Date when the debt was most recently charged off. Denormalized from ChargeOffHistory for performance. Full charge-off history tracked in ChargeOffHistory entity.',
    example: '2023-12-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'charge_off_date', type: 'date', nullable: true })
  chargeOffDate: Date | null;

  @ApiProperty({
    description: 'Date of the last transaction activity on this debt (payment, charge, adjustment). Updated via TransactionSucceeded events.',
    example: '2024-03-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'last_transaction_date', type: 'date', nullable: true })
  lastTransactionDate: Date | null;

  @ApiProperty({
    description: 'Date of the last communication attempt with the debtor (call, email, SMS). Updated via CommunicationSent events.',
    example: '2024-04-10',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'last_contact_date', type: 'date', nullable: true })
  lastContactDate: Date | null;

  // ========================================================================
  // COMPLIANCE & LEGAL FIELDS
  // ========================================================================

  @ApiProperty({
    description: 'Calculated statute of limitations expiration date. Based on firstDelinquencyDate + state law (typically 3-7 years). Auto-calculated by StatuteCalculatorService.',
    example: '2029-06-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'statute_of_limitations_date', type: 'date', nullable: true })
  statuteOfLimitationsDate: Date | null;

  @ApiProperty({
    description: 'State whose statute of limitations applies (debtor residence at delinquency, creditor state, or transaction state). Determines SOL calculation.',
    example: 'CA',
    maxLength: 2,
    nullable: true,
  })
  @Column({ name: 'statute_of_limitations_state', type: 'varchar', length: 2, nullable: true })
  statuteOfLimitationsState: string | null;

  // ========================================================================
  // CREDITOR REFERENCE
  // ========================================================================

  @ApiProperty({
    description: 'Reference to the original creditor entity. Used for analytics, geographic flows, and reporting.',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'creditor_id', type: 'uuid', nullable: true })
  creditorId: string | null;

  // ========================================================================
  // IMPORT METADATA
  // ========================================================================

  @ApiProperty({
    description: 'Optional supplemental notes provided during debt import (e.g., special instructions, account history, compliance flags).',
    example: 'Debtor requested validation notice on 2023-08-01. Attorney representation confirmed.',
    nullable: true,
  })
  @Column({ name: 'import_notes', type: 'text', nullable: true })
  importNotes: string | null;

  @ApiProperty({
    description: 'Batch identifier from the original debt import. Used for auditing and bulk operations.',
    example: 'BATCH-2024-01-15-FNBANK',
    maxLength: 100,
    nullable: true,
  })
  @Column({ name: 'import_batch_id', type: 'varchar', length: 100, nullable: true })
  importBatchId: string | null;

  @ApiProperty({
    description: 'Timestamp when the debt record was created',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the debt record was last updated',
    example: '2024-01-20T14:45:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Many-to-many relationship with debtors via join table.
   * A debt can have multiple co-debtors (spouses, co-signers).
   */
  @OneToMany(() => DebtDebtor, (debtDebtor) => debtDebtor.debt, {
    cascade: true,
  })
  debtorLinks: DebtDebtor[];
}