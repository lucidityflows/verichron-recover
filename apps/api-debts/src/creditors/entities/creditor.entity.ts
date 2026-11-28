import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Creditor Entity
 *
 * Represents an original creditor (the entity that initially issued the debt).
 * Used for analytics, geographic flows, and entity resolution.
 *
 * ENTITY RESOLUTION STRATEGY:
 * - Primary unique identifier: EIN (Employer Identification Number)
 * - Fuzzy matching on normalized name when EIN unavailable
 * - Address matching as secondary verification
 *
 * DESIGN PRINCIPLES:
 * - Master data pattern: One canonical record per real-world creditor
 * - Supports duplicate detection during debt import
 * - Standardized address shape matches debtor/user/org entities
 * - Denormalized organizationId for tenant isolation
 *
 * BOUNDED CONTEXT:
 * - Owned by: api-debts
 * - Referenced by: Debt entity (creditorId FK)
 * - Used by: Geographic flows orchestrator
 *
 * EIN AVAILABILITY:
 * - Expected to be available in most debt import files
 * - EIN lookup API integration planned for pre-MVP enrichment
 * - Fallback to fuzzy matching when EIN unavailable
 *
 * FUZZY MATCHING APPROACH:
 * - Normalize names: remove Inc/LLC/Corp variations, convert to uppercase
 * - Calculate Levenshtein distance for similarity scoring
 * - Threshold: 85% similarity to flag potential duplicates
 * - Manual review queue for borderline matches
 */
