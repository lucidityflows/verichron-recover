import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import type { Debt } from './debt.entity';

/**
 * DebtDebtor Join Entity
 *
 * Represents the many-to-many relationship between debts and debtors.
 * A debt can have multiple co-debtors (spouses, co-signers), and
 * a debtor can have multiple debts across different portfolios.
 *
 * Key Design Principles:
 * - Explicit join table for better audit control
 * - Stores when the association was created (important for compliance)
 * - Denormalized debtId for efficient queries
 *
 * Business Rules:
 * - A debt must have at least one debtor (enforced at application layer)
 * - The same debtor cannot be associated with the same debt twice
 *
 * Note: The actual debtor records are managed by api-debtors microservice.
 * This entity only stores the debtorId (UUID reference) for loose coupling.
 */
@Entity({ name: 'debt_debtor' })
@Index(['debtId', 'debtorProfileId'], { unique: true })
@Index(['debtorProfileId'])
export class DebtDebtor {
  @ApiProperty({
    description: 'Unique debt-debtor association identifier',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
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
    description: 'Foreign key to the debtor profile record (managed by api-debtors service)',
    example: '3d2e5f4b-1c9a-4e7d-8b2f-6a5c9e1d3f8b',
    format: 'uuid',
  })
  @Column({ name: 'debtor_profile_id', type: 'uuid' })
  debtorProfileId: string;

  @ApiProperty({
    description: 'Timestamp when the association was created',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Many-to-one relationship back to the debt.
   * Using type string to avoid circular dependency issues.
   */
  @ManyToOne('Debt', (debt: Debt) => debt.debtorLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'debt_id' })
  debt: Debt;
}
