import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  Length,
} from 'class-validator';
import { ICreateDebtorAddress } from '@verichron/contracts';
import { AddressCategory } from '@verichron/enums/dist';

/**
 * DTO for creating a new address for a debtor
 */
export class CreateAddressDto implements ICreateDebtorAddress {
  @ApiProperty({
    description: 'Address type category',
    example: AddressCategory.RESIDENCE_PRIMARY,
    enum: AddressCategory, enumName: 'AddressCategory',
    default: AddressCategory.RESIDENCE_PRIMARY,
  })
  @IsEnum(AddressCategory)
  @IsOptional()
  addressCategory?: AddressCategory;

  @ApiPropertyOptional({
    description: 'Whether this is the primary address',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiProperty({
    description: 'Street address line 1',
    example: '123 Main Street',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  street1: string;

  @ApiPropertyOptional({
    description: 'Street address line 2 (apartment, suite, etc.)',
    example: 'Apt 4B',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  street2?: string;

  @ApiPropertyOptional({
    description: 'Street address line 3',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  street3?: string;

  @ApiProperty({
    description: 'City',
    example: 'San Francisco',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({
    description: 'State or province code',
    example: 'CA',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  state: string;

  @ApiProperty({
    description: 'Postal/ZIP code',
    example: '94102',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  postalCode: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'US',
    maxLength: 100,
    default: 'US',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the current/active address',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}