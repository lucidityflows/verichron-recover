import { IsString, IsNumber, IsArray, ValidateNested, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import type { IPortfolioPerformanceResponse, IPortfolioPerformance } from '@verichron/contracts';
import { DebtCategory } from '@verichron/enums';

class PortfolioPerformanceDto implements IPortfolioPerformance {
  @IsString()
  portfolioId: string;

  @IsString()
  portfolioName: string;

  @IsString()
  purchasePrice: string;

  @IsString()
  totalPrincipal: string;

  @IsString()
  totalCollected: string;

  @IsNumber()
  recoveryRate: number;

  @IsNumber()
  roi: number;

  @IsNumber()
  debtCount: number;

  @IsNumber()
  activeDebts: number;

  @IsNumber()
  paidDebts: number;

  @IsNumber()
  paymentPlanCount: number;

  @IsNumber()
  @IsOptional()
  avgDaysToFirstPayment: number | null;

  @IsEnum(DebtCategory)
  @IsOptional()
  primaryDebtCategory?: DebtCategory;

  @IsArray()
  @IsString({ each: true })
  portfolioTags: string[];
}

/**
 * Portfolio Performance Response DTO
 * Implements IPortfolioPerformanceResponse from @verichron/contracts
 */
export class PortfolioPerformanceResponseDto implements IPortfolioPerformanceResponse {
  @IsString()
  orgId: string;

  @IsNumber()
  totalPortfolios: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioPerformanceDto)
  portfolios: PortfolioPerformanceDto[];

  @IsNumber()
  overallRecoveryRate: number;

  @IsString()
  totalInvested: string;

  @IsString()
  totalPaymentsCollected: string;

  @IsNumber()
  page: number;

  @IsNumber()
  pageSize: number;

  @IsNumber()
  totalPages: number;

  @IsString()
  generatedAt: string;
}
