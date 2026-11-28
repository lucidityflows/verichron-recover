import { AnalyticsPortfolioPerformanceRequestedPayload } from '@verichron/events';
import type { IPortfolioPerformanceQuery } from '@verichron/contracts';
import { IsUUID, ValidateNested, IsOptional, IsString, IsEnum, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { DebtCategory, DebtStatus, PortfolioSortField, SortOrder } from '@verichron/enums';

class PortfolioPerformanceQueryDto implements IPortfolioPerformanceQuery {
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

  @IsEnum(PortfolioSortField)
  @IsOptional()
  sortBy?: PortfolioSortField;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  pageSize?: number;
}

export class AnalyticsPortfolioPerformanceRequestedDto implements AnalyticsPortfolioPerformanceRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @ValidateNested()
  @Type(() => PortfolioPerformanceQueryDto)
  query: PortfolioPerformanceQueryDto;
}
