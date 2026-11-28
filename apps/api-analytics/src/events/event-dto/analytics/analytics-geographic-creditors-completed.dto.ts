import { AnalyticsGeographicCreditorsCompletedPayload } from '@verichron/events';
import type { IGeographicCreditorAnalytics } from '@verichron/contracts';
import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsGeographicCreditorsCompletedDto implements AnalyticsGeographicCreditorsCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  data?: IGeographicCreditorAnalytics;

  @IsString()
  @IsOptional()
  error?: string;
}
