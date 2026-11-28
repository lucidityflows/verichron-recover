import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  Length,
} from 'class-validator';
import { IUpdateDebtorAddress } from '@verichron/contracts';
import { AddressCategory } from '@verichron/enums';

/**
 * DTO for updating an address
 */
export class UpdateAddressDto implements IUpdateDebtorAddress {
  @ApiPropertyOptional({
    description: 'Address type category',
    example: AddressCategory.RESIDENCE_PRIMARY,
    enum: AddressCategory, enumName: 'AddressCategory',
  })
  @IsEnum(AddressCategory)
  @IsOptional()
  addressCategory?: AddressCategory;

  @ApiPropertyOptional({
    description: 'Street address line 1',
    example: '123 Main Street',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  street1?: string;

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

  @ApiPropertyOptional({
    description: 'City',
    example: 'Springfield',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'State or province',
    example: 'IL',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  state?: string;

  @ApiPropertyOptional({
    description: 'ZIP or postal code',
    example: '62701',
    maxLength: 10,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  postalCode?: string;

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
  })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is the primary address for the debtor',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
