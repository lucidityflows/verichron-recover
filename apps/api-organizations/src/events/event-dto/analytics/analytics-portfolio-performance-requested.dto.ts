import { AnalyticsPortfolioPerformanceRequestedPayload } from '@verichron/events';
import { IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PortfolioPerformanceQueryDto } from '../../../analytics/dto/portfolio-performance-query.dto';

export class AnalyticsPortfolioPerformanceRequestedDto implements AnalyticsPortfolioPerformanceRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @ValidateNested()
  @Type(() => PortfolioPerformanceQueryDto)
  query: PortfolioPerformanceQueryDto;
}
