import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BankruptcyChapter, BankruptcyStatus } from '@verichron/enums';

/**
 * Bankruptcy Filing Entity
 *
 * Tracks bankruptcy cases filed by debtors that affect debt collection.
 * CRITICAL for FDCPA compliance - collection MUST cease upon bankruptcy notification.
 *
 * BOUNDED CONTEXT:
 * - Owned by: api-transactions (legal proceedings affecting transactions)
 * - Related to: Debt entity in api-debts (debtId FK)
 * - Related to: DebtorProfile entity in api-debtors (debtorProfileId FK)
 * - Related to: Document entity (bankruptcy petition, discharge notice, etc.)
 *
 * DESIGN PRINCIPLES:
 * - Multiple occurrences supported: Debtor can file bankruptcy multiple times
 * - One-to-many: One debtor can have multiple bankruptcy filings over time
 * - One-to-many: One bankruptcy can affect multiple debts
 * - Document linkage: Petitions, discharge notices, schedules stored in Document entity
 * - Denormalized current status: Debt entity has bankruptcyStatus field for quick queries
 *
 * FDCPA COMPLIANCE:
 * - Automatic stay: Collection MUST stop immediately upon FILED status
 * - Proof of claim: Creditor must file claim with court within deadline
 * - Stay violations: Can result in sanctions, attorney fees, damages
 * - Discharge: Debt legally eliminated, collection permanently prohibited
 * - Dismissal: Stay lifted, collection can resume
 *
 * USE CASES:
 * - Debtor files Chapter 7, debt discharged (no collection)
 * - Debtor files Chapter 13, debt included in 5-year payment plan
 * - Bankruptcy dismissed, collection resumes
 * - Multiple filings: Chapter 13 dismissed, later files Chapter 7
 * - Conversion: Chapter 13 converted to Chapter 7
 *
 * ANALYTICS USAGE:
 * - Bankruptcy rate by portfolio
 * - Average time to discharge
 * - Discharge vs dismissal rates
 * - Recovery rate on Chapter 13 cases
 */
