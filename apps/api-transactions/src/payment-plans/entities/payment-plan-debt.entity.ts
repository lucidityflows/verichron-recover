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
import { PaymentPlan } from './payment-plan.entity';

/**
 * PaymentPlanDebt Entity (Join Table)
 *
 * Represents the many-to-many relationship between payment plans and debts.
 * A payment plan can consolidate multiple debts.
 * A debt can only belong to one ACTIVE plan at a time (enforced by business logic).
 *
 * @entity payment_plan_debt
 */
@Entity('payment_plan_debt')
@Index(['paymentPlanId'])
@Index(['debtId'])
@Index(['paymentPlanId', 'debtId'], { unique: true })
export class PaymentPlanDebt {
  @ApiProperty({
    description: 'Unique identifier for this plan-debt association',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique plan-debt association identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Payment plan UUID',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
  })
  @Column('uuid', {
    name: 'payment_plan_id',
    nullable: false,
    comment: 'Foreign key to payment_plan',
  })
  paymentPlanId: string;

  @ApiProperty({
    description: 'Debt UUID from api-debts service',
    example: '789e0123-e89b-12d3-a456-426614174999',
    format: 'uuid',
  })
  @Column('uuid', {
    name: 'debt_id',
    nullable: false,
    comment: 'Foreign key to api-debts.debt (cross-service reference)',
  })
  debtId: string;

  @ApiProperty({
    description: 'Snapshot of debt balance at time of plan creation',
    example: 500.00,
    type: 'number',
    format: 'decimal',
  })
  @Column('decimal', {
    name: 'debt_balance_at_creation',
    precision: 10,
    scale: 2,
    nullable: false,
    comment: 'Debt balance when plan was created - for reference/audit',
  })
  debtBalanceAtCreation: number;

  @ApiProperty({
    description: 'Timestamp when this association was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp when association was created',
  })
  createdAt: Date;

  /**
   * Relationship to PaymentPlan
   */
  @ManyToOne(() => PaymentPlan, (plan) => plan.debts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_plan_id' })
  paymentPlan: PaymentPlan;
}