@Entity({ name: 'creditors' })
@Index(['organizationId', 'ein'], { unique: true, where: 'ein IS NOT NULL' })
@Index(['organizationId', 'normalizedName'])
export class Creditor {
  @ApiProperty({
    description: 'Unique creditor identifier',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization that owns this creditor record. Denormalized for tenant isolation.',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // ========================================================================
  // CREDITOR IDENTIFICATION
  // ========================================================================

  @ApiProperty({
    description: 'Legal name of the creditor as it appears in import files',
    example: 'First National Bank of California, Inc.',
    maxLength: 255,
  })
  @Column({ name: 'legal_name', type: 'varchar', length: 255 })
  legalName: string;

  @ApiProperty({
    description: 'Normalized name for fuzzy matching (uppercase, no punctuation, no Inc/LLC/Corp suffixes)',
    example: 'FIRST NATIONAL BANK OF CALIFORNIA',
    maxLength: 255,
  })
  @Column({ name: 'normalized_name', type: 'varchar', length: 255 })
  normalizedName: string;

  @ApiProperty({
    description: 'Employer Identification Number (EIN) - primary unique identifier. 9 digits, format: XX-XXXXXXX',
    example: '94-1234567',
    maxLength: 10,
    nullable: true,
  })
  @Column({ name: 'ein', type: 'varchar', length: 10, nullable: true })
  ein: string | null;

  @ApiProperty({
    description: 'Doing Business As (DBA) name if different from legal name',
    example: 'FNB California',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'dba_name', type: 'varchar', length: 255, nullable: true })
  dbaName: string | null;

  // ========================================================================
  // ADDRESS (Standardized shape matching debtor/user/org entities)
  // ========================================================================

  @ApiProperty({
    description: 'Primary street address line 1',
    example: '123 Main Street',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'street1', type: 'varchar', length: 255, nullable: true })
  street1: string | null;

  @ApiProperty({
    description: 'Street address line 2 (suite, floor, etc.)',
    example: 'Suite 500',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'street2', type: 'varchar', length: 255, nullable: true })
  street2: string | null;

  @ApiProperty({
    description: 'Street address line 3 (additional address details)',
    example: 'Building C',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'street3', type: 'varchar', length: 255, nullable: true })
  street3: string | null;

  @ApiProperty({
    description: 'City',
    example: 'San Francisco',
    maxLength: 100,
    nullable: true,
  })
  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @ApiProperty({
    description: 'State (2-letter code)',
    example: 'CA',
    maxLength: 2,
    nullable: true,
  })
  @Column({ name: 'state', type: 'varchar', length: 2, nullable: true })
  state: string | null;

  @ApiProperty({
    description: 'Postal code (5 or 9 digit ZIP code). System standard: postalCode instead of zipCode.',
    example: '94102',
    maxLength: 10,
    nullable: true,
  })
  @Column({ name: 'postal_code', type: 'varchar', length: 10, nullable: true })
  postalCode: string | null;

  @ApiProperty({
    description: 'Country (ISO 3166-1 alpha-2 code)',
    example: 'US',
    maxLength: 2,
    default: 'US',
  })
  @Column({ name: 'country', type: 'varchar', length: 2, default: 'US' })
  country: string;

  @ApiProperty({
    description: 'Latitude for geocoding (used for geographic flows visualization)',
    example: 37.7749,
    type: 'number',
    nullable: true,
  })
  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @ApiProperty({
    description: 'Longitude for geocoding (used for geographic flows visualization)',
    example: -122.4194,
    type: 'number',
    nullable: true,
  })
  @Column({ name: 'longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  // ========================================================================
  // ENTITY RESOLUTION & DEDUPLICATION
  // ========================================================================

  @ApiProperty({
    description: 'Whether this creditor is the canonical master record (vs. duplicate)',
    example: true,
    type: 'boolean',
    default: true,
  })
  @Column({ name: 'is_master_record', type: 'boolean', default: true })
  isMasterRecord: boolean;

  @ApiProperty({
    description: 'If duplicate: Reference to the master creditor record',
    example: 'a47ac10b-58cc-4372-a567-0e02b2c3d480',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'master_creditor_id', type: 'uuid', nullable: true })
  masterCreditorId: string | null;

  @ApiProperty({
    description: 'Similarity score from fuzzy matching (0-100). Used during deduplication.',
    example: 92.5,
    type: 'number',
    nullable: true,
  })
  @Column({ name: 'match_confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  matchConfidenceScore: number | null;

  @ApiProperty({
    description: 'Whether this creditor was verified/enriched via EIN lookup API',
    example: true,
    type: 'boolean',
    default: false,
  })
  @Column({ name: 'ein_verified', type: 'boolean', default: false })
  einVerified: boolean;

  // ========================================================================
  // GLOBAL CREDITOR LINKING (Platform-Level Intelligence)
  // ========================================================================

  @ApiProperty({
    description: 'Foreign key to platform-owned global_creditors table. Links this org-owned creditor to platform truth.',
    example: 'c1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'global_creditor_id', type: 'uuid', nullable: true })
  globalCreditorId: string | null;

  @ApiProperty({
    description: 'Whether this creditor is linked to a platform-verified global creditor (from Gold List or platform-curated data)',
    example: true,
    type: 'boolean',
    default: false,
  })
  @Column({ name: 'is_platform_verified', type: 'boolean', default: false })
  isPlatformVerified: boolean;

  @ApiProperty({
    description: 'Confidence score of the global creditor match (0-100). 95+ = high confidence, 70-94 = medium, 40-69 = low',
    example: 97.5,
    type: 'number',
    nullable: true,
  })
  @Column({ name: 'global_link_confidence', type: 'decimal', precision: 5, scale: 2, nullable: true })
  globalLinkConfidence: number | null;

  @ApiProperty({
    description: 'Whether this creditor has an unresolved conflict in the creditor_conflicts queue. Used to trigger warnings in UI.',
    example: false,
    type: 'boolean',
    default: false,
  })
  @Column({ name: 'has_unresolved_conflict', type: 'boolean', default: false })
  hasUnresolvedConflict: boolean;

  @ApiProperty({
    description: 'Data quality score (0-100). Calculated from: EIN presence, address completeness, duplicate count, conflict resolution status.',
    example: 85,
    type: 'integer',
    nullable: true,
  })
  @Column({ name: 'hygiene_score', type: 'integer', nullable: true })
  hygieneScore: number | null;

  // ========================================================================
  // METADATA & ANALYTICS
  // ========================================================================

  @ApiProperty({
    description: 'Industry classification (NAICS code or free text)',
    example: 'Banking',
    maxLength: 100,
    nullable: true,
  })
  @Column({ name: 'industry', type: 'varchar', length: 100, nullable: true })
  industry: string | null;

  @ApiProperty({
    description: 'Total number of debts associated with this creditor',
    example: 1523,
    type: 'integer',
    default: 0,
  })
  @Column({ name: 'debt_count', type: 'integer', default: 0 })
  debtCount: number;

  @ApiProperty({
    description: 'Total principal amount of all debts from this creditor',
    example: 2500000.00,
    type: 'number',
    format: 'decimal',
    default: 0,
  })
  @Column({
    name: 'total_principal',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  totalPrincipal: string;

  @ApiProperty({
    description: 'Notes about this creditor (compliance flags, special instructions, etc.)',
    nullable: true,
  })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    description: 'Timestamp when the creditor record was created',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the creditor record was last updated',
    example: '2024-01-20T14:45:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
