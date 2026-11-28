import { ApiProperty } from '@nestjs/swagger';

/**
 * Single dimension data point for flow analytics
 */
export class FlowDimensionDataDto {
  @ApiProperty({
    description: 'Dimension value (e.g., payment method)',
    example: 'VISA',
  })
  dimensionValue: string;

  @ApiProperty({
    description: 'Display label for this dimension value',
    example: 'Visa',
  })
  label: string;

  @ApiProperty({
    description: 'Total payment amount for this dimension',
    example: '125000.50',
  })
  totalAmount: string;

  @ApiProperty({
    description: 'Number of payments in this dimension',
    example: 150,
  })
  paymentCount: number;
}

/**
 * Response DTO for flow analytics internal endpoint (payments)
 */
export class FlowAnalyticsPaymentResponseDto {
  @ApiProperty({
    description: 'Payments grouped by the requested dimension',
    type: [FlowDimensionDataDto],
  })
  paymentsByDimension: FlowDimensionDataDto[];
}
