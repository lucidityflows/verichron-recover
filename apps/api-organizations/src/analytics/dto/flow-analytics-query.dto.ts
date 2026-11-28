import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { FlowDimension } from '@verichron/enums';
import { IFlowAnalyticsQuery } from '@verichron/contracts';
import { BaseAnalyticsFiltersDto } from './base-analytics-filters.dto';
import { Type } from 'class-transformer';

/**
 * Flow Analytics Query DTO
 * Extends base filters with flow-specific view dimension
 */
export class FlowAnalyticsQueryDto
  extends BaseAnalyticsFiltersDto
  implements IFlowAnalyticsQuery
{
  @ApiProperty({
    description: 'Flow dimension to visualize (e.g., by category, portfolio, payment method)',
    enum: FlowDimension,
    enumName: 'FlowDimension',
    example: FlowDimension.DEBT_CATEGORY,
  })
  @IsEnum(FlowDimension)
  view!: FlowDimension;

  @ApiPropertyOptional({
    description: 'Minimum value threshold to include in flow visualization (filters out small values)',
    example: 100,
    type: 'number',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minValue?: number;
}
