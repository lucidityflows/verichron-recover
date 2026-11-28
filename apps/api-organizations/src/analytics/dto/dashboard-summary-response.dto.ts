import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsNumber, IsArray, ValidateNested, IsString } from 'class-validator';
import { 
  ITimeFramedMetric, 
  IStatusCounts, 
  ITopPortfolio, 
  IDashboardSummaryResponse 
} from '@verichron/contracts';

/**
 * Time-framed metric (quarterly data)
 */
export class TimeFramedMetricDto implements ITimeFramedMetric {
  @ApiProperty({ description: 'Year', example: 2025 })
  @IsNumber()
  year!: number;

  @ApiProperty({ description: 'Quarter (Q1, Q2, Q3, Q4)', example: 'Q4' })
  @IsString()
  quarter!: string;

  @ApiProperty({ description: 'Metric value for this period', example: 500000.00 })
  @IsNumber()
  value!: number;
}

/**
 * Status counts breakdown
 */
export class StatusCountsDto implements IStatusCounts {
  @ApiProperty({ description: 'Number of active debts', example: 85 })
  @IsNumber()
  active!: number;

  @ApiProperty({ description: 'Number of paid debts', example: 42 })
  @IsNumber()
  paid!: number;

  @ApiProperty({ description: 'Number of settled debts', example: 28 })
  @IsNumber()
  settled!: number;

  @ApiProperty({ description: 'Number of defaulted debts', example: 12 })
  @IsNumber()
  defaulted!: number;

  @ApiProperty({ description: 'Number of debts with payment plans', example: 35 })
  @IsNumber()
  paymentPlan!: number;
}

/**
 * Top performing portfolio summary
 */
export class TopPortfolioDto implements ITopPortfolio {
  @ApiProperty({
    description: 'Portfolio ID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  })
  @IsString()
  id!: string;

  @ApiProperty({
    description: 'Portfolio name',
    example: 'Q4 2025 High Value Debts'
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Recovery rate as percentage',
    example: 65.5
  })
  @IsNumber()
  recoveryRate!: number;

  @ApiProperty({
    description: 'Total amount collected',
    example: 250000.00
  })
  @IsNumber()
  totalCollected!: number;
}

/**
 * Organization Dashboard Summary Response
 *
 * High-level KPIs and recent activity for dashboard display.
 * Aggregates data from api-debts, api-transactions, api-debtors, and api-communications.
 */
@Exclude()
export class DashboardSummaryResponseDto implements IDashboardSummaryResponse {
  @Expose()
  @ApiProperty({
    description: 'Total number of portfolios',
    example: 12
  })
  @IsNumber()
  totalPortfolios!: number;

  @Expose()
  @ApiProperty({
    description: 'Total number of debts',
    example: 450
  })
  @IsNumber()
  totalDebts!: number;

  @Expose()
  @ApiProperty({
    description: 'Total number of debtors',
    example: 380
  })
  @IsNumber()
  totalDebtors!: number;

  @Expose()
  @ApiProperty({
    description: 'Total amount invested in portfolios by quarter',
    type: TimeFramedMetricDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeFramedMetricDto)
  totalInvested!: TimeFramedMetricDto[];

  @Expose()
  @ApiProperty({
    description: 'Total amount collected by quarter',
    type: TimeFramedMetricDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeFramedMetricDto)
  totalCollected!: TimeFramedMetricDto[];

  @Expose()
  @ApiProperty({
    description: 'Total outstanding balance',
    example: 2750000.00
  })
  @IsNumber()
  totalOutstanding!: number;

  @Expose()
  @ApiProperty({
    description: 'Overall recovery rate as percentage',
    example: 45.0
  })
  @IsNumber()
  overallRecoveryRate!: number;

  @Expose()
  @ApiProperty({
    description: 'Breakdown of debts by status',
    type: StatusCountsDto
  })
  @ValidateNested()
  @Type(() => StatusCountsDto)
  statusCounts!: StatusCountsDto;

  @Expose()
  @ApiProperty({
    description: 'Collections received today',
    example: 15000.00
  })
  @IsNumber()
  todayCollections!: number;

  @Expose()
  @ApiProperty({
    description: 'Payment plans created today',
    example: 3
  })
  @IsNumber()
  todayPaymentPlans!: number;

  @Expose()
  @ApiProperty({
    description: 'Debtor contacts made today',
    example: 25
  })
  @IsNumber()
  todayContacts!: number;

  @Expose()
  @ApiProperty({
    description: 'Collections received yesterday',
    example: 12000.00
  })
  @IsNumber()
  yesterdayCollections!: number;

  @Expose()
  @ApiProperty({
    description: 'Payment plans created yesterday',
    example: 2
  })
  @IsNumber()
  yesterdayPaymentPlans!: number;

  @Expose()
  @ApiProperty({
    description: 'Debtor contacts made yesterday',
    example: 20
  })
  @IsNumber()
  yesterdayContacts!: number;

  @Expose()
  @ApiProperty({
    description: 'Top performing portfolios by recovery rate',
    type: TopPortfolioDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopPortfolioDto)
  topPortfolios!: TopPortfolioDto[];

  @Expose()
  @ApiProperty({
    description: 'Timestamp of when these metrics were generated',
    example: '2025-10-18T14:30:00.000Z',
  })
  generatedAt!: Date;
}
