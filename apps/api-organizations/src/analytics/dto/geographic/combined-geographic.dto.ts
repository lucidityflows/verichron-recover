import { ApiProperty } from '@nestjs/swagger';
import { GeographicDebtorAnalyticsDto } from './debtor-geographic.dto';
import { GeographicCreditorAnalyticsDto } from './creditor-geographic.dto';
import {
  IGeographicFlow,
  ICombinedGeographicAnalytics,
  IGeographicDebtorAnalytics,
  IGeographicCreditorAnalytics
} from '@verichron/contracts';
import { StateAbbreviation } from '@verichron/enums';

export class GeographicFlowDto implements IGeographicFlow {
  @ApiProperty({
    description: 'The originating state of the geographic flow',
    example: StateAbbreviation.CA,
    enum: StateAbbreviation,
    enumName: 'StateAbbreviation',
  })
  originState: StateAbbreviation;

  @ApiProperty({
    description: 'The destination state of the geographic flow',
    example: StateAbbreviation.NY,
    enum: StateAbbreviation,
    enumName: 'StateAbbreviation',
  })
  destinationState: StateAbbreviation;

  @ApiProperty({
    description: 'The total value of debt associated with this geographic flow.',
    example: 15000.75,
  })
  debtValue: number;

  @ApiProperty({
    description: 'The number of debts associated with this geographic flow.',
    example: 120,
  })
  debtCount: number;
}

export class GeographicCombinedAnalyticsDto implements ICombinedGeographicAnalytics {
  @ApiProperty({ type: () => GeographicDebtorAnalyticsDto })
  debtors: GeographicDebtorAnalyticsDto;

  @ApiProperty({ type: () => GeographicCreditorAnalyticsDto })
  creditors: GeographicCreditorAnalyticsDto;

  @ApiProperty({ type: () => [GeographicFlowDto] })
  flows: GeographicFlowDto[];
}
