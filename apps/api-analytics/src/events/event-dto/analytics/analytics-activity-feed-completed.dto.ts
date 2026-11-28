import { AnalyticsActivityFeedCompletedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityFeedResponseDto } from '../../../dashboards/activity/dto/activity-feed-response.dto';

export class AnalyticsActivityFeedCompletedDto implements AnalyticsActivityFeedCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ActivityFeedResponseDto)
  activities?: ActivityFeedResponseDto;

  @IsString()
  @IsOptional()
  error?: string;

  @IsUUID()
  @IsOptional()
  correlationId?: string;
}
