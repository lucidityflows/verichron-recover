import { ApiProperty } from '@nestjs/swagger';

/**
 * Single dimension data point for flow analytics
 */
export class FlowDimensionDataDto {
  @ApiProperty({
    description: 'Dimension value (e.g., state abbreviation)',
    example: 'CA',
  })
  dimensionValue: string;

  @ApiProperty({
    description: 'Display label for this dimension value',
    example: 'California',
  })
  label: string;

  @ApiProperty({
    description: 'Total number of debtors for this dimension',
    example: 150,
  })
  totalDebtors: number;
}

/**
 * Response DTO for flow analytics internal endpoint (debtors)
 */
export class FlowAnalyticsDebtorResponseDto {
  @ApiProperty({
    description: 'Debtors grouped by the requested dimension',
    type: [FlowDimensionDataDto],
  })
  debtorsByDimension: FlowDimensionDataDto[];
}
