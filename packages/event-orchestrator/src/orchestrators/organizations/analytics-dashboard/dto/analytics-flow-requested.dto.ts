import { AnalyticsFlowRequestedPayload } from '@verichron/events';
import { IsString, IsUUID, IsObject } from 'class-validator';
import { IFlowAnalyticsQuery } from '@verichron/contracts';

/**
 * DTO for ANALYTICS_FLOW_REQUESTED event
 *
 * Published by api-organizations when flow analytics are requested.
 * Validated by event-orchestrator before processing.
 */
export class AnalyticsFlowRequestedDto implements AnalyticsFlowRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsObject()
  query: IFlowAnalyticsQuery;
}
