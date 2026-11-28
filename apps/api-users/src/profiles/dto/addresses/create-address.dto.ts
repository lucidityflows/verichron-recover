import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsNotEmpty, MaxLength, Length, Matches } from 'class-validator';
import { AddressCategory } from '@verichron/enums';
import { IUserAddressCreate } from '@verichron/contracts';

export class CreateAddressDto implements IUserAddressCreate {
  @ApiPropertyOptional({ 
    description: "Set this address as the user's primary address.", 
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({ 
    description: 'The first line of the street address.', 
    example: '123 Main St',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  street1: string;

  @ApiPropertyOptional({ 
    description: 'The second line of the street address (e.g., Apt 4B).',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street2?: string;

  @ApiProperty({ 
    description: 'The city.', 
    example: 'Anytown',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({ 
    description: 'The state or province (2-letter code).', 
    example: 'CA',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'State must be a 2-letter uppercase code' })
  state: string;

  @ApiProperty({ 
    description: 'The postal or ZIP code.', 
    example: '90210',
    minLength: 5,
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5}(-\d{4})?$/, { message: 'Invalid US ZIP code format' })
  postalCode: string;

  @ApiProperty({ 
    description: 'The country (2-letter ISO code).', 
    example: 'US',
    default: 'US',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter uppercase ISO code' })
  country: string = 'US';

  @ApiPropertyOptional({
    enum: AddressCategory,
    enumName: 'AddressCategory',
    description: 'The category of the address.',
    example: AddressCategory.RESIDENCE_PRIMARY,
    default: AddressCategory.RESIDENCE_PRIMARY,
  })
  @IsOptional()
  @IsEnum(AddressCategory)
  category?: AddressCategory = AddressCategory.RESIDENCE_PRIMARY;
}