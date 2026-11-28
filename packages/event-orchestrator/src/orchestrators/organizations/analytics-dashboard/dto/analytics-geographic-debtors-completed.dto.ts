import { IGeographicDebtorAnalytics } from '@verichron/contracts';
import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for ANALYTICS_GEOGRAPHIC_DEBTORS_COMPLETED event
 *
 * Published by the event orchestrator when geographic debtor analytics have been aggregated.
 * Validated by api-organizations when received.
 */
export class AnalyticsGeographicDebtorsCompletedDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsObject()
  @IsOptional()
  data?: IGeographicDebtorAnalytics;

  @IsString()
  @IsOptional()
  error?: string;
}
