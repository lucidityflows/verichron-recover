import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { PortfolioType, DebtAgeBucket } from '@verichron/enums';
import { IGeographicQuery } from '@verichron/contracts';

export class GeographicQueryDto implements IGeographicQuery {
  @ApiProperty({ required: false, isArray: true, type: String, example: ['CA', 'NY'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  portfolioId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  portfolioName?: string;

  @ApiProperty({ required: false, enum: PortfolioType, enumName: 'PortfolioType' })
  @IsOptional()
  @IsEnum(PortfolioType)
  portfolioType?: PortfolioType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  debtAgeMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  debtAgeMax?: number;

  @ApiProperty({ required: false, enum: DebtAgeBucket, enumName: 'DebtAgeBucket' })
  @IsOptional()
  @IsEnum(DebtAgeBucket)
  debtAgeBucket?: DebtAgeBucket;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hasPaymentPlan?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isResponsive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  likelihoodToPayMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  defaultRiskMax?: number;
}
