import { AnalyticsFlowRequestedPayload } from '@verichron/events';
import { IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FlowAnalyticsQueryDto } from '../../../analytics/dto/flow-analytics-query.dto';

export class AnalyticsFlowRequestedDto implements AnalyticsFlowRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @ValidateNested()
  @Type(() => FlowAnalyticsQueryDto)
  query: FlowAnalyticsQueryDto;
}
