import { ApiProperty } from '@nestjs/swagger';
import { GeographicAnalyticsView, StateAbbreviation } from '@verichron/enums';
import { DebtorGeographicStateDataDto } from './debtor-geographic-state-data.dto';

/**
 * Mapping of debtor profile to state
 * Used by orchestrator to aggregate debtor-level debt metrics by state
 */
export class DebtorStateMapping {
  @ApiProperty({
    description: 'Debtor profile UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  debtorProfileId: string;

  @ApiProperty({
    description: 'Two-letter state code',
    enum: StateAbbreviation,
    enumName: 'StateAbbreviation',
    example: StateAbbreviation.TX,
  })
  stateCode: StateAbbreviation;
}

/**
 * Response DTO for geographic debtor analytics (internal endpoint)
 * Contains additional fields beyond IGeographicDebtorAnalytics for orchestrator use
 */
export class GeographicDebtorsResponseDto {
  @ApiProperty({
    description: 'Analytics type',
    enum: GeographicAnalyticsView,
    enumName: 'GeographicAnalyticsView',
    example: GeographicAnalyticsView.DEBTORS,
  })
  type: GeographicAnalyticsView.DEBTORS;

  @ApiProperty({
    description: 'Total number of debtors across all states',
    example: 1500,
  })
  totalDebtors: number;

  @ApiProperty({
    description: 'Total debt value across all states',
    example: 5000000,
  })
  totalDebtValue: number;

  @ApiProperty({
    description: 'State-level debtor statistics',
    type: DebtorGeographicStateDataDto,
    isArray: true,
  })
  states: DebtorGeographicStateDataDto[];

  @ApiProperty({
    description: 'Mapping of debtor profile IDs to their states (for orchestrator aggregation)',
    type: DebtorStateMapping,
    isArray: true,
  })
  debtorStateMapping: DebtorStateMapping[];
}