@Entity({ name: 'bankruptcy_filings' })
@Index(['organizationId', 'debtorProfileId'])
@Index(['organizationId', 'caseNumber'], { unique: true })
@Index(['organizationId', 'status'])
@Index(['filingDate'])
export class BankruptcyFiling {
  @ApiProperty({
    description: 'Unique bankruptcy filing identifier',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization that owns this bankruptcy filing record',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ApiProperty({
    description: 'Debtor profile who filed bankruptcy',
    example: '456e7890-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @Column({ name: 'debtor_profile_id', type: 'uuid' })
  debtorProfileId: string;

  @ApiProperty({
    description: 'Specific debt affected by this bankruptcy (nullable if affects multiple debts)',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'debt_id', type: 'uuid', nullable: true })
  debtId: string | null;

  // ========================================================================
  // BANKRUPTCY CASE DETAILS
  // ========================================================================

  @ApiProperty({
    description: 'Bankruptcy chapter filed (Chapter 7, 11, or 13)',
    enum: BankruptcyChapter,
    example: BankruptcyChapter.CHAPTER_7,
  })
  @Column({
    name: 'chapter',
    type: 'enum',
    enum: BankruptcyChapter,
  })
  chapter: BankruptcyChapter;

  @ApiProperty({
    description: 'Current status of the bankruptcy case',
    enum: BankruptcyStatus,
    example: BankruptcyStatus.PENDING,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: BankruptcyStatus,
    default: BankruptcyStatus.FILED,
  })
  status: BankruptcyStatus;

  @ApiProperty({
    description: 'Court-assigned bankruptcy case number (unique identifier)',
    example: '24-12345',
    maxLength: 50,
  })
  @Column({ name: 'case_number', type: 'varchar', length: 50 })
  caseNumber: string;

  @ApiProperty({
    description: 'Bankruptcy court district (e.g., "N.D. Cal", "S.D.N.Y")',
    example: 'N.D. Cal',
    maxLength: 100,
  })
  @Column({ name: 'court_district', type: 'varchar', length: 100 })
  courtDistrict: string;

  @ApiProperty({
    description: 'Name of the bankruptcy judge (if known)',
    example: 'Hon. Jane Smith',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'judge_name', type: 'varchar', length: 255, nullable: true })
  judgeName: string | null;

  @ApiProperty({
    description: 'Name of the bankruptcy trustee assigned to the case',
    example: 'John Doe, Trustee',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'trustee_name', type: 'varchar', length: 255, nullable: true })
  trusteeName: string | null;

  // ========================================================================
  // IMPORTANT DATES
  // ========================================================================

  @ApiProperty({
    description: 'Date the bankruptcy petition was filed with the court',
    example: '2024-03-15',
    type: 'string',
    format: 'date',
  })
  @Column({ name: 'filing_date', type: 'date' })
  filingDate: Date;

  @ApiProperty({
    description: 'Date of the 341 Meeting of Creditors (typically 20-40 days after filing)',
    example: '2024-04-20',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'meeting_of_creditors_date', type: 'date', nullable: true })
  meetingOfCreditorsDate: Date | null;

  @ApiProperty({
    description: 'Deadline for creditors to file proof of claim',
    example: '2024-06-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'proof_of_claim_deadline', type: 'date', nullable: true })
  proofOfClaimDeadline: Date | null;

  @ApiProperty({
    description: 'Date the bankruptcy was discharged by court order (debts eliminated)',
    example: '2024-08-01',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'discharge_date', type: 'date', nullable: true })
  dischargeDate: Date | null;

  @ApiProperty({
    description: 'Date the bankruptcy case was dismissed without discharge',
    example: '2024-07-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'dismissal_date', type: 'date', nullable: true })
  dismissalDate: Date | null;

  @ApiProperty({
    description: 'Date the case was closed (after discharge or dismissal)',
    example: '2024-08-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'case_closed_date', type: 'date', nullable: true })
  caseClosedDate: Date | null;

  // ========================================================================
  // DEBT TREATMENT IN BANKRUPTCY
  // ========================================================================

  @ApiProperty({
    description: 'Whether this specific debt was included in the bankruptcy schedules',
    example: true,
    type: 'boolean',
    default: false,
  })
  @Column({ name: 'debt_included_in_schedules', type: 'boolean', default: false })
  debtIncludedInSchedules: boolean;

  @ApiProperty({
    description: 'Whether creditor filed proof of claim with the court',
    example: true,
    type: 'boolean',
    default: false,
  })
  @Column({ name: 'proof_of_claim_filed', type: 'boolean', default: false })
  proofOfClaimFiled: boolean;

  @ApiProperty({
    description: 'Date the proof of claim was filed',
    example: '2024-05-01',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'proof_of_claim_filed_date', type: 'date', nullable: true })
  proofOfClaimFiledDate: Date | null;

  @ApiProperty({
    description: 'Amount claimed in proof of claim filing',
    example: 5000.00,
    type: 'number',
    format: 'decimal',
    nullable: true,
  })
  @Column({
    name: 'claimed_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  claimedAmount: string | null;

  @ApiProperty({
    description: 'Whether the debt was discharged in this bankruptcy',
    example: true,
    type: 'boolean',
    default: false,
  })
  @Column({ name: 'debt_discharged', type: 'boolean', default: false })
  debtDischarged: boolean;

  // ========================================================================
  // ATTORNEY INFORMATION
  // ========================================================================

  @ApiProperty({
    description: "Name of debtor's bankruptcy attorney",
    example: 'Smith & Associates Law Firm',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'attorney_name', type: 'varchar', length: 255, nullable: true })
  attorneyName: string | null;

  @ApiProperty({
    description: "Debtor's attorney phone number",
    example: '555-123-4567',
    maxLength: 20,
    nullable: true,
  })
  @Column({ name: 'attorney_phone', type: 'varchar', length: 20, nullable: true })
  attorneyPhone: string | null;

  @ApiProperty({
    description: "Debtor's attorney email address",
    example: 'attorney@smithlaw.com',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'attorney_email', type: 'varchar', length: 255, nullable: true })
  attorneyEmail: string | null;

  // ========================================================================
  // DOCUMENT LINKAGE
  // ========================================================================

  @ApiProperty({
    description: 'Reference to bankruptcy petition document',
    example: 'doc-123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'petition_document_id', type: 'uuid', nullable: true })
  petitionDocumentId: string | null;

  @ApiProperty({
    description: 'Reference to discharge notice document',
    example: 'doc-123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'discharge_document_id', type: 'uuid', nullable: true })
  dischargeDocumentId: string | null;

  @ApiProperty({
    description: 'Reference to schedules document (list of debts and assets)',
    example: 'doc-123e4567-e89b-12d3-a456-426614174002',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'schedules_document_id', type: 'uuid', nullable: true })
  schedulesDocumentId: string | null;

  // ========================================================================
  // NOTES & METADATA
  // ========================================================================

  @ApiProperty({
    description: 'Internal notes about this bankruptcy case (compliance flags, special circumstances, etc.)',
    nullable: true,
  })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    description: 'How the bankruptcy was discovered (DEBTOR_NOTIFICATION, PACER_SEARCH, ATTORNEY_LETTER, etc.)',
    example: 'DEBTOR_NOTIFICATION',
    maxLength: 50,
    nullable: true,
  })
  @Column({ name: 'discovery_method', type: 'varchar', length: 50, nullable: true })
  discoveryMethod: string | null;

  @ApiProperty({
    description: 'User ID who created this bankruptcy record',
    example: '456e7890-e89b-12d3-a456-426614174003',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  // ========================================================================
  // TIMESTAMPS
  // ========================================================================

  @ApiProperty({
    description: 'Timestamp when the bankruptcy record was created in the system',
    example: '2024-03-15T14:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the bankruptcy record was last updated',
    example: '2024-08-01T16:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
