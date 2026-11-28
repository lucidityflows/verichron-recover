import { ApiProperty } from '@nestjs/swagger';
import { GeographicAnalyticsView } from '@verichron/enums';
import { BaseGeographicStateDataDto } from './base-geographic-state-data.dto';
import {
  IDebtorGeographicStateData,
  IGeographicDebtorAnalytics
} from '@verichron/contracts';

export class DebtorGeographicStateDataDto extends BaseGeographicStateDataDto implements IDebtorGeographicStateData {
  @ApiProperty({
    description: 'The number of debtors in this state.',
    example: 1500,
  })
  debtorCount: number;

  @ApiProperty({
    description: 'The total debt value for all debtors in this state.',
    example: 7500000.00,
  })
  totalDebtValue: number;

  @ApiProperty({
    description: 'The average debt value per debtor in this state.',
    example: 5000.00,
  })
  averageDebtValue: number;

  @ApiProperty({
    description: 'The number of active debts in this state.',
    example: 1200,
  })
  activeDebts: number;

  @ApiProperty({
    description: 'The number of paid debts in this state.',
    example: 200,
  })
  paidDebts: number;

  @ApiProperty({
    description: 'The number of defaulted debts in this state.',
    example: 100,
  })
  defaultedDebts: number;

  @ApiProperty({
    description: 'The recovery rate for debts in this state.',
    example: 0.65,
  })
  recoveryRate: number;
}

export class GeographicDebtorAnalyticsDto implements IGeographicDebtorAnalytics {
  @ApiProperty({
    enum: GeographicAnalyticsView,
    enumName: 'GeographicAnalyticsView',
    description: 'The type of geographic analytics, always "debtors" for this DTO.',
    example: GeographicAnalyticsView.DEBTORS,
  })
  type: GeographicAnalyticsView.DEBTORS;

  @ApiProperty({
    description: 'The total number of debtors across all states.',
    example: 15000,
  })
  totalDebtors: number;

  @ApiProperty({
    description: 'The total debt value across all debtors and states.',
    example: 75000000.00,
  })
  totalDebtValue: number;

  @ApiProperty({
    type: () => [DebtorGeographicStateDataDto],
    description: 'A list of geographic data for debtors, broken down by state.',
    example: [
      {
        state: 'CA',
        stateCode: 'CA',
        coordinates: { latitude: 34.052235, longitude: -118.243683 },
        debtorCount: 1500,
        totalDebtValue: 7500000.00,
        averageDebtValue: 5000.00,
        activeDebts: 1200,
        paidDebts: 200,
        defaultedDebts: 100,
        recoveryRate: 0.65,
      },
    ],
  })
  states: DebtorGeographicStateDataDto[];
}
