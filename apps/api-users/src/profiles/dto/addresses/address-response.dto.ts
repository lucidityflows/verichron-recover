import { ApiProperty } from '@nestjs/swagger';
import { AddressCategory } from '@verichron/enums';
import { IUserAddressResponse } from '@verichron/contracts';

export class AddressResponseDto implements IUserAddressResponse {
  @ApiProperty({ description: 'The unique identifier for the address record.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Indicates if this is the user\'s primary address.' })
  isPrimary: boolean;

  @ApiProperty({ description: 'The first line of the street address.', example: '123 Main St' })
  street1: string;

  @ApiProperty({ description: 'The second line of the street address (e.g., Apt 4B).', nullable: true })
  street2?: string;

  @ApiProperty({ description: 'The city.', example: 'Anytown' })
  city: string;

  @ApiProperty({ description: 'The state or province.', example: 'CA' })
  state: string;

  @ApiProperty({ description: 'The postal or ZIP code.', example: '90210' })
  postalCode: string;

  @ApiProperty({ description: 'The country.', example: 'USA' })
  country: string;

  @ApiProperty({ enum: AddressCategory, enumName: 'AddressCategory', description: 'The category of the address.' })
  addressCategory: AddressCategory;

  @ApiProperty({ description: 'The timestamp when the address record was created.' })
  createdAt: Date;
}
