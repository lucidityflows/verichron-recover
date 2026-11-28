import { ApiProperty } from '@nestjs/swagger';
import { GeographicAnalyticsView } from '@verichron/enums';
import { BaseGeographicStateDataDto } from './base-geographic-state-data.dto';
import {
  ITopCreditor,
  ICreditorGeographicStateData,
  IGeographicCreditorAnalytics
} from '@verichron/contracts';

export class TopCreditorDto implements ITopCreditor {
  @ApiProperty({
    description: 'The unique identifier of the top creditor.',
    example: 'creditor-uuid-1',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the top creditor.',
    example: 'Creditor A',
  })
  name: string;

  @ApiProperty({
    description: 'The total debt value associated with this top creditor.',
    example: 50000.00,
  })
  debtValue: number;
}

export class CreditorGeographicStateDataDto extends BaseGeographicStateDataDto implements ICreditorGeographicStateData {
  @ApiProperty({
    description: 'The number of creditors in this state.',
    example: 50,
  })
  creditorCount: number;

  @ApiProperty({
    description: 'The total debt value for all creditors in this state.',
    example: 1500000.75,
  })
  totalDebtValue: number;

  @ApiProperty({
    description: 'The average debt value per creditor in this state.',
    example: 30000.00,
  })
  averageDebtValue: number;

  @ApiProperty({
    type: () => [TopCreditorDto],
    description: 'A list of top creditors in this state.',
    example: [
      { id: 'creditor-uuid-1', name: 'Creditor A', debtValue: 50000.00 },
      { id: 'creditor-uuid-2', name: 'Creditor B', debtValue: 45000.00 },
    ],
  })
  topCreditors: TopCreditorDto[];
}

export class GeographicCreditorAnalyticsDto implements IGeographicCreditorAnalytics {
  @ApiProperty({
    enum: GeographicAnalyticsView,
    enumName: 'GeographicAnalyticsView',
    description: 'The type of geographic analytics, always "creditors" for this DTO.',
    example: GeographicAnalyticsView.CREDITORS,
  })
  type: GeographicAnalyticsView.CREDITORS;

  @ApiProperty({
    description: 'The total number of creditors across all states.',
    example: 500,
  })
  totalCreditors: number;

  @ApiProperty({
    description: 'The total debt value across all creditors and states.',
    example: 15000000.00,
  })
  totalDebtValue: number;

  @ApiProperty({
    type: () => [CreditorGeographicStateDataDto],
    description: 'A list of geographic data for creditors, broken down by state.',
    example: [
      {
        state: 'CA',
        stateCode: 'CA',
        coordinates: { latitude: 34.052235, longitude: -118.243683 },
        creditorCount: 50,
        totalDebtValue: 1500000.75,
        averageDebtValue: 30000.00,
        topCreditors: [
          { id: 'creditor-uuid-1', name: 'Creditor A', debtValue: 50000.00 },
        ],
      },
    ],
  })
  states: CreditorGeographicStateDataDto[];
}
