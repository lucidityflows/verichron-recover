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
import { DebtorDocumentType } from '@verichron/enums';

/**
 * Document Entity
 * 
 * Stores metadata and references to debtor-specific documents stored in
 * Google Cloud Storage. This entity does NOT store file content, only
 * references and metadata.
 * 
 * Documents include:
 * - Proof of address
 * - Verification records
 * - Identity documents
 * - Bankruptcy documents
 * - Correspondence
 * 
 * Files are stored in GCS with path structure:
 * gs://debtors-documents/{organizationId}/{debtorId}/{documentId}-{filename}
 */
@Entity('documents')
@Index(['debtorProfileId', 'documentType'])
@Index(['debtorProfileId', 'createdAt'])
export class Document {
  @ApiProperty({
    description: 'Unique document identifier',
    example: '123e4567-e89b-12d3-a456-426614174006',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique document identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Debtor Profile ID this document belongs to',
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
    description: 'Document type/category',
    example: 'PROOF_OF_ADDRESS',
    enum: [
      'PROOF_OF_ADDRESS',
      'VERIFICATION_RECORD',
      'IDENTITY_DOCUMENT',
      'BANKRUPTCY_DOCUMENT',
      'CORRESPONDENCE',
      'COURT_DOCUMENT',
      'PAYMENT_AGREEMENT',
      'OTHER',
    ],
  })
  @Column({
    name: 'document_type',
    type: 'enum',
    enum: [
      'PROOF_OF_ADDRESS',
      'VERIFICATION_RECORD',
      'IDENTITY_DOCUMENT',
      'BANKRUPTCY_DOCUMENT',
      'CORRESPONDENCE',
      'COURT_DOCUMENT',
      'PAYMENT_AGREEMENT',
      'OTHER',
    ],
    comment: 'Type/category of document',
  })
  @Index()
  documentType: DebtorDocumentType;

  @ApiProperty({
    description: 'Original filename as uploaded',
    example: 'proof-of-address-utility-bill.pdf',
    maxLength: 255,
  })
  @Column({
    name: 'original_filename',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Original filename from upload',
  })
  originalFilename: string;

  @ApiProperty({
    description: 'Stored filename in GCS (includes document ID prefix)',
    example: '123e4567-e89b-12d3-a456-426614174006-proof-of-address-utility-bill.pdf',
    maxLength: 300,
  })
  @Column({
    name: 'stored_filename',
    type: 'varchar',
    length: 300,
    nullable: false,
    comment: 'Filename as stored in GCS (with unique prefix)',
  })
  storedFilename: string;

  @ApiProperty({
    description: 'Full GCS storage path',
    example: 'debtors-documents/org-123/debtor-456/doc-789-file.pdf',
    maxLength: 500,
  })
  @Column({
    name: 'storage_path',
    type: 'varchar',
    length: 500,
    nullable: false,
    comment: 'Full path in GCS bucket',
  })
  storagePath: string;

  @ApiProperty({
    description: 'GCS bucket name',
    example: 'verichron-debtors-documents',
    maxLength: 100,
  })
  @Column({
    name: 'bucket_name',
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'GCS bucket where file is stored',
  })
  bucketName: string;

  @ApiProperty({
    description: 'MIME type of the document',
    example: 'application/pdf',
    maxLength: 100,
  })
  @Column({
    name: 'mime_type',
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'MIME type of the uploaded file',
  })
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 524288,
    type: 'integer',
  })
  @Column({
    name: 'file_size',
    type: 'integer',
    nullable: false,
    comment: 'File size in bytes',
  })
  fileSize: number;

  @ApiPropertyOptional({
    description: 'Optional description of the document',
    example: 'Utility bill from January 2024 showing current address',
  })
  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'User-provided description of the document',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON',
    example: { expirationDate: '2024-12-31', verifiedBy: 'user-123' },
    type: 'object',
    additionalProperties: true,
  })
  @Column({
    name: 'metadata',
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata stored as JSONB',
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tags for categorization and search',
    example: ['verified', 'primary-address', '2024'],
    type: [String],
  })
  @Column({
    name: 'tags',
    type: 'simple-array',
    nullable: true,
    comment: 'Tags for document categorization',
  })
  tags?: string[];

  @ApiProperty({
    description: 'User ID who uploaded the document',
    example: '987fcdeb-51a2-43d7-b890-123456789abc',
    format: 'uuid',
  })
  @Column({
    name: 'uploaded_by',
    type: 'uuid',
    nullable: false,
    comment: 'User ID who uploaded the document',
  })
  @Index()
  uploadedBy: string;

  @ApiProperty({
    description: 'Whether the document has been verified',
    example: false,
    default: false,
  })
  @Column({
    name: 'is_verified',
    type: 'boolean',
    default: false,
    comment: 'Flag indicating if document has been verified/approved',
  })
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'User ID who verified the document',
    example: '987fcdeb-51a2-43d7-b890-123456789abc',
    format: 'uuid',
  })
  @Column({
    name: 'verified_by',
    type: 'uuid',
    nullable: true,
    comment: 'User ID who verified/approved the document',
  })
  verifiedBy?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when document was verified',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @Column({
    name: 'verified_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp when document was verified',
  })
  verifiedAt?: Date;

  @ApiPropertyOptional({
    description: 'Document expiration date (for time-sensitive documents)',
    example: '2024-12-31',
    format: 'date',
  })
  @Column({
    name: 'expires_at',
    type: 'date',
    nullable: true,
    comment: 'Expiration date for time-sensitive documents',
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Whether the document is archived/soft-deleted',
    example: false,
    default: false,
  })
  @Column({
    name: 'is_archived',
    type: 'boolean',
    default: false,
    comment: 'Soft delete flag',
  })
  @Index()
  isArchived: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when document was archived',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @Column({
    name: 'archived_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp when document was archived',
  })
  archivedAt?: Date;

  // Relationship
  @ManyToOne(() => DebtorProfileEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'debtor_profile_id' })
  debtorProfile: DebtorProfileEntity;

  // Audit timestamps
  @ApiProperty({
    description: 'Timestamp when document was uploaded',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of document upload',
  })
  @Index()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when document metadata was last updated',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of last metadata update',
  })
  updatedAt: Date;
}