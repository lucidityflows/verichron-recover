import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PortfolioStatus, DebtCategory } from '@verichron/enums';
import { UserPortfolioPermission } from './user-portfolio-permission.entity';
import type { Debt } from '../../debts/entities/debt.entity';

/**
 * Portfolio Entity
 * 
 * Represents a grouping of debts, typically from a single purchase or acquisition.
 * Portfolios are the unit of organization for debt collection operations.
 * 
 * Key Design Principles:
 * - One portfolio belongs to one organization at a time
 * - User access is granted at the portfolio level (not individual debts)
 * - Status transitions follow a defined lifecycle (PROVISIONING → ACTIVE → CLOSED/SOLD)
 * - Transfer between organizations is tracked via status change to SOLD
 * 
 * Authorization:
 * - Layer 1: JWT must contain portfolio:read, portfolio:update, etc. permissions
 * - Layer 2: Not applicable to portfolios (portfolios don't have parent portfolios)
 * - Portfolios control Layer 2 authorization for debts via user_portfolio_permission table
 */
@Entity({ name: 'portfolios' })
@Index(['organizationId', 'status'])
@Index(['organizationId', 'name'])
export class Portfolio {
  @ApiProperty({
    description: 'Unique portfolio identifier',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization (tenant) that owns this portfolio',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ApiProperty({
    description: 'Human-readable name for the portfolio',
    example: 'Q1 2024 Credit Card Purchase - First National Bank',
    maxLength: 255,
  })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({
    description: 'Current lifecycle status of the portfolio',
    enum: PortfolioStatus,
    example: PortfolioStatus.ACTIVE,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: PortfolioStatus,
    default: PortfolioStatus.PROVISIONING,
  })
  status: PortfolioStatus;

  @ApiProperty({
    description: 'Date the portfolio was acquired by the organization',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate: Date;

  @ApiProperty({
    description: 'Amount paid to acquire this portfolio in USD',
    example: 250000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @Column({
    name: 'purchase_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  purchasePrice: string;

  @ApiProperty({
    description: 'Sum of all debt principal amounts in this portfolio. Set during import, not dynamically calculated.',
    example: 1500000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @Column({
    name: 'total_principal',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  totalPrincipal: string;

  @ApiProperty({
    description: 'Origin/source of the portfolio (e.g., creditor name, acquisition details)',
    example: 'First National Bank - Charged-off Credit Cards',
    maxLength: 500,
  })
  @Column({ name: 'source', type: 'varchar', length: 500 })
  source: string;

  @ApiProperty({
    description: 'Primary debt category hint (optional). Indicates the predominant debt type in this portfolio, but portfolio can contain mixed types.',
    enum: DebtCategory,
    enumName: 'DebtCategory',
    example: DebtCategory.MEDICAL,
    nullable: true,
  })
  @Column({
    name: 'primary_debt_category',
    type: 'enum',
    enum: DebtCategory,
    nullable: true,
  })
  primaryDebtCategory: DebtCategory | null;

  @ApiProperty({
    description: 'Flexible user-defined tags for portfolio organization and filtering (e.g., ["Q2-2024", "Broker-XYZ", "High-Risk"])',
    example: ['Q2-2024', 'Broker-Triton', 'Consumer-Mix'],
    type: String,
    isArray: true,
  })
  @Column({ name: 'portfolio_tags', type: 'text', array: true, default: '{}' })
  portfolioTags: string[];

  @ApiProperty({
    description: 'Business context and notes about this portfolio acquisition',
    example: 'Mixed consumer portfolio from Triton Financial. Focus on accounts under $5k. Purchased at 18% of face value.',
    nullable: true,
  })
  @Column({ name: 'business_description', type: 'text', nullable: true })
  businessDescription: string | null;

  @ApiProperty({
    description: 'Timestamp when the portfolio record was created',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the portfolio record was last updated',
    example: '2024-01-20T14:45:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * One-to-many relationship with debts.
   */
  @OneToMany('Debt', (debt: Debt) => debt.portfolio)
  debts: Debt[];

  /**
   * One-to-many relationship with user portfolio permissions.
   */
  @OneToMany(
    () => UserPortfolioPermission,
    (permission) => permission.portfolio,
    { cascade: true },
  )
  userPermissions: UserPortfolioPermission[];
}