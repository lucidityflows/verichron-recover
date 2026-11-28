import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DebtOwnershipHistory Entity
 * 
 * **CRITICAL: This is the immutable audit log for debt ownership chain of title.**
 * 
 * Provides legal defensibility and transparency for debt ownership transfers.
 * Each row represents one ownership period for a debt.
 * 
 * Key Design Principles:
 * - **Append-only**: Records are NEVER updated after creation (except soldDate)
 * - **Immutable audit trail**: Once created, the record is permanent
 * - **Chain of title**: Complete history of ownership from original creditor to current owner
 * - **Legal compliance**: Essential for FDCPA compliance and legal defensibility
 * 
 * Ownership Period Structure:
 * - acquiredDate: When this organization acquired the debt
 * - soldDate: When this organization sold the debt (null = current owner)
 * - source: How the debt was acquired (import, purchase, transfer)
 * 
 * Example Chain:
 * ```
 * Entry 1: Org A, acquired 2023-01-01, sold 2024-06-01, source: "Initial Import"
 * Entry 2: Org B, acquired 2024-06-01, sold null, source: "Purchase from Org A"
 * ```
 * 
 * Business Rules:
 * - Each debt can only have ONE record with soldDate = null (current owner)
 * - soldDate must be >= acquiredDate
 * - Records are never deleted (soft delete not applicable)
 * - createdAt timestamp is immutable
 */
@Entity({ name: 'debt_ownership_history' })
@Index(['debtId', 'acquiredDate'])
@Index(['organizationId', 'acquiredDate'])
@Index(['debtId', 'soldDate']) // For finding current owner (WHERE sold_date IS NULL)
export class DebtOwnershipHistory {
  @ApiProperty({
    description: 'Unique ownership history record identifier',
    example: '9a7f3c2e-5d4b-4e8a-9f1c-3e7a5b9d2f4c',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Foreign key to the debt record',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  @Column({ name: 'debt_id', type: 'uuid' })
  debtId: string;

  @ApiProperty({
    description: 'Organization that owned the debt during this period',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ApiProperty({
    description: 'Date when this organization acquired the debt',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @Column({ name: 'acquired_date', type: 'date' })
  acquiredDate: Date;

  @ApiProperty({
    description: 'Date when this organization sold the debt. Null indicates current owner.',
    example: '2024-06-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'sold_date', type: 'date', nullable: true })
  soldDate: Date | null;

  @ApiProperty({
    description: 'Description of how the debt was acquired (e.g., "Initial Import", "Purchase from Org ABC")',
    example: 'Initial Import from First National Bank',
    maxLength: 500,
  })
  @Column({ name: 'source', type: 'varchar', length: 500 })
  source: string;

  @ApiProperty({
    description: 'Timestamp when this history record was created. IMMUTABLE - never updated.',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}