import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { IRecoveryTrendsResponse, IRecoveryTrendDataPoint } from '@verichron/contracts';

class RecoveryTrendDataPointDto implements IRecoveryTrendDataPoint {
  @IsString()
  period: string;

  @IsString()
  principalOwed: string;

  @IsString()
  amountCollected: string;

  @IsNumber()
  recoveryRate: number;

  @IsNumber()
  debtCount: number;
}

/**
 * Recovery Trends Response DTO
 * Implements IRecoveryTrendsResponse from @verichron/contracts
 */
export class RecoveryTrendsResponseDto implements IRecoveryTrendsResponse {
  @IsString()
  orgId: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsString()
  granularity: string;

  @IsString()
  @IsOptional()
  groupBy?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RecoveryTrendDataPointDto)
  trends?: RecoveryTrendDataPointDto[];

  @IsOptional()
  // Note: Record<string, T> validation is tricky in class-validator. 
  // We relax validation here or use a custom validator if strictly needed.
  @Type(() => Object) 
  trendsByGroup?: Record<string, IRecoveryTrendDataPoint[]>;

  @IsString()
  totalCollected: string;

  @IsNumber()
  avgRecoveryRate: number;

  @IsString()
  generatedAt: string;
}
