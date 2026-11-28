import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IFlowAnalyticsResponse, IFlowNode, IFlowLink, IFlowNodeMetadata } from '@verichron/contracts';
import { DebtCategory, PaymentMethod, StateAbbreviation, FlowDimension } from '@verichron/enums';

/**
 * Flow Node DTO - represents a node in the Sankey diagram
 */
export class FlowNodeDto implements IFlowNode {
  @ApiProperty({
    description: 'Unique node identifier',
    example: 'debt-category-0',
  })
  id!: string;

  @ApiProperty({
    description: 'Display label for the node',
    example: 'Medical Debt',
  })
  label!: string;

  @ApiProperty({
    description: 'Total value for this node (decimal as string)',
    example: '125000.50',
  })
  value!: string;

  /**
   * Additional metadata about the node (view-specific)
   * - debtCategory: When view = DEBT_CATEGORY
   * - portfolioId: When view = PORTFOLIO
   * - paymentMethod: When view = PAYMENT_METHOD
   * - state: When view = STATE
   */
  metadata?: IFlowNodeMetadata;
}

/**
 * Flow Link DTO - represents a link/edge in the Sankey diagram
 */
export class FlowLinkDto implements IFlowLink {
  @ApiProperty({
    description: 'Source node ID',
    example: 'source',
  })
  source!: string;

  @ApiProperty({
    description: 'Target node ID',
    example: 'debt-category-0',
  })
  target!: string;

  @ApiProperty({
    description: 'Flow value (decimal as string)',
    example: '125000.50',
  })
  value!: string;

  @ApiProperty({
    description: 'Percentage of total flow (0-100)',
    example: 45.5,
  })
  percentage!: number;
}

/**
 * Response DTO for flow analytics
 */
@Exclude()
export class FlowAnalyticsResponseDto implements IFlowAnalyticsResponse {
  @Expose()
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orgId!: string;

  @Expose()
  @ApiProperty({
    description: 'Flow dimension visualized',
    enum: FlowDimension,
    enumName: 'FlowDimension',
    example: FlowDimension.DEBT_CATEGORY,
  })
  view!: FlowDimension;

  @Expose()
  @ApiProperty({
    description: 'Nodes in the flow diagram',
    type: FlowNodeDto,
    isArray: true,
  })
  nodes!: FlowNodeDto[];

  @Expose()
  @ApiProperty({
    description: 'Links between nodes in the flow diagram',
    type: FlowLinkDto,
    isArray: true,
  })
  links!: FlowLinkDto[];

  @Expose()
  @ApiProperty({
    description: 'Total value across all flows (decimal as string)',
    example: '275000.00',
  })
  totalValue!: string;

  @Expose()
  @ApiProperty({
    description: 'Timestamp of when these metrics were generated (ISO 8601)',
    example: '2025-10-18T14:30:00.000Z',
  })
  generatedAt!: string;
}
