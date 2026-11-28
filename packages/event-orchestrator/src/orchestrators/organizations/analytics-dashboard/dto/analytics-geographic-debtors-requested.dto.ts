import { AnalyticsGeographicDebtorsRequestedPayload } from '@verichron/events';
import { IsString, IsUUID, IsObject } from 'class-validator';
import { IGeographicQuery } from '@verichron/contracts';

/**
 * DTO for ANALYTICS_GEOGRAPHIC_DEBTORS_REQUESTED event
 *
 * Published by api-organizations when geographic debtor analytics are requested.
 * Validated by event-orchestrator before processing.
 */
export class AnalyticsGeographicDebtorsRequestedDto
  implements AnalyticsGeographicDebtorsRequestedPayload
{
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsObject()
  query: IGeographicQuery;
}
