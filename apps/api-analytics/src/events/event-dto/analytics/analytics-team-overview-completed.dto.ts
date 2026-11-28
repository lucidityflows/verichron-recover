import { AnalyticsTeamOverviewCompletedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TeamOverviewResponseDto } from '../../../dashboards/collectors/dto/team-overview-response.dto';

export class AnalyticsTeamOverviewCompletedDto implements AnalyticsTeamOverviewCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  correlationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TeamOverviewResponseDto)
  overview?: TeamOverviewResponseDto;

  @IsString()
  @IsOptional()
  error?: string;
}
