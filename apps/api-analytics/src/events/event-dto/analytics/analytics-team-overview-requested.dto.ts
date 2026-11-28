import { AnalyticsTeamOverviewRequestedPayload } from '@verichron/events';
import { IsUUID, IsOptional } from 'class-validator';

export class AnalyticsTeamOverviewRequestedDto implements AnalyticsTeamOverviewRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  correlationId?: string;
}
