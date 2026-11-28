import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from "@verichron/enums";

/**
 * Document Entity
 * 
 * Stores metadata for payment-related documents.
 * Actual file content is stored in Google Cloud Storage.
 * Documents are primarily auto-generated, not user-uploaded.
 * 
 * @entity document
 */
@Entity('document')
@Index(['organizationId'])
@Index(['debtorId'])
@Index(['documentType'])
@Index(['associatedPlanId'])
@Index(['associatedTransactionId'])
@Index(['organizationId', 'documentType'])
@Index(['organizationId', 'debtorId'])
export class Document {
  @ApiProperty({
    description: 'Unique document identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique document identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Organization that owns this document (denormalized for tenant isolation)',
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
    description: 'Debtor associated with this document',
    example: '321e6543-e89b-12d3-a456-426614174777',
    format: 'uuid',
    required: false,
  })
  @Column('uuid', {
    name: 'debtor_id',
    nullable: true,
    comment: 'Foreign key to api-debtors',
  })
  debtorId: string | null;

  @ApiProperty({
    description: 'Type of document',
    enum: DocumentType,
    example: DocumentType.PAYMENT_RECEIPT,
  })
  @Column({
    type: 'enum',
    enum: DocumentType,
    name: 'document_type',
    nullable: false,
    comment: 'Document type classification',
  })
  documentType: DocumentType;

  @ApiProperty({
    description: 'Human-readable document title',
    example: 'Payment Receipt - Transaction #12345',
  })
  @Column('varchar', {
    name: 'title',
    length: 255,
    nullable: false,
    comment: 'Human-readable document title for UI display',
  })
  title: string;

  @ApiProperty({
    description: 'Google Cloud Storage URI for the document file',
    example: 'gs://payments-docs/org-123/doc-456.pdf',
  })
  @Column('varchar', {
    name: 'storage_path',
    length: 512,
    nullable: false,
    comment: 'GCS URI where document file is stored',
  })
  storagePath: string;

  @ApiProperty({
    description: 'Document MIME type',
    example: 'application/pdf',
  })
  @Column('varchar', {
    name: 'mime_type',
    length: 100,
    nullable: false,
    default: 'application/pdf',
    comment: 'Document MIME type (typically application/pdf)',
  })
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 245678,
    type: 'integer',
  })
  @Column('int', {
    name: 'file_size_bytes',
    nullable: true,
    comment: 'File size in bytes - populated after upload',
  })
  fileSizeBytes: number | null;

  @ApiProperty({
    description: 'Associated payment plan ID (for PAYMENT_AGREEMENT documents)',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
    nullable: true,
  })
  @Column('uuid', {
    name: 'associated_plan_id',
    nullable: true,
    comment: 'Foreign key to payment_plan - null if not plan-related',
  })
  associatedPlanId: string | null;

  @ApiProperty({
    description: 'Associated transaction ID (for PAYMENT_RECEIPT documents)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    nullable: true,
  })
  @Column('uuid', {
    name: 'associated_transaction_id',
    nullable: true,
    comment: 'Foreign key to transaction_history - null if not transaction-related',
  })
  associatedTransactionId: string | null;

  @ApiProperty({
    description: 'Associated debt ID (for INVOICE or PAYMENT_OFFER_LETTER documents)',
    example: '789e0123-e89b-12d3-a456-426614174999',
    format: 'uuid',
    nullable: true,
  })
  @Column('uuid', {
    name: 'associated_debt_id',
    nullable: true,
    comment: 'Foreign key to api-debts - null if not debt-specific',
  })
  associatedDebtId: string | null;

  @ApiProperty({
    description: 'User who generated this document',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @Column('uuid', {
    name: 'created_by_user_id',
    nullable: false,
    comment: 'User who generated the document (system for auto-generated)',
  })
  createdByUserId: string;

  @ApiProperty({
    description: 'Additional metadata for the document',
    example: { 
      generationTimeMs: 1234, 
      templateVersion: 'v2.1',
      includesSignature: false 
    },
    nullable: true,
  })
  @Column('jsonb', {
    name: 'metadata',
    nullable: true,
    comment: 'Additional document metadata (generation time, template version, etc.)',
  })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Timestamp when the document was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp when document was created',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the document metadata was last updated',
    example: '2024-01-15T10:30:05.000Z',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp when document metadata was last updated',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Timestamp when the document was soft-deleted (null if active)',
    example: null,
    nullable: true,
  })
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Soft delete timestamp - null if document is active',
  })
  deletedAt: Date | null;
}