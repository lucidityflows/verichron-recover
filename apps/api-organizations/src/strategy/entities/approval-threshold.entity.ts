import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum AuthorityRoleType {
  COLLECTOR = 'COLLECTOR',
  TEAM_LEAD = 'TEAM_LEAD',
  MANAGER = 'MANAGER',
}

/**
 * ApprovalThreshold
 * 
 * Defines the "Authority Ladder". Offers exceeding these thresholds
 * are blocked and routed to the Escalation Inbox.
 */
@Entity('approval_thresholds')
@Index(['organizationId', 'roleType'], { unique: true })
export class ApprovalThreshold {
  @ApiProperty({ example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ApiProperty({ enum: AuthorityRoleType, enumName: 'AuthorityRoleType' })
  @Column({
    type: 'enum',
    enum: AuthorityRoleType,
    name: 'role_type',
  })
  roleType!: AuthorityRoleType;

  @ApiProperty({ example: 25.00 })
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'max_discount_percent' })
  maxDiscountPercent!: number;

  @ApiProperty({ example: 5000, required: false })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'max_dollar_amount' })
  maxDollarAmount?: number; // Optional cap on total discount dollars

  @ApiProperty({ example: 12 })
  @Column({ type: 'integer', default: 12, name: 'max_plan_duration_months' })
  maxPlanDurationMonths!: number;

  @ApiProperty({ example: 10.00 })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00, name: 'min_down_payment_percent' })
  minDownPaymentPercent!: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}