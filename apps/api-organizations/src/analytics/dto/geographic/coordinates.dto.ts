import { ApiProperty } from '@nestjs/swagger';
import { ICoordinates } from '@verichron/contracts';

export class CoordinatesDto implements ICoordinates {
  @ApiProperty({
    description: 'The latitude coordinate.',
    example: 34.052235,
  })
  latitude: number;

  @ApiProperty({
    description: 'The longitude coordinate.',
    example: -118.243683,
  })
  longitude: number;
}
