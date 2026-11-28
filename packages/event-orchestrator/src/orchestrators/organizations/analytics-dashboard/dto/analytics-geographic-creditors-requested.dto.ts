import { AnalyticsGeographicCreditorsRequestedPayload } from '@verichron/events';
import { IsString, IsUUID, IsObject } from 'class-validator';
import { IGeographicQuery } from '@verichron/contracts';

/**
 * DTO for ANALYTICS_GEOGRAPHIC_CREDITORS_REQUESTED event
 *
 * Published by api-organizations when geographic creditor analytics are requested.
 * Validated by event-orchestrator before processing.
 */
export class AnalyticsGeographicCreditorsRequestedDto
  implements AnalyticsGeographicCreditorsRequestedPayload
{
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsObject()
  query: IGeographicQuery;
}
