import { IsNumber, IsArray, IsDate, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import type { DashboardSummaryPayload } from '@verichron/events';

class StatusCountsDto {
  @IsNumber()
  active: number;

  @IsNumber()
  paid: number;

  @IsNumber()
  settled: number;

  @IsNumber()
  defaulted: number;

  @IsNumber()
  paymentPlan: number;
}

class TimeSeriesDto {
  @IsString()
  period: string;

  @IsNumber()
  value: number;
}

class TopPortfolioDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  value: number;
}

/**
 * Dashboard Summary Response DTO
 * Implements DashboardSummaryPayload from @verichron/events
 */
export class DashboardSummaryResponseDto implements DashboardSummaryPayload {
  @IsNumber()
  totalPortfolios: number;

  @IsNumber()
  totalDebts: number;

  @IsNumber()
  totalDebtors: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSeriesDto)
  totalInvested: TimeSeriesDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSeriesDto)
  totalCollected: TimeSeriesDto[];

  @IsNumber()
  totalOutstanding: number;

  @IsNumber()
  overallRecoveryRate: number;

  @ValidateNested()
  @Type(() => StatusCountsDto)
  statusCounts: StatusCountsDto;

  @IsNumber()
  todayCollections: number;

  @IsNumber()
  todayPaymentPlans: number;

  @IsNumber()
  todayContacts: number;

  @IsNumber()
  yesterdayCollections: number;

  @IsNumber()
  yesterdayPaymentPlans: number;

  @IsNumber()
  yesterdayContacts: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopPortfolioDto)
  topPortfolios: TopPortfolioDto[];

  @IsDate()
  @Type(() => Date)
  generatedAt: Date;
}
