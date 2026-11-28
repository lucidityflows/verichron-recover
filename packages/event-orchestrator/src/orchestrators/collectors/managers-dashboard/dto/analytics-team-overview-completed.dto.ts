import { IsString, IsUUID, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { AnalyticsTeamOverviewCompletedPayload } from '@verichron/events';
import { ITeamOverview } from '@verichron/contracts';

/**
 * Analytics Team Overview Completed DTO
 * 
 * Implements the payload interface for team overview completion events.
 */
export class AnalyticsTeamOverviewCompletedDto implements AnalyticsTeamOverviewCompletedPayload {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsObject()
  @IsOptional()
  overview?: ITeamOverview;

  @IsString()
  @IsOptional()
  error?: string;
}
