import { AnalyticsDashboardSummaryCompletedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DashboardSummaryResponseDto } from '../../../dashboards/organizations/dto/dashboard-summary-response.dto';

export class AnalyticsDashboardSummaryCompletedDto implements AnalyticsDashboardSummaryCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DashboardSummaryResponseDto)
  summary?: DashboardSummaryResponseDto;

  @IsString()
  @IsOptional()
  error?: string;
}
