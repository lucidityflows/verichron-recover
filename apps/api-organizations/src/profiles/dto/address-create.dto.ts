import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  Length,
  Min,
  Max,
} from 'class-validator';
import { AddressCategory } from '@verichron/enums';
import { IOrganizationAddressCreate } from '@verichron/contracts';
import { Matches } from 'class-validator';

/**
 * DTO for creating a new organization address
 */
export class CreateAddressDto implements IOrganizationAddressCreate {
  @ApiProperty({
    description: 'Street address line 1',
    example: '123 Main Street',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @Length(1, 255)
  street1!: string;

  @ApiProperty({
    description: 'Street address line 2',
    example: 'Suite 400',
    required: false,
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  street2?: string;

  @ApiProperty({
    description: 'Street address line 3',
    example: 'Building B',
    required: false,
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  street3?: string;

  @ApiProperty({
    description: 'City',
    example: 'New York',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  city!: string;

  @ApiProperty({
    description: 'State abbreviation',
    example: 'NY',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2)
  state!: string;

  @ApiProperty({
    description: 'Postal code / ZIP code',
    example: '10001',
    minLength: 1,
    maxLength: 10,
  })
  @IsString()
  @Length(1, 10)
  postalCode!: string;

  @ApiProperty({
    description: 'The country (2-letter ISO code).',
    example: 'US',
    default: 'US',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter uppercase ISO code' })
  country: string = 'US';

  @ApiProperty({
    description: 'Latitude for geocoding',
    example: 40.7128,
    required: false,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    description: 'Longitude for geocoding',
    example: -74.006,
    required: false,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    description: 'Is this the primary address for the organization',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({
    description: 'Address category/type',
    enum: AddressCategory,
    enumName: 'AddressCategory',
    example: AddressCategory.HEADQUARTERS,
  })
  @IsEnum(AddressCategory)
  addressCategory!: AddressCategory;
}
