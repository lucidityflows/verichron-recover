import { ApiProperty } from '@nestjs/swagger';

/**
 * Debt financial metrics for a specific debtor profile (internal endpoint response)
 * The orchestrator will aggregate these by state after fetching state data from api-debtors
 */
export class DebtorDebtMetricsDto {
  @ApiProperty({
    description: 'Debtor profile UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  debtorProfileId: string;

  @ApiProperty({
    description: 'Total debt value for this debtor',
    example: 25000.50,
  })
  totalDebtValue: number;

  @ApiProperty({
    description: 'Average debt value per debt for this debtor',
    example: 5000.25,
  })
  averageDebtValue: number;

  @ApiProperty({
    description: 'Number of debts for this debtor',
    example: 5,
  })
  totalDebts: number;

  @ApiProperty({
    description: 'Number of active debts for this debtor',
    example: 3,
  })
  activeDebts: number;

  @ApiProperty({
    description: 'Number of paid debts for this debtor',
    example: 1,
  })
  paidDebts: number;

  @ApiProperty({
    description: 'Number of defaulted/charged-off debts for this debtor',
    example: 1,
  })
  defaultedDebts: number;

  @ApiProperty({
    description: 'Recovery rate as a percentage (0-100)',
    example: 65.5,
  })
  recoveryRate: number;
}

/**
 * Response DTO for geographic debt analytics (internal endpoint)
 * Returns debt financial metrics grouped by debtor_profile_id
 * The orchestrator will aggregate this data by state
 */
export class GeographicDebtsResponseDto {
  @ApiProperty({
    description: 'Total debt value across all debtors',
    example: 1000000.00,
  })
  totalDebtValue: number;

  @ApiProperty({
    description: 'Debtor-level debt financial metrics',
    type: DebtorDebtMetricsDto,
    isArray: true,
  })
  debtorMetrics: DebtorDebtMetricsDto[];
}

// Keep the old DTO for backwards compatibility with StateDebtMetricsDto exports
export class StateDebtMetricsDto extends DebtorDebtMetricsDto {}
