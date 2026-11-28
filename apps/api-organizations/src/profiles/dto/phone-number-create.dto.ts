import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  Length,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PhoneCategory } from '@verichron/enums';
import { IOrganizationPhoneNumberCreate } from '@verichron/contracts';

/**
 * DTO for creating a new organization phone number
 */
export class CreatePhoneNumberDto implements IOrganizationPhoneNumberCreate {
  @ApiProperty({
    description: 'Phone number',
    example: '+1-555-123-4567',
    minLength: 1,
    maxLength: 20,
  })
  @IsString()
  @Length(1, 20)
  phoneNumber!: string;

  @ApiProperty({
    description: 'Phone extension',
    example: '1234',
    required: false,
    minLength: 1,
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  extension?: string;

  @ApiProperty({
    description: 'Is this the primary phone number for the organization',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({
    description: 'Is this phone number verified',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiProperty({
    description: 'Phone number category/type',
    enum: PhoneCategory,
    enumName: 'PhoneCategory',
    example: PhoneCategory.BUSINESS,
  })
  @IsEnum(PhoneCategory)
  category!: PhoneCategory;

  @ApiProperty({
    description: 'Date from which this phone number is valid',
    example: '2025-01-01T00:00:00.000Z',
    required: false,
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validFrom?: Date;

  @ApiProperty({
    description: 'Date until which this phone number is valid',
    example: '2026-12-31T23:59:59.999Z',
    required: false,
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validTo?: Date;
}
