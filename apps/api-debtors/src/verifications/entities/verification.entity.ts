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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { VerificationType, VerificationRequestStatus } from '@verichron/enums';

/**
 * Verification Request Entity
 * 
 * Tracks all verification attempts for debtor data validation.
 * 
 * Verification types include:
 * - Address validation (USPS, etc.)
 * - Phone verification (Twilio Lookup, etc.)
 * - Email verification (ZeroBounce, etc.)
 * - SSN verification
 * - Identity verification
 * - Skip tracing (locate missing debtors)
 * - Employment verification
 * 
 * This entity stores the request, status, and results from third-party
 * verification providers.
 */
@Entity('verification_requests')
@Index(['debtorProfileId', 'verificationType'])
@Index(['debtorProfileId', 'status'])
@Index(['createdAt'])
export class VerificationRequest {
  @ApiProperty({
    description: 'Unique verification request identifier',
    example: '123e4567-e89b-12d3-a456-426614174007',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique verification request identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Debtor Profile ID this verification request belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @Column({
    name: 'debtor_profile_id',
    type: 'uuid',
    nullable: false,
    comment: 'Foreign key to debtor profile',
  })
  @Index()
  debtorProfileId: string;

  @ApiProperty({
    description: 'Organization ID for tenant isolation',
    example: '987fcdeb-51a2-43d7-b890-123456789abc',
    format: 'uuid',
  })
  @Column({
    name: 'organization_id',
    type: 'uuid',
    nullable: false,
    comment: 'Foreign key to organization for tenant isolation',
  })
  @Index()
  organizationId: string;

  @ApiProperty({
    description: 'Type of verification being performed',
    example: 'ADDRESS_VERIFICATION',
    enum: [
      'ADDRESS_VERIFICATION',
      'PHONE_VERIFICATION',
      'EMAIL_VERIFICATION',
      'SSN_VERIFICATION',
      'IDENTITY_VERIFICATION',
      'SKIP_TRACE',
      'EMPLOYMENT_VERIFICATION',
    ],
  })
  @Column({
    name: 'verification_type',
    type: 'enum',
    enum: [
      'ADDRESS_VERIFICATION',
      'PHONE_VERIFICATION',
      'EMAIL_VERIFICATION',
      'SSN_VERIFICATION',
      'IDENTITY_VERIFICATION',
      'SKIP_TRACE',
      'EMPLOYMENT_VERIFICATION',
    ],
    comment: 'Type of verification being performed',
  })
  @Index()
  verificationType: VerificationType;

  @ApiProperty({
    description: 'Current status of the verification request',
    example: 'VERIFIED',
    enum: ['PENDING', 'IN_PROGRESS', 'VERIFIED', 'FAILED', 'SKIPPED', 'ERROR'],
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ['PENDING', 'IN_PROGRESS', 'VERIFIED', 'FAILED', 'SKIPPED', 'ERROR'],
    default: 'PENDING',
    comment: 'Current status of verification',
  })
  @Index()
  status: VerificationRequestStatus;

  @ApiProperty({
    description: 'Input data sent to verification provider',
    example: {
      address: {
        streetLine1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
      },
    },
    type: 'object',
    additionalProperties: true,
  })
  @Column({
    name: 'input_data',
    type: 'jsonb',
    nullable: false,
    comment: 'Input data sent to verification provider',
  })
  inputData: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Verification result from provider',
    example: {
      verified: true,
      confidence: 95,
      standardizedAddress: {
        streetLine1: '123 MAIN ST',
        city: 'SAN FRANCISCO',
        state: 'CA',
        postalCode: '94102-1234',
      },
    },
    type: 'object',
    additionalProperties: true,
  })
  @Column({
    name: 'result',
    type: 'jsonb',
    nullable: true,
    comment: 'Verification result from provider',
  })
  result?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Verification confidence score (0-100)',
    example: 95,
    minimum: 0,
    maximum: 100,
  })
  @Column({
    name: 'confidence_score',
    type: 'integer',
    nullable: true,
    comment: 'Confidence score from 0-100',
  })
  confidenceScore?: number;

  @ApiProperty({
    description: 'Whether verification was successful',
    example: true,
  })
  @Column({
    name: 'verified',
    type: 'boolean',
    default: false,
    comment: 'Whether verification passed',
  })
  verified: boolean;

  @ApiPropertyOptional({
    description: 'Name of the verification provider used',
    example: 'USPS',
    maxLength: 100,
  })
  @Column({
    name: 'provider',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Name of verification provider',
  })
  provider?: string;

  @ApiPropertyOptional({
    description: 'Cost of verification in cents',
    example: 50,
    type: 'integer',
  })
  @Column({
    name: 'cost_cents',
    type: 'integer',
    nullable: true,
    comment: 'Cost of verification in cents',
  })
  costCents?: number;

  @ApiPropertyOptional({
    description: 'Error message if verification failed',
    example: 'Provider timeout - unable to connect to verification service',
  })
  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
    comment: 'Error message if verification failed',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Error code from provider',
    example: 'TIMEOUT_ERROR',
    maxLength: 100,
  })
  @Column({
    name: 'error_code',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Error code from provider',
  })
  errorCode?: string;

  @ApiProperty({
    description: 'Number of retry attempts',
    example: 0,
    default: 0,
  })
  @Column({
    name: 'retry_count',
    type: 'integer',
    default: 0,
    comment: 'Number of times verification was retried',
  })
  retryCount: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0...' },
    type: 'object',
    additionalProperties: true,
  })
  @Column({
    name: 'metadata',
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata',
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'User ID who requested the verification',
    example: '987fcdeb-51a2-43d7-b890-123456789abc',
    format: 'uuid',
  })
  @Column({
    name: 'requested_by',
    type: 'uuid',
    nullable: false,
    comment: 'User ID who requested verification',
  })
  @Index()
  requestedBy: string;

  @ApiProperty({
    description: 'Timestamp when verification was requested',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @Column({
    name: 'requested_at',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Timestamp when verification was requested',
  })
  @Index()
  requestedAt: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when verification started processing',
    example: '2024-01-01T00:00:05Z',
    format: 'date-time',
  })
  @Column({
    name: 'started_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp when verification processing started',
  })
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when verification completed',
    example: '2024-01-01T00:00:10Z',
    format: 'date-time',
  })
  @Column({
    name: 'completed_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp when verification completed',
  })
  completedAt?: Date;

  // Relationship
  @ManyToOne(() => DebtorProfileEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'debtor_profile_id' })
  debtorProfile: DebtorProfileEntity;

  // Audit timestamps
  @ApiProperty({
    description: 'Timestamp when record was created',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of record creation',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when record was last updated',
    example: '2024-01-01T00:00:10Z',
    format: 'date-time',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of last record update',
  })
  updatedAt: Date;
}