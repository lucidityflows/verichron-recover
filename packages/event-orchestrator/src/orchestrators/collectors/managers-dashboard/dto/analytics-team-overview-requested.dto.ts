import { IsString, IsUUID, IsOptional } from 'class-validator';
import { AnalyticsTeamOverviewRequestedPayload } from '@verichron/events';

/**
 * Analytics Team Overview Requested DTO
 * 
 * Implements the payload interface for team overview requests.
 */
export class AnalyticsTeamOverviewRequestedDto implements AnalyticsTeamOverviewRequestedPayload {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  correlationId?: string;
}
