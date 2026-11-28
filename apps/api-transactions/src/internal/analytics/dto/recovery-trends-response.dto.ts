import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Single payment period data point
 */
export class PaymentPeriodDataDto {
  @ApiProperty({
    description: 'Period identifier (ISO date or quarter string)',
    example: '2024-01',
  })
  period!: string;

  @ApiProperty({
    description: 'Total amount collected in this period (decimal as string)',
    example: '24500.75',
  })
  totalCollected!: string;

  @ApiProperty({
    description: 'Number of successful payment transactions',
    example: 42,
  })
  transactionCount!: number;

  @ApiPropertyOptional({
    description: 'Group key (debt category or portfolio ID)',
    example: 'MEDICAL',
  })
  groupKey?: string;
}

/**
 * Response from api-transactions for recovery trends
 * Returns payment data grouped by period
 */
export class RecoveryTrendsPaymentResponseDto {
  @ApiProperty({
    description: 'Payment data points grouped by period',
    type: [PaymentPeriodDataDto],
  })
  payments!: PaymentPeriodDataDto[];
}
