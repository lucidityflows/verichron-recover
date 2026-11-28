import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * SettlementAuthorityMatrix
 * 
 * Defines the maximum discount a collector can offer based on 
 * balance tiers and debt age.
 */
@Entity('settlement_authority_matrices')
@Index(['organizationId'])
export class SettlementAuthorityMatrix {
  @ApiProperty({ example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ApiProperty({ example: 0 })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'min_balance' })
  minBalance!: number;

  @ApiProperty({ example: 500, required: false })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'max_balance' })
  maxBalance?: number;

  @ApiProperty({ example: 0 })
  @Column({ type: 'integer', default: 0, name: 'min_age_days' })
  minAgeDays!: number;

  @ApiProperty({ example: 30, required: false })
  @Column({ type: 'integer', nullable: true, name: 'max_age_days' })
  maxAgeDays?: number;

  @ApiProperty({ example: 25.00 })
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'max_discount_percent' })
  maxDiscountPercent!: number; // e.g., 25.00 for 25%

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}