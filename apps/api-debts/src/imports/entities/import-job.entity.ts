import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ImportJobStatus } from '@verichron/enums';

/**
 * ImportJob Entity
 *
 * Tracks the lifecycle and status of bulk debt portfolio imports.
 * Each import job represents one CSV file upload attempting to create
 * a portfolio with associated debts.
 *
 * Key Design Principles:
 * - **Asynchronous processing**: Job created immediately, processing happens async
 * - **All-or-nothing**: Transaction ensures no partial imports on failure
 * - **Detailed error tracking**: errorMessage field captures validation/processing failures
 * - **Progress tracking**: totalRows and processedRows enable progress monitoring
 * - **Idempotency**: Jobs can be retried by uploading same file again (new job created)
 *
 * Workflow:
 * 1. User uploads CSV → Job created with PENDING status
 * 2. Processing begins → Status changes to VALIDATING
 * 3. File parsed and validated → Status changes to PROCESSING
 * 4. Portfolio + Debts created in transaction → Status changes to COMPLETED
 * 5. On any failure → Status changes to FAILED, transaction rolled back
 */
@Entity({ name: 'import_jobs' })
@Index(['organizationId', 'status'])
@Index(['organizationId', 'createdAt'])
export class ImportJob {
  @ApiProperty({
    description: 'Unique import job identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization (tenant) that owns this import job',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ApiProperty({
    description: 'Name for the portfolio to be created from this import',
    example: 'Q1 2024 Credit Card Purchase - First National Bank',
    maxLength: 255,
  })
  @Column({ name: 'portfolio_name', type: 'varchar', length: 255 })
  portfolioName: string;

  @ApiProperty({
    description: 'File storage location (local path or GCS URI)',
    example:
      '/uploads/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/a1b2c3d4-e5f6-7890-abcd-ef1234567890.csv',
    maxLength: 500,
  })
  @Column({ name: 'file_location', type: 'varchar', length: 500 })
  fileLocation: string;

  @ApiProperty({
    description: 'Current processing status of the import job',
    enum: ImportJobStatus,
    example: ImportJobStatus.PROCESSING,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ImportJobStatus,
    default: ImportJobStatus.PENDING,
  })
  status: ImportJobStatus;

  @ApiProperty({
    description: 'Total number of rows in the CSV file (excluding header)',
    example: 1250,
    type: 'number',
    nullable: true,
  })
  @Column({ name: 'total_rows', type: 'integer', nullable: true })
  totalRows: number | null;

  @ApiProperty({
    description: 'Number of rows successfully processed so far',
    example: 850,
    type: 'number',
    default: 0,
  })
  @Column({ name: 'processed_rows', type: 'integer', default: 0 })
  processedRows: number;

  @ApiProperty({
    description:
      'Error message if import failed. Contains validation errors or processing failures.',
    example:
      'Validation failed at row 42: principalAmount must be greater than 0',
    nullable: true,
  })
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @ApiProperty({
    description: 'Portfolio ID if successfully created (null if failed)',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'portfolio_id', type: 'uuid', nullable: true })
  portfolioId: string | null;

  @ApiProperty({
    description:
      'Metadata containing debtor information from CSV import. Used for batch processing by api-debtors.',
    example: {
      debtors: [
        {
          debtorKey: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '5551234567',
          address: {
            streetLine1: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            postalCode: '62701',
          },
          debtIds: ['debt-uuid-1', 'debt-uuid-2'],
        },
      ],
    },
    nullable: true,
  })
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Timestamp when the import job was created',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the import job was last updated',
    example: '2024-01-15T10:35:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
