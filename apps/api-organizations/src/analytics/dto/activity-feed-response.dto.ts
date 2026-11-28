import { ApiProperty } from '@nestjs/swagger';
import { IActivityFeed, IActivityFeedItem } from '@verichron/contracts';
import { ActivityFeedType, ActivitySeverity } from '@verichron/enums';

export class ActivityFeedMetadataDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  userName!: string;

  @ApiProperty({ required: false })
  debtorId?: string;

  @ApiProperty({ required: false })
  debtorName?: string;

  @ApiProperty({ required: false })
  amount?: number;

  @ApiProperty({ type: 'object', additionalProperties: true })
  extra?: Record<string, any>;
}

export class ActivityFeedItemDto implements IActivityFeedItem {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ActivityFeedType, enumName: 'ActivityFeedType' })
  type!: ActivityFeedType;

  @ApiProperty({ enum: ActivitySeverity, enumName: 'ActivitySeverity' })
  severity!: ActivitySeverity;

  @ApiProperty()
  summary!: string;

  @ApiProperty()
  timestamp!: string;

  @ApiProperty({ type: ActivityFeedMetadataDto })
  metadata!: ActivityFeedMetadataDto;
}

export class ActivityFeedResponseDto implements IActivityFeed {
  @ApiProperty()
  organizationId!: string;

  @ApiProperty({ type: [ActivityFeedItemDto] })
  activities!: ActivityFeedItemDto[];
}
