import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DebtCategory } from '@verichron/enums';

/**
 * Debt metrics for a single portfolio
 */
export class PortfolioDebtMetricsDto {
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
 * Response from api-debts for portfolio performance
 * Returns debt metrics for each portfolio with pagination
 */
export class PortfolioPerformanceDebtResponseDto {
  @ApiProperty({
    description: 'Total number of portfolios (before pagination)',
    example: 15,
  })
  totalPortfolios!: number;

  @ApiProperty({
    description: 'Debt metrics for each portfolio',
    type: [PortfolioDebtMetricsDto],
  })
  portfolios!: PortfolioDebtMetricsDto[];

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  pageSize!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 1,
  })
  totalPages!: number;
}
