import { IFlowAnalyticsResponse } from '@verichron/contracts';
import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for ANALYTICS_FLOW_COMPLETED event
 *
 * Published by the AnalyticsOrchestrator when flow analytics have been aggregated.
 * Validated by api-organizations when received.
 */
export class AnalyticsFlowCompletedDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsObject()
  @IsOptional()
  data?: IFlowAnalyticsResponse;

  @IsString()
  @IsOptional()
  error?: string;
}
