import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Single debt period data point
 */
export class DebtPeriodDataDto {
  @ApiProperty({
    description: 'Period identifier (ISO date or quarter string)',
    example: '2024-01',
  })
  period!: string;

  @ApiProperty({
    description: 'Total principal owed in this period (decimal as string)',
    example: '125000.50',
  })
  totalPrincipal!: string;

  @ApiProperty({
    description: 'Number of debts in this period',
    example: 45,
  })
  debtCount!: number;

  @ApiPropertyOptional({
    description: 'Group key (debt category or portfolio ID)',
    example: 'MEDICAL',
  })
  groupKey?: string;
}

/**
 * Response from api-debts for recovery trends
 * Returns debt data grouped by period
 */
export class RecoveryTrendsDebtResponseDto {
  @ApiProperty({
    description: 'Debt data points grouped by period',
    type: [DebtPeriodDataDto],
  })
  debtsOverTime!: DebtPeriodDataDto[];
}
