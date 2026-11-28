import type { IRecoveryTrendsResponse } from '@verichron/contracts';
import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsRecoveryTrendsCompletedDto {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  trends?: IRecoveryTrendsResponse;

  @IsString()
  @IsOptional()
  error?: string;
}
