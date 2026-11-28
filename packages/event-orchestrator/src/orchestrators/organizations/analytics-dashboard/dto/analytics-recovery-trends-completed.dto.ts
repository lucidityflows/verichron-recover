import { IRecoveryTrendsResponse } from '@verichron/contracts';
import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for ANALYTICS_RECOVERY_TRENDS_COMPLETED event
 *
 * Published by the AnalyticsOrchestrator when recovery trends have been aggregated.
 * Validated by api-organizations when received.
 */
export class AnalyticsRecoveryTrendsCompletedDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsObject()
  @IsOptional()
  trends?: IRecoveryTrendsResponse;

  @IsString()
  @IsOptional()
  error?: string;
}
