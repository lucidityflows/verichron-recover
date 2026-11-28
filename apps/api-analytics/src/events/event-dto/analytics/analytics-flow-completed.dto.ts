import { AnalyticsFlowCompletedPayload } from '@verichron/events';
import type { IFlowAnalyticsResponse } from '@verichron/contracts';
import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsFlowCompletedDto implements AnalyticsFlowCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  data?: IFlowAnalyticsResponse;

  @IsString()
  @IsOptional()
  error?: string;
}
