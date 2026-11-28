import { IGeographicCreditorAnalytics } from '@verichron/contracts';
import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for ANALYTICS_GEOGRAPHIC_CREDITORS_COMPLETED event
 *
 * Published by the event orchestrator when geographic creditor analytics have been aggregated.
 * Validated by api-organizations when received.
 */
export class AnalyticsGeographicCreditorsCompletedDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsObject()
  @IsOptional()
  data?: IGeographicCreditorAnalytics;

  @IsString()
  @IsOptional()
  error?: string;
}
