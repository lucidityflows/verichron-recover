import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';
import { ICreateDebtorPhone } from '@verichron/contracts';
import { PhoneCategory } from '@verichron/enums/dist';

/**
 * DTO for creating a new phone number for a debtor
 */
export class CreatePhoneDto implements ICreateDebtorPhone {
  @ApiProperty({
    description: 'Phone number (formatted)',
    example: '+1-555-123-4567',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[\d\s\-\+\(\)]+$/, {
    message: 'Phone number can only contain digits, spaces, dashes, plus signs, and parentheses',
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Phone category',
    example: PhoneCategory.MOBILE,
    enum: PhoneCategory, enumName: 'PhoneCategory',
    default: PhoneCategory.MOBILE,
  })
  @IsEnum(PhoneCategory)
  @IsOptional()
  category?: PhoneCategory;

  @ApiPropertyOptional({
    description: 'Whether this is the primary phone number',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this phone can receive SMS messages',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  canReceiveSms?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this phone can receive calls',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  canReceiveCalls?: boolean;
}
