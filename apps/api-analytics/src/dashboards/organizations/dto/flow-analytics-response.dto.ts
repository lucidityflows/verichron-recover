import { IsString, IsEnum, IsArray, ValidateNested, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import type { IFlowAnalyticsResponse, IFlowNode, IFlowLink, IFlowNodeMetadata } from '@verichron/contracts';
import { FlowDimension } from '@verichron/enums';

class FlowNodeDto implements IFlowNode {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsString()
  value: string;

  @IsOptional()
  metadata?: IFlowNodeMetadata;
}

class FlowLinkDto implements IFlowLink {
  @IsString()
  source: string;

  @IsString()
  target: string;

  @IsString()
  value: string;

  @IsNumber()
  percentage: number;
}

/**
 * Flow Analytics Response DTO
 * Implements IFlowAnalyticsResponse from @verichron/contracts
 * Used for Sankey diagram data
 */
export class FlowAnalyticsResponseDto implements IFlowAnalyticsResponse {
  @IsString()
  orgId: string;

  @IsEnum(FlowDimension)
  view: FlowDimension;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowNodeDto)
  nodes: FlowNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowLinkDto)
  links: FlowLinkDto[];

  @IsString()
  totalValue: string;

  @IsString()
  generatedAt: string;
}
