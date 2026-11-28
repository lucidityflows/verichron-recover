import { AnalyticsFlowRequestedPayload } from '@verichron/events';
import type { IFlowAnalyticsQuery } from '@verichron/contracts';
import { IsUUID, ValidateNested, IsOptional, IsString, IsEnum, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { DebtCategory, DebtStatus, FlowDimension } from '@verichron/enums';

class FlowAnalyticsQueryDto implements IFlowAnalyticsQuery {
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

  @IsEnum(FlowDimension)
  view: FlowDimension;

  @IsNumber()
  @IsOptional()
  minValue?: number;
}

export class AnalyticsFlowRequestedDto implements AnalyticsFlowRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @ValidateNested()
  @Type(() => FlowAnalyticsQueryDto)
  query: FlowAnalyticsQueryDto;
}
