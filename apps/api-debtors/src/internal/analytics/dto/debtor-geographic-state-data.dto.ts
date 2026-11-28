import { ApiProperty } from '@nestjs/swagger';
import { IDebtorGeographicStateData, ICoordinates } from '@verichron/contracts';
import { StateAbbreviation } from '@verichron/enums';

export class CoordinatesDto implements ICoordinates {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 31.9686,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -99.9018,
  })
  longitude: number;
}

/**
 * DTO for state-level debtor and debt metrics
 * Used by internal geographic debtor analytics endpoint
 */
export class DebtorGeographicStateDataDto implements IDebtorGeographicStateData {
  @ApiProperty({
    description: 'Two-letter state code',
    example: StateAbbreviation.TX,
    enum: StateAbbreviation,
    enumName: 'StateAbbreviation',
  })
  stateCode: StateAbbreviation;

  @ApiProperty({
    description: 'Full state name',
    example: 'Texas',
  })
  stateName: string;

  @ApiProperty({
    description: 'Geographic coordinates of the state centroid',
    type: () => CoordinatesDto,
  })
  coordinates: CoordinatesDto;

  @ApiProperty({
    description: 'Number of debtors in this state',
    example: 250,
  })
  debtorCount: number;

  @ApiProperty({
    description: 'Total debt value for this state',
    example: 1250000.75,
  })
  totalDebtValue: number;

  @ApiProperty({
    description: 'Average debt value per debt in this state',
    example: 5000.00,
  })
  averageDebtValue: number;

  @ApiProperty({
    description: 'Number of active debts in this state',
    example: 180,
  })
  activeDebts: number;

  @ApiProperty({
    description: 'Number of paid debts in this state',
    example: 50,
  })
  paidDebts: number;

  @ApiProperty({
    description: 'Number of defaulted/charged-off debts in this state',
    example: 20,
  })
  defaultedDebts: number;

  @ApiProperty({
    description: 'Recovery rate as a percentage (0-100)',
    example: 72.5,
  })
  recoveryRate: number;
}
