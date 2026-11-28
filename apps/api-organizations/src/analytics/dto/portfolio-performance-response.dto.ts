import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  IPortfolioPerformance,
  IPortfolioPerformanceResponse,
} from '@verichron/contracts';
import { DebtCategory } from '@verichron/enums';

/**
 * Individual portfolio performance metrics
 */
export class PortfolioPerformanceDto implements IPortfolioPerformance {
  @ApiProperty({
    description: 'Portfolio unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  portfolioId!: string;

  @ApiProperty({
    description: 'Portfolio name',
    example: 'Medical Debt Portfolio 2024',
  })
  portfolioName!: string;

  @ApiProperty({
    description: 'Purchase price (amount invested) as decimal string',
    example: '125000.00',
  })
  purchasePrice!: string;

  @ApiProperty({
    description: 'Total principal amount of all debts as decimal string',
    example: '450000.00',
  })
  totalPrincipal!: string;

  @ApiProperty({
    description: 'Total amount collected as decimal string',
    example: '180000.00',
  })
  totalCollected!: string;

  @ApiProperty({
    description: 'Recovery rate percentage (0-100)',
    example: 40.0,
  })
  recoveryRate!: number;

  @ApiProperty({
    description: 'Return on investment percentage',
    example: 44.0,
  })
  roi!: number;

  @ApiProperty({
    description: 'Total number of debts in portfolio',
    example: 150,
  })
  debtCount!: number;

  @ApiProperty({
    description: 'Number of active debts',
    example: 120,
  })
  activeDebts!: number;

  @ApiProperty({
    description: 'Number of paid debts',
    example: 30,
  })
  paidDebts!: number;

  @ApiProperty({
    description: 'Number of payment plans',
    example: 25,
  })
  paymentPlanCount!: number;

  @ApiProperty({
    description: 'Average days from debt creation to first payment',
    example: 45,
    nullable: true,
  })
  avgDaysToFirstPayment!: number | null;

  @ApiPropertyOptional({
    description: 'Primary debt category in portfolio',
    enum: DebtCategory,
    enumName: 'DebtCategory',
    example: DebtCategory.MEDICAL,
  })
  primaryDebtCategory?: DebtCategory;

  @ApiProperty({
    description: 'Portfolio tags for filtering and categorization',
    type: [String],
    example: ['high-value', 'medical'],
  })
  portfolioTags!: string[];
}

/**
 * Response DTO for portfolio performance analytics
 */
@Exclude()
export class PortfolioPerformanceResponseDto
  implements IPortfolioPerformanceResponse
{
  @Expose()
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orgId!: string;

  @Expose()
  @ApiProperty({
    description: 'Total number of portfolios (before pagination)',
    example: 15,
  })
  totalPortfolios!: number;

  @Expose()
  @ApiProperty({
    description: 'Portfolio performance data (paginated)',
    type: PortfolioPerformanceDto,
    isArray: true,
  })
  portfolios!: PortfolioPerformanceDto[];

  @Expose()
  @ApiProperty({
    description: 'Overall recovery rate across all portfolios (percentage 0-100)',
    example: 38.5,
  })
  overallRecoveryRate!: number;

  @Expose()
  @ApiProperty({
    description: 'Total amount invested across all portfolios (decimal string)',
    example: '2500000.00',
  })
  totalInvested!: string;

  @Expose()
  @ApiProperty({
    description: 'Total amount collected across all portfolios (decimal string)',
    example: '950000.00',
  })
  totalPaymentsCollected!: string;

  @Expose()
  @ApiProperty({
    description: 'Current page number (1-indexed)',
    example: 1,
  })
  page!: number;

  @Expose()
  @ApiProperty({
    description: 'Number of portfolios per page',
    example: 20,
  })
  pageSize!: number;

  @Expose()
  @ApiProperty({
    description: 'Total number of pages available',
    example: 1,
  })
  totalPages!: number;

  @Expose()
  @ApiProperty({
    description: 'ISO 8601 timestamp when report was generated',
    example: '2025-10-18T14:30:00.000Z',
  })
  generatedAt!: string;
}
