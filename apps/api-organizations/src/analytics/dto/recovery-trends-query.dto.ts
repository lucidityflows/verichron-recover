import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { TrendGranularity, AnalyticsGroupBy } from '@verichron/enums';
import { IRecoveryTrendsQuery } from '@verichron/contracts';
import { BaseAnalyticsFiltersDto } from './base-analytics-filters.dto';

/**
 * Recovery Trends Query DTO
 * Extends base filters with granularity and groupBy options
 */
export class RecoveryTrendsQueryDto
  extends BaseAnalyticsFiltersDto
  implements IRecoveryTrendsQuery
{
  @ApiPropertyOptional({
    description: 'Time period granularity for trend data points',
    enum: TrendGranularity,
    enumName: 'TrendGranularity',
    default: TrendGranularity.MONTHLY,
    example: TrendGranularity.MONTHLY,
  })
  @IsOptional()
  @IsEnum(TrendGranularity)
  granularity?: TrendGranularity;

  @ApiPropertyOptional({
    description: 'Group trends by category (returns multiple series)',
    enum: AnalyticsGroupBy,
    enumName: 'AnalyticsGroupBy',
    default: AnalyticsGroupBy.NONE,
    example: AnalyticsGroupBy.DEBT_CATEGORY,
  })
  @IsOptional()
  @IsEnum(AnalyticsGroupBy)
  groupBy?: AnalyticsGroupBy;
}
