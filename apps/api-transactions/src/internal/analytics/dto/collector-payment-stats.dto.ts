import { ApiProperty } from '@nestjs/swagger';

/**
 * Collector Payment Statistics DTO
 *
 * Aggregated payment metrics for a collector within a time period.
 * Used by api-collectors to calculate performance dashboards and leaderboards.
 */
export class CollectorPaymentStatsDto {
  @ApiProperty({
    description: 'Collector user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  collectorUserId!: string;

  @ApiProperty({
    description: 'Total amount collected (in cents)',
    example: 1250000,
  })
  totalCollected!: number;

  @ApiProperty({
    description: 'Number of successful payment transactions',
    example: 45,
  })
  successfulPaymentCount!: number;

  @ApiProperty({
    description: 'Number of unique debtor accounts that made payments',
    example: 38,
  })
  uniquePayingAccounts!: number;

  @ApiProperty({
    description: 'Number of payment plans created',
    example: 12,
  })
  paymentPlansCreated!: number;

  @ApiProperty({
    description: 'Average payment amount (in cents)',
    example: 27777,
  })
  avgPaymentAmount!: number;

  @ApiProperty({
    description: 'Largest single payment (in cents)',
    example: 150000,
  })
  largestPayment!: number;

  @ApiProperty({
    description: 'Start of the reporting period',
    example: '2025-01-01T00:00:00.000Z',
  })
  periodStart!: string;

  @ApiProperty({
    description: 'End of the reporting period',
    example: '2025-01-31T23:59:59.999Z',
  })
  periodEnd!: string;
}

/**
 * Organization Payment Statistics DTO
 *
 * Aggregated payment metrics for all collectors in an organization.
 * Used for leaderboard calculations.
 */
export class OrganizationPaymentStatsDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId!: string;

  @ApiProperty({
    description: 'Payment statistics per collector',
    type: [CollectorPaymentStatsDto],
  })
  collectorStats!: CollectorPaymentStatsDto[];

  @ApiProperty({
    description: 'Start of the reporting period',
    example: '2025-01-01T00:00:00.000Z',
  })
  periodStart!: string;

  @ApiProperty({
    description: 'End of the reporting period',
    example: '2025-01-31T23:59:59.999Z',
  })
  periodEnd!: string;
}
