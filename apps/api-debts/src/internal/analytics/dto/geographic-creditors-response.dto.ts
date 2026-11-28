import { ApiProperty } from '@nestjs/swagger';
import { StateAbbreviation } from '@verichron/enums';

/**
 * Top creditor information for a state
 */
export class TopCreditorDto {
  @ApiProperty({
    description: 'Creditor identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Creditor name',
    example: 'First National Bank',
  })
  name: string;

  @ApiProperty({
    description: 'Total debt value from this creditor in this state',
    example: 150000.00,
  })
  debtValue: number;
}

/**
 * State-level creditor and debt metrics (internal endpoint response)
 */
export class StateCreditorMetricsDto {
  @ApiProperty({
    description: 'State abbreviation code',
    example: StateAbbreviation.TX,
    enum: StateAbbreviation,
    enumName: 'StateAbbreviation',
  })
  stateCode: StateAbbreviation;

  @ApiProperty({
    description: 'Number of unique creditors in this state',
    example: 12,
  })
  creditorCount: number;

  @ApiProperty({
    description: 'Total debt value originated from this state',
    example: 500000.00,
  })
  totalDebtValue: number;

  @ApiProperty({
    description: 'Average debt value per creditor in this state',
    example: 41666.67,
  })
  averageDebtValue: number;

  @ApiProperty({
    description: 'Top creditors in this state by debt value',
    type: TopCreditorDto,
    isArray: true,
  })
  topCreditors: TopCreditorDto[];
}

/**
 * Response DTO for geographic creditor analytics (internal endpoint)
 * Returns creditor metrics grouped by state
 */
export class GeographicCreditorsResponseDto {
  @ApiProperty({
    description: 'Total number of unique creditors across all states',
    example: 150,
  })
  totalCreditors: number;

  @ApiProperty({
    description: 'Total debt value across all states',
    example: 5000000.00,
  })
  totalDebtValue: number;

  @ApiProperty({
    description: 'State-level creditor metrics',
    type: StateCreditorMetricsDto,
    isArray: true,
  })
  states: StateCreditorMetricsDto[];
}
