import { AnalyticsDashboardSummaryRequestedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AnalyticsDashboardSummaryRequestedDto implements AnalyticsDashboardSummaryRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @IsString()
  @IsOptional()
  date?: string;
}
