import { ApiProperty } from '@nestjs/swagger';

/**
 * Single dimension data point for flow analytics
 */
export class FlowDimensionDataDto {
  @ApiProperty({
    description: 'Dimension value (e.g., debt category, portfolio ID)',
    example: 'MEDICAL',
  })
  dimensionValue: string;

  @ApiProperty({
    description: 'Display label for this dimension value',
    example: 'Medical Debt',
  })
  label: string;

  @ApiProperty({
    description: 'Total principal amount for this dimension',
    example: '125000.50',
  })
  totalPrincipal: string;

  @ApiProperty({
    description: 'Number of debts in this dimension',
    example: 150,
  })
  debtCount: number;
}

/**
 * Response DTO for flow analytics internal endpoint (debts)
 */
export class FlowAnalyticsDebtResponseDto {
  @ApiProperty({
    description: 'Debts grouped by the requested dimension',
    type: [FlowDimensionDataDto],
  })
  debtsByDimension: FlowDimensionDataDto[];
}
