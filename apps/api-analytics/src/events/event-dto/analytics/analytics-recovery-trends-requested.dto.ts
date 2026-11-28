import { AnalyticsRecoveryTrendsRequestedPayload } from '@verichron/events';
import type { IRecoveryTrendsQuery } from '@verichron/contracts';
import { IsUUID, ValidateNested, IsOptional, IsString, IsEnum, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { DebtCategory, DebtStatus, TrendGranularity, AnalyticsGroupBy } from '@verichron/enums';

class RecoveryTrendsQueryDto implements IRecoveryTrendsQuery {
  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  portfolioId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  portfolioTag?: string[];

  @IsEnum(DebtCategory)
  @IsOptional()
  debtCategory?: DebtCategory;

  @IsArray()
  @IsEnum(DebtStatus, { each: true })
  @IsOptional()
  debtStatus?: DebtStatus[];

  @IsEnum(TrendGranularity)
  @IsOptional()
  granularity?: TrendGranularity;

  @IsEnum(AnalyticsGroupBy)
  @IsOptional()
  groupBy?: AnalyticsGroupBy;
}

export class AnalyticsRecoveryTrendsRequestedDto implements AnalyticsRecoveryTrendsRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @ValidateNested()
  @Type(() => RecoveryTrendsQueryDto)
  query: RecoveryTrendsQueryDto;
}
