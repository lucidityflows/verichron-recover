import { ApiProperty } from '@nestjs/swagger';

/**
 * Payment metrics for a single portfolio
 */
export class PortfolioPaymentMetricsDto {
  @ApiProperty({
    description: 'Portfolio unique identifier (from debt_id mapping)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  portfolioId!: string;

  @ApiProperty({
    description: 'Total amount collected as decimal string',
    example: '180000.00',
  })
  totalCollected!: string;

  @ApiProperty({
    description: 'Number of payment plans for debts in this portfolio',
    example: 25,
  })
  paymentPlanCount!: number;

  @ApiProperty({
    description: 'Average days from debt creation to first payment (null if no payments)',
    example: 45,
    nullable: true,
  })
  avgDaysToFirstPayment!: number | null;
}

/**
 * Response from api-transactions for portfolio performance
 * Returns payment metrics for each portfolio
 */
export class PortfolioPerformancePaymentResponseDto {
  @ApiProperty({
    description: 'Payment metrics for each portfolio',
    type: [PortfolioPaymentMetricsDto],
  })
  portfolios!: PortfolioPaymentMetricsDto[];
}
