import { ApiProperty } from '@nestjs/swagger';

/**
 * Collector Dashboard Payment Metrics DTO
 *
 * Comprehensive payment metrics for a collector's dashboard.
 * Includes both the requested period stats AND today's stats in a single response.
 */
export class CollectorDashboardMetricsDto {
  @ApiProperty({
    description: 'Collector user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  collectorUserId!: string;

  @ApiProperty({
    description: 'Start of the requested reporting period',
    example: '2025-01-01T00:00:00.000Z',
  })
  periodStart!: string;

  @ApiProperty({
    description: 'End of the requested reporting period',
    example: '2025-01-31T23:59:59.999Z',
  })
  periodEnd!: string;

  // Period metrics (for the requested date range)
  @ApiProperty({
    description: 'Total amount collected in the period (in cents)',
    example: 5820000,
  })
  totalCollected!: number;

  @ApiProperty({
    description: 'Number of successful payment transactions in the period',
    example: 45,
  })
  successfulPaymentCount!: number;

  @ApiProperty({
    description: 'Number of unique debtor accounts that made payments in the period',
    example: 38,
  })
  uniquePayingAccounts!: number;

  @ApiProperty({
    description: 'Number of payment plans created in the period',
    example: 12,
  })
  paymentPlansCreated!: number;

  @ApiProperty({
    description: 'Average payment amount in the period (in cents)',
    example: 27777,
  })
  avgPaymentAmount!: number;

  @ApiProperty({
    description: 'Largest single payment in the period (in cents)',
    example: 150000,
  })
  largestPayment!: number;

  // Today's metrics (always for current day regardless of period requested)
  @ApiProperty({
    description: 'Total amount collected today (in cents)',
    example: 125000,
  })
  totalCollectedToday!: number;

  @ApiProperty({
    description: 'Number of successful payment transactions today',
    example: 8,
  })
  successfulPaymentCountToday!: number;

  @ApiProperty({
    description: 'Number of unique debtor accounts that made payments today',
    example: 7,
  })
  uniquePayingAccountsToday!: number;

  @ApiProperty({
    description: 'Number of payment plans created today',
    example: 2,
  })
  paymentPlansCreatedToday!: number;
}
