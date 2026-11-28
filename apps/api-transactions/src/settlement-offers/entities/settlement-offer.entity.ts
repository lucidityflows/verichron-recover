import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SettlementOfferStatus } from '@verichron/enums';

/**
 * Settlement Offer Entity
 *
 * Represents a debt settlement offer made by either the debtor or creditor.
 * Similar in complexity to PaymentPlan - tracks negotiated settlement terms.
 *
 * BOUNDED CONTEXT:
 * - Owned by: api-transactions (manages financial agreements)
 * - Related to: Debt entity in api-debts (debtId FK)
 * - Related to: Document entity (for settlement agreements, acceptance letters)
 *
 * USE CASES:
 * - Collector offers debtor a settlement for 60% of balance
 * - Debtor counter-offers with lower amount
 * - Track acceptance, rejection, or expiration of offers
 * - Link to signed settlement agreement documents
 * - Multiple offers per debt (history of negotiation)
 *
 * DESIGN PRINCIPLES:
 * - Multiple occurrences supported: One debt can have many settlement offers
 * - Audit trail: Track who made offer, when, and outcome
 * - Document linkage: Settlement agreements stored in Document entity
 * - Status lifecycle: PENDING → ACCEPTED → COMPLETED or REJECTED/EXPIRED/DEFAULTED
 *
 * ANALYTICS USAGE:
 * - Acceptance rate: (ACCEPTED / total offers) * 100
 * - Average settlement percentage by collector
 * - Time to acceptance metrics
 * - Default rate on accepted settlements
 */
@Entity({ name: 'settlement_offers' })
@Index(['organizationId', 'debtId'])
@Index(['organizationId', 'status'])
@Index(['organizationId', 'offeredBy'])
@Index(['expirationDate'])
export class SettlementOffer {
  @ApiProperty({
    description: 'Unique settlement offer identifier',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization that owns this settlement offer',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ApiProperty({
    description: 'Debt this settlement offer applies to',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
  })
  @Column({ name: 'debt_id', type: 'uuid' })
  debtId: string;

  // ========================================================================
  // OFFER DETAILS
  // ========================================================================

  @ApiProperty({
    description: 'Who initiated this settlement offer',
    enum: ['CREDITOR', 'DEBTOR'],
    example: 'CREDITOR',
  })
  @Column({
    name: 'offered_by',
    type: 'enum',
    enum: ['CREDITOR', 'DEBTOR'],
  })
  offeredBy: 'CREDITOR' | 'DEBTOR';

  @ApiProperty({
    description: 'Original debt balance at time of offer',
    example: 5000.00,
    type: 'number',
    format: 'decimal',
  })
  @Column({
    name: 'original_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  originalBalance: string;

  @ApiProperty({
    description: 'Settlement offer amount (total to be paid to settle debt)',
    example: 3000.00,
    type: 'number',
    format: 'decimal',
  })
  @Column({
    name: 'settlement_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  settlementAmount: string;

  @ApiProperty({
    description: 'Percentage of original balance (calculated: settlementAmount / originalBalance)',
    example: 60.0,
    type: 'number',
    format: 'decimal',
  })
  @Column({
    name: 'settlement_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  settlementPercentage: string;

  // ========================================================================
  // PAYMENT STRUCTURE
  // ========================================================================

  @ApiProperty({
    description: 'Payment structure for settlement',
    enum: ['LUMP_SUM', 'INSTALLMENT'],
    example: 'LUMP_SUM',
  })
  @Column({
    name: 'payment_structure',
    type: 'enum',
    enum: ['LUMP_SUM', 'INSTALLMENT'],
    default: 'LUMP_SUM',
  })
  paymentStructure: 'LUMP_SUM' | 'INSTALLMENT';

  @ApiProperty({
    description: 'If INSTALLMENT: Number of payments allowed',
    example: 3,
    nullable: true,
  })
  @Column({ name: 'installment_count', type: 'integer', nullable: true })
  installmentCount: number | null;

  @ApiProperty({
    description: 'If INSTALLMENT: Amount per installment payment',
    example: 1000.00,
    type: 'number',
    format: 'decimal',
    nullable: true,
  })
  @Column({
    name: 'installment_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  installmentAmount: string | null;

  @ApiProperty({
    description: 'If INSTALLMENT: Frequency of payments (WEEKLY, BIWEEKLY, MONTHLY)',
    enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'],
    nullable: true,
  })
  @Column({
    name: 'installment_frequency',
    type: 'enum',
    enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'],
    nullable: true,
  })
  installmentFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | null;

  // ========================================================================
  // STATUS & LIFECYCLE
  // ========================================================================

  @ApiProperty({
    description: 'Current status of the settlement offer',
    enum: SettlementOfferStatus,
    example: SettlementOfferStatus.PENDING,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: SettlementOfferStatus,
    default: SettlementOfferStatus.PENDING,
  })
  status: SettlementOfferStatus;

  @ApiProperty({
    description: 'Date the settlement offer was made',
    example: '2024-04-01',
    type: 'string',
    format: 'date',
  })
  @Column({ name: 'offer_date', type: 'date' })
  offerDate: Date;

  @ApiProperty({
    description: 'Date the settlement offer expires if not accepted',
    example: '2024-04-30',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate: Date | null;

  @ApiProperty({
    description: 'Date the settlement offer was accepted, rejected, or expired',
    example: '2024-04-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'resolution_date', type: 'date', nullable: true })
  resolutionDate: Date | null;

  @ApiProperty({
    description: 'Date the settlement was fully paid (status = COMPLETED)',
    example: '2024-05-01',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'completion_date', type: 'date', nullable: true })
  completionDate: Date | null;

  // ========================================================================
  // AUDIT & TRACKING
  // ========================================================================

  @ApiProperty({
    description: 'User ID of collector or system that created the offer',
    example: '456e7890-e89b-12d3-a456-426614174001',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ApiProperty({
    description: 'User ID who approved/rejected the offer (for debtor-initiated offers)',
    example: '456e7890-e89b-12d3-a456-426614174002',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @ApiProperty({
    description: 'Notes or terms associated with the settlement offer',
    example: 'Debtor must pay lump sum within 30 days. Credit reporting will show "Settled" status. Waives all interest and fees.',
    nullable: true,
  })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  // ========================================================================
  // DOCUMENT LINKAGE
  // ========================================================================

  @ApiProperty({
    description: 'Reference to signed settlement agreement document',
    example: 'doc-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'settlement_agreement_document_id', type: 'uuid', nullable: true })
  settlementAgreementDocumentId: string | null;

  // Note: Document entity relationship commented out until we confirm Document entity structure
  // @ManyToOne(() => Document, { nullable: true })
  // @JoinColumn({ name: 'settlement_agreement_document_id' })
  // settlementAgreementDocument?: Document;

  // ========================================================================
  // TIMESTAMPS
  // ========================================================================

  @ApiProperty({
    description: 'Timestamp when the offer was created',
    example: '2024-04-01T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the offer was last updated',
    example: '2024-04-15T14:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
