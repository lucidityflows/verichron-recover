import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { IActivityFeed, IActivityFeedItem } from '@verichron/contracts';

/**
 * Activity Feed Response DTO
 * Implements IActivityFeed from @verichron/contracts
 */
export class ActivityFeedResponseDto implements IActivityFeed {
  @IsString()
  organizationId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  activities: IActivityFeedItem[];
}
