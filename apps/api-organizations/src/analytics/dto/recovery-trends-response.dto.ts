import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IRecoveryTrendDataPoint, IRecoveryTrendsResponse } from '@verichron/contracts';

/**
 * Single data point in recovery trend
 */
export class RecoveryTrendDataPointDto implements IRecoveryTrendDataPoint {
  @ApiProperty({
    description: 'Period label (e.g., "2025-01", "2025-Q1", "2025-W05")',
    example: '2025-01',
  })
  period!: string;

  @ApiProperty({
    description: 'Principal owed for this period (decimal as string)',
    example: '125000.50',
  })
  principalOwed!: string;

  @ApiProperty({
    description: 'Amount collected for this period (decimal as string)',
    example: '24500.75',
  })
  amountCollected!: string;

  @ApiProperty({
    description: 'Recovery rate for this period (percentage 0-100)',
    example: 19.6,
  })
  recoveryRate!: number;

  @ApiProperty({
    description: 'Number of debts in this period',
    example: 45,
  })
  debtCount!: number;
}

/**
 * Response DTO for recovery trends over time
 */
@Exclude()
export class RecoveryTrendsResponseDto implements IRecoveryTrendsResponse {
  @Expose()
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orgId!: string;

  @Expose()
  @ApiProperty({
    description: 'Start date of analysis (ISO 8601)',
    example: '2025-01-01',
  })
  startDate!: string;

  @Expose()
  @ApiProperty({
    description: 'End date of analysis (ISO 8601)',
    example: '2025-10-18',
  })
  endDate!: string;

  @Expose()
  @ApiProperty({
    description: 'Granularity of trend data',
    example: 'MONTHLY',
  })
  granularity!: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Group by dimension (if grouped)',
    example: 'DEBT_CATEGORY',
  })
  groupBy?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Single series trend data points (when groupBy = NONE or not specified)',
    type: RecoveryTrendDataPointDto,
    isArray: true,
  })
  trends?: RecoveryTrendDataPointDto[];

  @Expose()
  @ApiPropertyOptional({
    description: 'Multiple series trend data points grouped by category (when groupBy is set)',
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: '#/components/schemas/RecoveryTrendDataPointDto' },
    },
    example: {
      'MEDICAL': [{ period: '2025-01', principalOwed: '50000.00', amountCollected: '10000.00', recoveryRate: 20, debtCount: 15 }],
      'CREDIT_CARD': [{ period: '2025-01', principalOwed: '75000.00', amountCollected: '14500.00', recoveryRate: 19.3, debtCount: 30 }],
    },
  })
  trendsByGroup?: Record<string, RecoveryTrendDataPointDto[]>;

  @Expose()
  @ApiProperty({
    description: 'Total amount collected over the period (decimal as string)',
    example: '22000.00',
  })
  totalCollected!: string;

  @Expose()
  @ApiProperty({
    description: 'Overall average recovery rate for the period (percentage 0-100)',
    example: 18.5,
  })
  avgRecoveryRate!: number;

  @Expose()
  @ApiProperty({
    description: 'Timestamp of when these metrics were generated (ISO 8601)',
    example: '2025-10-18T14:30:00.000Z',
  })
  generatedAt!: string;
}
