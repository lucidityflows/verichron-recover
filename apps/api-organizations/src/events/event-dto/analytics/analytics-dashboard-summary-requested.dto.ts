
import { AnalyticsDashboardSummaryRequestedPayload } from '@verichron/events';
import { IsUUID } from 'class-validator';

export class AnalyticsDashboardSummaryRequestedDto implements AnalyticsDashboardSummaryRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;
}
