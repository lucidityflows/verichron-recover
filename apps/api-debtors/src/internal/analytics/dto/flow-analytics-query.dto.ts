import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsISO8601, IsEnum } from 'class-validator';
import { FlowDimension } from '@verichron/enums';

/**
 * Query DTO for flow analytics internal endpoint
 * Used by event orchestrator to fetch debtor flow data
 */
export class FlowAnalyticsInternalQueryDto {
  @ApiProperty({
    description: 'Flow dimension to visualize',
    enum: FlowDimension,
    enumName: 'FlowDimension',
  })
  @IsEnum(FlowDimension)
  view: FlowDimension;

  @ApiPropertyOptional({
    description: 'Start date for time range filter (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for time range filter (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
