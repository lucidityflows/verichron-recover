import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { Sex, Race, MaritalStatus, EmploymentStatus, EducationLevel, BankruptcyType } from '@verichron/enums';

/**
 * Debtor Demographics Entity
 *
 * Stores sensitive PII and demographic data for debtors.
 * 1:1 relationship with DebtorProfile entity.
 * All fields are nullable to support sparse data scenarios.
 *
 * SECURITY NOTES:
 * - SSN fields use encryption at rest (Google Cloud KMS)
 * - Access to this entity requires elevated permissions
 * - All access is logged via lastAccessedAt/lastAccessedBy
 * - Compliant with FDCPA, FCRA, and other regulations
 */
@Entity('debtor_demographics')
@Index(['debtorProfileId'], { unique: true })
export class DebtorDemographics {
  @ApiProperty({
    description: 'Unique demographics record identifier',
    example: '123e4567-e89b-12d3-a456-426614174005',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique demographics record identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Debtor Profile ID this demographics record belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @Column({
    name: 'debtor_profile_id',
    type: 'uuid',
    nullable: false,
    unique: true,
    comment: 'Foreign key to debtor profile - 1:1 relationship',
  })
  debtorProfileId: string;

  // ============================================================================
  // SSN Fields (Encrypted)
  // ============================================================================

  @ApiPropertyOptional({
    description: 'Encrypted SSN (full 9 digits)',
    example: null,
  })
  @Column({
    name: 'ssn_encrypted',
    type: 'text',
    nullable: true,
    comment: 'Encrypted full SSN using Google Cloud KMS',
  })
  ssnEncrypted?: string;

  @ApiPropertyOptional({
    description: 'Last 4 digits of SSN (for display/verification)',
    example: '1234',
    maxLength: 4,
  })
  @Column({
    name: 'ssn_last_four',
    type: 'varchar',
    length: 4,
    nullable: true,
    comment: 'Last 4 digits of SSN for display purposes',
  })
  @Index()
  ssnLastFour?: string;

  @ApiPropertyOptional({
    description: 'Hash of full SSN for duplicate detection',
    example: null,
  })
  @Column({
    name: 'ssn_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'SHA-256 hash of SSN for duplicate detection',
  })
  @Index()
  ssnHash?: string;

  // ============================================================================
  // Personal Demographics
  // ============================================================================

  @ApiPropertyOptional({
    description: 'Sex/Gender',
    example: 'MALE',
    enum: ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY', 'OTHER'],
  })
  @Column({
    name: 'sex',
    type: 'enum',
    enum: ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY', 'OTHER'],
    nullable: true,
    comment: 'Sex/Gender',
  })
  sex?: Sex;

  @ApiPropertyOptional({
    description: 'Race/Ethnicity',
    example: 'WHITE',
    enum: [
      'AMERICAN_INDIAN_ALASKA_NATIVE',
      'ASIAN',
      'BLACK_AFRICAN_AMERICAN',
      'HISPANIC_LATINO',
      'NATIVE_HAWAIIAN_PACIFIC_ISLANDER',
      'WHITE',
      'TWO_OR_MORE_RACES',
      'PREFER_NOT_TO_SAY',
      'OTHER',
    ],
  })
  @Column({
    name: 'race',
    type: 'enum',
    enum: [
      'AMERICAN_INDIAN_ALASKA_NATIVE',
      'ASIAN',
      'BLACK_AFRICAN_AMERICAN',
      'HISPANIC_LATINO',
      'NATIVE_HAWAIIAN_PACIFIC_ISLANDER',
      'WHITE',
      'TWO_OR_MORE_RACES',
      'PREFER_NOT_TO_SAY',
      'OTHER',
    ],
    nullable: true,
    comment: 'Race/Ethnicity',
  })
  race?: Race;

  @ApiPropertyOptional({
    description: 'Marital status',
    example: 'SINGLE',
    enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED', 'OTHER'],
  })
  @Column({
    name: 'marital_status',
    type: 'enum',
    enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED', 'OTHER'],
    nullable: true,
    comment: 'Marital status',
  })
  maritalStatus?: MaritalStatus;

  @ApiPropertyOptional({
    description: 'Number of dependents',
    example: 2,
    minimum: 0,
  })
  @Column({
    name: 'number_of_dependents',
    type: 'int',
    nullable: true,
    comment: 'Number of dependents',
  })
  numberOfDependents?: number;

  @ApiPropertyOptional({
    description: 'Preferred language',
    example: 'ENGLISH',
    enum: ['ENGLISH', 'SPANISH', 'FRENCH', 'OTHER'],
  })
  @Column({
    name: 'preferred_language',
    type: 'enum',
    enum: ['ENGLISH', 'SPANISH', 'FRENCH', 'OTHER'],
    nullable: true,
    default: 'ENGLISH',
    comment: 'Preferred language for communications',
  })
  preferredLanguage?: 'ENGLISH' | 'SPANISH' | 'FRENCH' | 'OTHER';

  // ============================================================================
  // Financial Demographics
  // ============================================================================

  @ApiPropertyOptional({
    description: 'Annual income (in dollars)',
    example: 50000,
    minimum: 0,
  })
  @Column({
    name: 'annual_income',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: 'Annual income in dollars',
  })
  annualIncome?: number;

  @ApiPropertyOptional({
    description: 'Employment status',
    example: 'EMPLOYED_FULL_TIME',
    enum: [
      'EMPLOYED_FULL_TIME',
      'EMPLOYED_PART_TIME',
      'SELF_EMPLOYED',
      'UNEMPLOYED',
      'RETIRED',
      'STUDENT',
      'DISABLED',
      'OTHER',
    ],
  })
  @Column({
    name: 'employment_status',
    type: 'enum',
    enum: [
      'EMPLOYED_FULL_TIME',
      'EMPLOYED_PART_TIME',
      'SELF_EMPLOYED',
      'UNEMPLOYED',
      'RETIRED',
      'STUDENT',
      'DISABLED',
      'OTHER',
    ],
    nullable: true,
    comment: 'Employment status',
  })
  employmentStatus?: EmploymentStatus;

  @ApiPropertyOptional({
    description: 'Employer name',
    example: 'Acme Corporation',
    maxLength: 255,
  })
  @Column({
    name: 'employer_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Current employer name',
  })
  employerName?: string;

  @ApiPropertyOptional({
    description: 'Occupation/Job title',
    example: 'Software Engineer',
    maxLength: 255,
  })
  @Column({
    name: 'occupation',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Occupation or job title',
  })
  occupation?: string;

  @ApiPropertyOptional({
    description: 'Education level',
    example: 'BACHELORS',
    enum: [
      'LESS_THAN_HIGH_SCHOOL',
      'HIGH_SCHOOL',
      'SOME_COLLEGE',
      'ASSOCIATES',
      'BACHELORS',
      'MASTERS',
      'DOCTORATE',
      'OTHER',
    ],
  })
  @Column({
    name: 'education_level',
    type: 'enum',
    enum: [
      'LESS_THAN_HIGH_SCHOOL',
      'HIGH_SCHOOL',
      'SOME_COLLEGE',
      'ASSOCIATES',
      'BACHELORS',
      'MASTERS',
      'DOCTORATE',
      'OTHER',
    ],
    nullable: true,
    comment: 'Highest education level completed',
  })
  educationLevel?: EducationLevel;

  // ============================================================================
  // Credit History
  // ============================================================================

  @ApiPropertyOptional({
    description: 'Whether debtor has bankruptcy history',
    example: false,
  })
  @Column({
    name: 'bankruptcy_history',
    type: 'boolean',
    nullable: true,
    comment: 'Whether debtor has bankruptcy history',
  })
  bankruptcyHistory?: boolean;

  @ApiPropertyOptional({
    description: 'Most recent bankruptcy filing date',
    example: '2020-01-15',
    format: 'date',
  })
  @Column({
    name: 'bankruptcy_date',
    type: 'date',
    nullable: true,
    comment: 'Date of most recent bankruptcy filing',
  })
  bankruptcyDate?: Date;

  @ApiPropertyOptional({
    description: 'Type of bankruptcy filed',
    example: 'CHAPTER_7',
    enum: ['CHAPTER_7', 'CHAPTER_11', 'CHAPTER_13', 'OTHER'],
  })
  @Column({
    name: 'bankruptcy_type',
    type: 'enum',
    enum: ['CHAPTER_7', 'CHAPTER_11', 'CHAPTER_13', 'OTHER'],
    nullable: true,
    comment: 'Type of bankruptcy filed',
  })
  bankruptcyType?: BankruptcyType;

  @ApiPropertyOptional({
    description: 'Bankruptcy discharge date',
    example: '2021-06-15',
    format: 'date',
  })
  @Column({
    name: 'bankruptcy_discharge_date',
    type: 'date',
    nullable: true,
    comment: 'Date bankruptcy was discharged',
  })
  bankruptcyDischargeDate?: Date;

  // ============================================================================
  // Audit Trail (Compliance)
  // ============================================================================

  @ApiPropertyOptional({
    description: 'Timestamp when demographics were last accessed',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @Column({
    name: 'last_accessed_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp of last access for audit purposes',
  })
  lastAccessedAt?: Date;

  @ApiPropertyOptional({
    description: 'User ID who last accessed demographics',
    example: '456fcdeb-51a2-43d7-b890-987654321xyz',
    format: 'uuid',
  })
  @Column({
    name: 'last_accessed_by',
    type: 'uuid',
    nullable: true,
    comment: 'User ID who last accessed this record for audit purposes',
  })
  lastAccessedBy?: string;

  // ============================================================================
  // Relationships
  // ============================================================================

  @OneToOne(() => DebtorProfileEntity)
  @JoinColumn({ name: 'debtor_profile_id' })
  debtorProfile: DebtorProfileEntity;

  // ============================================================================
  // Audit Timestamps
  // ============================================================================

  @ApiProperty({
    description: 'Timestamp when demographics record was created',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of demographics record creation',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when demographics record was last updated',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of last demographics record update',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when demographics record was soft deleted',
    example: '2024-01-20T15:45:00Z',
    format: 'date-time',
  })
  @Column({
    name: 'deleted_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Soft delete timestamp - null if record is active',
  })
  deletedAt?: Date;
}
