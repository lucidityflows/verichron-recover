import { ApiProperty } from '@nestjs/swagger';
import { CoordinatesDto } from './coordinates.dto';
import { IBaseGeographicStateData, ICoordinates } from '@verichron/contracts';
import { StateAbbreviation } from '@verichron/enums';

export class BaseGeographicStateDataDto implements IBaseGeographicStateData {
  @ApiProperty({
    description: 'Two-letter state code',
    example: StateAbbreviation.CA,
    enum: StateAbbreviation,
    enumName: 'StateAbbreviation',
  })
  stateCode: StateAbbreviation;

  @ApiProperty({ description: 'Full state name (e.g., California, New York)', example: 'California' })
  stateName: string;

  @ApiProperty({ description: 'Geographic coordinates of the state centroid', type: () => CoordinatesDto })
  coordinates: CoordinatesDto;
}
