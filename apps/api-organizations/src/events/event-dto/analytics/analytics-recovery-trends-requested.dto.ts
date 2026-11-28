import { AnalyticsRecoveryTrendsRequestedPayload } from '@verichron/events';
import { IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RecoveryTrendsQueryDto } from '../../../analytics/dto/recovery-trends-query.dto';

export class AnalyticsRecoveryTrendsRequestedDto implements AnalyticsRecoveryTrendsRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @ValidateNested()
  @Type(() => RecoveryTrendsQueryDto)
  query: RecoveryTrendsQueryDto;
}
