import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { AnalyticsActivityFeedCompletedPayload } from '@verichron/events';
import { IActivityFeed } from '@verichron/contracts';

export class AnalyticsActivityFeedCompletedDto implements AnalyticsActivityFeedCompletedPayload {
  @IsUUID()
  organizationId!: string;

  @IsObject()
  @IsOptional()
  activities?: IActivityFeed;

  @IsString()
  @IsOptional()
  error?: string;

  @IsString()
  @IsOptional()
  correlationId?: string;
}
