import { AnalyticsPortfolioPerformanceCompletedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PortfolioPerformanceResponseDto } from '../../../dashboards/organizations/dto';

export class AnalyticsPortfolioPerformanceCompletedDto implements AnalyticsPortfolioPerformanceCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PortfolioPerformanceResponseDto)
  data?: PortfolioPerformanceResponseDto;

  @IsString()
  @IsOptional()
  error?: string;
}
