import { AnalyticsGeographicDebtorsCompletedPayload } from '@verichron/events';
import type { IGeographicDebtorAnalytics } from '@verichron/contracts';
import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsGeographicDebtorsCompletedDto implements AnalyticsGeographicDebtorsCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  data?: IGeographicDebtorAnalytics;

  @IsString()
  @IsOptional()
  error?: string;
}
