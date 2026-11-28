import { AnalyticsGeographicDebtorsRequestedPayload } from '@verichron/events';
import type { IGeographicQuery } from '@verichron/contracts';
import { IsUUID, ValidateNested, IsOptional, IsString, IsEnum, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PortfolioType, DebtAgeBucket } from '@verichron/enums';

class GeographicQueryDto implements IGeographicQuery {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  states?: string[];

  @IsString()
  @IsOptional()
  portfolioId?: string;

  @IsString()
  @IsOptional()
  portfolioName?: string;

  @IsEnum(PortfolioType)
  @IsOptional()
  portfolioType?: PortfolioType;

  @IsNumber()
  @IsOptional()
  debtAgeMin?: number;

  @IsNumber()
  @IsOptional()
  debtAgeMax?: number;

  @IsEnum(DebtAgeBucket)
  @IsOptional()
  debtAgeBucket?: DebtAgeBucket;

  @IsBoolean()
  @IsOptional()
  hasPaymentPlan?: boolean;

  @IsBoolean()
  @IsOptional()
  isResponsive?: boolean;

  @IsNumber()
  @IsOptional()
  likelihoodToPayMin?: number;

  @IsNumber()
  @IsOptional()
  defaultRiskMax?: number;
}

export class AnalyticsGeographicDebtorsRequestedDto implements AnalyticsGeographicDebtorsRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @ValidateNested()
  @Type(() => GeographicQueryDto)
  query: GeographicQueryDto;
}
