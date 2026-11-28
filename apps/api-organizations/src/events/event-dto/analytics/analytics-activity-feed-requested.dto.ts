import { AnalyticsActivityFeedRequestedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsInt, Min } from 'class-validator';

export class AnalyticsActivityFeedRequestedDto implements AnalyticsActivityFeedRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number;

  @IsUUID()
  @IsOptional()
  correlationId?: string;
}
